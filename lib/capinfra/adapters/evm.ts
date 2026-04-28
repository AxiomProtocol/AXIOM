/**
 * EVM settlement adapter — Phase 3 implementation.
 *
 * Dispatches authorized capinfra settlement instructions to an EVM
 * chain (Arbitrum One by default). Returns `submitted: true` with the
 * real transaction hash so settlement.ts transitions the instruction
 * to SUBMITTED. The SUBMITTED → SETTLED transition is intentionally
 * delegated to a webhook/poller path (externallySettleInstruction)
 * to protect against re-orgs and reverts; portfolio writes only fire
 * after on-chain confirmation. This mirrors the safety architecture
 * proven in scripts/vault-sprint2-evm.ts (invariants D/E/F).
 *
 * Modes (env: EVM_ADAPTER_MODE):
 *
 *   DRY_RUN (default)
 *     No broadcast. Returns a deterministic `0xdryrun-…` txHash and
 *     records a receipt with `dryRun: true`. Safe to run in any
 *     environment, including CI and dev. Lets the full settlement
 *     pipeline (PENDING → AUTHORIZED → SUBMITTED → SETTLED via
 *     webhook) be exercised without spending gas.
 *
 *   LIVE
 *     Builds, signs, and broadcasts a real transaction via Alchemy.
 *     Requires ALCHEMY_API_KEY and DEPLOYER_PRIVATE_KEY. Returns the
 *     real txHash. The deployer wallet must hold the appropriate role
 *     on the target contract (e.g. MINTER_ROLE for MINT actions);
 *     reverts at the chain level surface as broadcast failures.
 *
 *   DISABLED
 *     Throws AdapterDisabledError on every dispatch. Use as a manual
 *     kill-switch.
 *
 * Action types supported (from instruction.actionType — capActionTypeEnum):
 *
 *   MINT     → IAXAU.mint(to, amountWei)        (ERC-20 mint shape)
 *   REDEEM   → IAXAU.burn(from, amountWei)      (REDEEM = burn supply)
 *   TRANSFER → IERC20.transfer(to, amountWei)
 *
 * Per-asset gating: an asset must opt into LIVE broadcasts by symbol
 * in EVM_ADAPTER_LIVE_ALLOWLIST (comma-separated). Assets not on the
 * list fall back to DRY_RUN even when EVM_ADAPTER_MODE=LIVE. This
 * gives operators a per-asset safety toggle without requiring a
 * second mode-switch deploy.
 *
 * Required `instruction.payloadJson` fields (LIVE mode):
 *
 *   recipient | recipientAddress | to    : 0x… address (MINT/TRANSFER)
 *   from                                  : 0x… address (BURN, optional —
 *                                           defaults to deployer)
 *
 * In DRY_RUN, recipient is encouraged but not required so the
 * dispatcher can be exercised against synthetic test instructions.
 */

import type {
  AdapterDispatchInput,
  AdapterDispatchResult,
  AdapterMode,
  SettlementAdapter,
} from './types';
import { AdapterDisabledError } from './types';
import { generateId } from '../ids';

// ── Mode + allowlist resolution ────────────────────────────────────

const VALID_MODES: AdapterMode[] = ['DRY_RUN', 'LIVE', 'DISABLED'];

function resolveMode(): AdapterMode {
  const raw = (process.env.EVM_ADAPTER_MODE || 'DRY_RUN').toUpperCase();
  if ((VALID_MODES as string[]).includes(raw)) return raw as AdapterMode;
  return 'DRY_RUN';
}

function resolveAllowlist(): Set<string> {
  const raw = process.env.EVM_ADAPTER_LIVE_ALLOWLIST || '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
  );
}

function effectiveModeForAsset(symbol: string, baseMode: AdapterMode): AdapterMode {
  if (baseMode !== 'LIVE') return baseMode;
  const allow = resolveAllowlist();
  if (!allow.has(symbol.toUpperCase())) {
    // Asset not allowlisted for LIVE — degrade to DRY_RUN safely.
    return 'DRY_RUN';
  }
  return 'LIVE';
}

// ── Recipient parsing (lenient: accepts several payload shapes) ────

interface ResolvedRoute {
  to: string | null;
  from: string | null;
}

function parseAddress(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(v)) return null;
  return v;
}

function resolveRoute(input: AdapterDispatchInput): ResolvedRoute {
  const payload = (input.instruction.payloadJson as Record<string, unknown> | null) ?? {};
  const to =
    parseAddress(payload.to) ??
    parseAddress(payload.recipient) ??
    parseAddress(payload.recipientAddress) ??
    null;
  const from = parseAddress(payload.from) ?? null;
  return { to, from };
}

// ── Amount conversion (decimal string → wei BigInt) ────────────────

function toWei(amount: string, decimals: number): bigint {
  // amount is a fixed-point non-negative decimal string (e.g. "0.5000000000").
  // Avoid floating-point: split on '.' and pad the fractional part to
  // exactly `decimals` digits. Strict validation: rejects negatives,
  // multiple decimal points, non-digit chars, and excess fractional
  // precision (so we never silently truncate value).
  const trimmed = amount.trim();
  if (trimmed.length === 0) {
    throw new Error('evm-adapter: amount string is empty');
  }
  if (trimmed.startsWith('-')) {
    throw new Error(`evm-adapter: negative amounts are not supported ("${amount}")`);
  }
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error(`evm-adapter: invalid decimals=${decimals}`);
  }
  // Single decimal point or none. Reject "1.2.3" etc.
  const parts = trimmed.split('.');
  if (parts.length > 2) {
    throw new Error(`evm-adapter: invalid amount string "${amount}" (multiple decimal points)`);
  }
  const [whole, fracRaw = ''] = parts;
  if (!/^\d+$/.test(whole)) {
    throw new Error(`evm-adapter: invalid amount string "${amount}" (non-digit in whole part)`);
  }
  if (fracRaw.length > 0 && !/^\d+$/.test(fracRaw)) {
    throw new Error(`evm-adapter: invalid amount string "${amount}" (non-digit in fractional part)`);
  }
  // Reject excess fractional precision unless the excess is all trailing
  // zeros (i.e. "0.5000000000000000000" with decimals=18 is OK, but
  // "0.50000000000000000001" with decimals=18 is rejected — that would
  // silently truncate value).
  if (fracRaw.length > decimals) {
    const excess = fracRaw.slice(decimals);
    if (!/^0*$/.test(excess)) {
      throw new Error(
        `evm-adapter: amount "${amount}" has more precision than asset decimals=${decimals} (would silently truncate)`,
      );
    }
  }
  const frac =
    fracRaw.length >= decimals
      ? fracRaw.slice(0, decimals)
      : fracRaw + '0'.repeat(decimals - fracRaw.length);
  const combined = `${whole}${frac}`.replace(/^0+(?=\d)/, '');
  return BigInt(combined.length > 0 ? combined : '0');
}

// ── DRY_RUN dispatch (no broadcast) ────────────────────────────────

function dryRunDispatch(
  input: AdapterDispatchInput,
  reason: 'mode' | 'asset_not_allowlisted',
): AdapterDispatchResult {
  const { instruction, asset } = input;
  const route = resolveRoute(input);
  const decimals = asset.decimals ?? 18;

  // Deterministic-enough txHash with a unique suffix so replays don't
  // collide on the cap_settlement_instructions.externalRef index.
  const suffix = generateId('inst').slice(-12);
  const externalRef = `0xdryrun-${instruction.id.slice(-16)}-${suffix}`;

  let amountWei: string | null = null;
  try {
    amountWei = toWei(instruction.amount, decimals).toString();
  } catch {
    amountWei = null;
  }

  return {
    externalRef,
    settledAt: new Date(),
    submitted: true,
    receiptJson: {
      kind: 'EVM',
      mode: 'DRY_RUN',
      reason,
      chain: asset.chain ?? 'arbitrum-one',
      chainId: asset.chainId ?? 42161,
      contract: asset.contractAddress ?? null,
      action: instruction.actionType,
      assetSymbol: asset.symbol,
      decimals,
      amountHuman: instruction.amount,
      amountWei,
      to: route.to,
      from: route.from,
      note: 'DRY_RUN: no transaction was broadcast. Settlement will only progress to SETTLED via the webhook/poll path.',
    },
  };
}

// ── LIVE dispatch (broadcast via Alchemy) ──────────────────────────

const ERC20_MINIMAL_ABI = [
  // Standard ERC-20
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  // IAXAU / mintable ERC-20
  'function mint(address to, uint256 amount)',
  'function burn(address from, uint256 amount)',
];

function arbitrumRpcUrl(): string {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) {
    throw new Error('evm-adapter: ALCHEMY_API_KEY is required for LIVE mode');
  }
  return `https://arb-mainnet.g.alchemy.com/v2/${key}`;
}

// Chains this adapter knows how to broadcast on. Adding a new chain
// requires a corresponding RPC URL builder. We refuse to broadcast on
// unknown chains rather than defaulting to Arbitrum and risking a
// wrong-chain transaction.
const SUPPORTED_LIVE_CHAIN_IDS = new Set<number>([42161]); // Arbitrum One

async function liveDispatch(input: AdapterDispatchInput): Promise<AdapterDispatchResult> {
  const { instruction, asset } = input;

  if (!asset.contractAddress) {
    throw new Error(`evm-adapter: asset ${asset.symbol} has no contractAddress`);
  }
  const chainId = asset.chainId ?? null;
  if (chainId === null) {
    throw new Error(
      `evm-adapter: asset ${asset.symbol} has no chainId — refusing to broadcast on unknown chain`,
    );
  }
  if (!SUPPORTED_LIVE_CHAIN_IDS.has(chainId)) {
    throw new Error(
      `evm-adapter: asset ${asset.symbol} chainId=${chainId} is not in the live-broadcast allowlist (supported: ${Array.from(SUPPORTED_LIVE_CHAIN_IDS).join(',')})`,
    );
  }
  const route = resolveRoute(input);
  if ((instruction.actionType === 'MINT' || instruction.actionType === 'TRANSFER') && !route.to) {
    throw new Error(
      `evm-adapter: action ${instruction.actionType} requires payloadJson.recipient (0x… address)`,
    );
  }

  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    throw new Error('evm-adapter: DEPLOYER_PRIVATE_KEY is required for LIVE mode');
  }

  // Lazy ethers import so DRY_RUN environments don't pay the load cost
  // and so the adapter file remains importable in environments without
  // ethers installed at the right version.
  const { ethers } = await import('ethers');

  const provider = new ethers.JsonRpcProvider(arbitrumRpcUrl());
  const wallet = new ethers.Wallet(pk, provider);
  const contract = new ethers.Contract(asset.contractAddress, ERC20_MINIMAL_ABI, wallet);

  const decimals = asset.decimals ?? 18;
  const amountWei = toWei(instruction.amount, decimals);

  let tx;
  switch (instruction.actionType) {
    case 'MINT':
      tx = await contract.mint(route.to, amountWei);
      break;
    case 'REDEEM':
      tx = await contract.burn(route.from ?? wallet.address, amountWei);
      break;
    case 'TRANSFER':
      tx = await contract.transfer(route.to, amountWei);
      break;
    default:
      throw new Error(
        `evm-adapter: unsupported actionType "${instruction.actionType}" — supported: MINT, REDEEM, TRANSFER`,
      );
  }

  // Return as submitted=true. Confirmation (and SETTLED) happens via
  // the webhook/poll path that calls externallySettleInstruction.
  return {
    externalRef: tx.hash,
    settledAt: new Date(),
    submitted: true,
    receiptJson: {
      kind: 'EVM',
      mode: 'LIVE',
      chain: asset.chain ?? 'arbitrum-one',
      chainId: asset.chainId ?? 42161,
      contract: asset.contractAddress,
      action: instruction.actionType,
      assetSymbol: asset.symbol,
      decimals,
      amountHuman: instruction.amount,
      amountWei: amountWei.toString(),
      to: route.to,
      from: route.from,
      txHash: tx.hash,
      nonce: tx.nonce ?? null,
      from_address: wallet.address,
      note: 'LIVE: transaction broadcast. SETTLED requires on-chain confirmation via externallySettleInstruction.',
    },
  };
}

// ── Adapter export ─────────────────────────────────────────────────

export const evmAdapter: SettlementAdapter = {
  kind: 'EVM',
  name: 'capinfra-evm',
  async dispatch(input: AdapterDispatchInput): Promise<AdapterDispatchResult> {
    const baseMode = resolveMode();
    if (baseMode === 'DISABLED') {
      throw new AdapterDisabledError('EVM');
    }
    const mode = effectiveModeForAsset(input.asset.symbol, baseMode);
    if (mode === 'DRY_RUN') {
      return dryRunDispatch(
        input,
        baseMode === 'LIVE' ? 'asset_not_allowlisted' : 'mode',
      );
    }
    // mode === 'LIVE'
    return liveDispatch(input);
  },
};
