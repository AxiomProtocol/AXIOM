/**
 * Capital Infrastructure — Polygon PoS dispatcher.
 *
 * Contains all dispatch logic for the POLYGON settlement adapter:
 *   - toWei()          : decimal string → raw BigInt (strict, no truncation)
 *   - resolveRoute()   : parse recipient/from from instruction.payloadJson
 *   - dryRunExternalRef(): deterministic synthetic ref via SHA-256(instructionId)
 *   - dryRunDispatch() : synthetic receipt, no broadcast, no RPC call
 *   - liveDispatch()   : real EVM broadcast via POLYGON_RPC_URL / POLYGON_AMOY_RPC_URL
 *   - dispatchPolygon(): mode-gate entry point called by index.ts
 *
 * Phase 5: LIVE dispatch is implemented.
 *
 * Settlement token (Phase 5):
 *   Native USDC on Polygon PoS — 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
 *   Do NOT use USDC.e (bridged) — bridge risk, liquidity fragmentation.
 *
 * Action types supported:
 *   TRANSFER → IERC20.transfer(to, amountRaw)
 *
 *   MINT and REDEEM are NOT supported on Polygon Phase 5.
 *   AXUSD issuance is Arbitrum-canonical. No minting/burning on Polygon.
 *   If a MINT or REDEEM instruction routes to POLYGON, the dispatcher throws
 *   rather than silently routing to the wrong chain.
 *
 * Modes (env: POLYGON_ADAPTER_MODE):
 *   DRY_RUN (default)
 *     No broadcast. Returns deterministic 0xpoldry-… externalRef.
 *     submitted=true → settlement.ts parks at SUBMITTED, no portfolio write.
 *     No RPC call, no env vars required beyond the mode flag.
 *
 *   LIVE
 *     Requires: CHAIN_POLYGON_ENABLED=true, MULTICHAIN_ENABLED=true,
 *               POLYGON_RPC_URL (or POLYGON_AMOY_RPC_URL for Amoy),
 *               POLYGON_DEPLOYER_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY).
 *     Builds, signs, and broadcasts a real USDC transfer on Polygon PoS.
 *     RPC chain ID is verified before broadcast (guards against wrong-RPC).
 *     Returns real txHash with submitted=true.
 *     SETTLED requires on-chain confirmation via externallySettleInstruction.
 *
 *   DISABLED
 *     Throws AdapterDisabledError on every dispatch. Manual kill-switch.
 *
 * Per-asset gating: an asset must be in POLYGON_ADAPTER_LIVE_ALLOWLIST for
 * LIVE broadcasts. Assets not on the list fall back to DRY_RUN even when
 * POLYGON_ADAPTER_MODE=LIVE.
 *
 * Side-effect contract: this module MUST NOT write to portfolio, reserve,
 * audit log, or notifications. settlement.ts owns all post-dispatch state.
 *
 * SUBMITTED ≠ on-chain final. No workflow may infer economic completion
 * from SUBMITTED alone. Portfolio write requires externallySettleInstruction.
 */

import { createHash } from 'crypto';
import {
  AdapterDisabledError,
  type AdapterDispatchInput,
  type AdapterDispatchResult,
} from '../types';
import {
  resolveMode,
  effectiveModeForAsset,
  assertChainEnabled,
  SUPPORTED_LIVE_CHAIN_IDS,
  polygonRpcUrl,
  deployerPrivateKey,
  POLYGON_ADAPTER_KIND,
} from './config';

// ── Recipient parsing ──────────────────────────────────────────────

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

// ── Amount conversion: decimal string → raw BigInt ─────────────────

export function toWei(amount: string, decimals: number): bigint {
  const trimmed = amount.trim();
  if (!trimmed) throw new Error('polygon-adapter: amount string is empty');
  if (trimmed.startsWith('-')) {
    throw new Error(`polygon-adapter: negative amounts not supported ("${amount}")`);
  }
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error(`polygon-adapter: invalid decimals=${decimals}`);
  }
  const parts = trimmed.split('.');
  if (parts.length > 2) {
    throw new Error(`polygon-adapter: invalid amount "${amount}" (multiple decimal points)`);
  }
  const [whole, fracRaw = ''] = parts;
  if (!/^\d+$/.test(whole)) {
    throw new Error(`polygon-adapter: invalid amount "${amount}" (non-digit in whole)`);
  }
  if (fracRaw && !/^\d+$/.test(fracRaw)) {
    throw new Error(`polygon-adapter: invalid amount "${amount}" (non-digit in fractional)`);
  }
  if (fracRaw.length > decimals) {
    const excess = fracRaw.slice(decimals);
    if (!/^0*$/.test(excess)) {
      throw new Error(
        `polygon-adapter: amount "${amount}" exceeds asset decimals=${decimals} (would silently truncate)`,
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

// ── DRY_RUN dispatch (no broadcast, no RPC) ────────────────────────

/**
 * Deterministic synthetic externalRef for DRY_RUN.
 *
 * Derived exclusively from the instruction ID using SHA-256 so that:
 *   1. The same instruction always produces the same externalRef (stable /
 *      idempotent across repeated DRY_RUN dispatches for the same instruction).
 *   2. Different instructions always produce different externalRefs (collision-
 *      resistant via SHA-256 prefix).
 *
 * Format: 0xpoldry-{id.slice(-16)}-{sha256(id).slice(0,12)}
 * Example: 0xpoldry-si_abc123def456ghi7-3f8a9c10b2e4
 *
 * No random component — the ref is fully reproducible from the instruction alone.
 */
export function dryRunExternalRef(instructionId: string): string {
  const tail   = instructionId.slice(-16);
  const digest = createHash('sha256').update(instructionId).digest('hex').slice(0, 12);
  return `0xpoldry-${tail}-${digest}`;
}

function dryRunDispatch(
  input: AdapterDispatchInput,
  reason: 'mode' | 'asset_not_allowlisted',
): AdapterDispatchResult {
  const { instruction, asset } = input;
  const route    = resolveRoute(input);
  const decimals = asset.decimals ?? 6; // native USDC on Polygon uses 6 decimals
  const externalRef = dryRunExternalRef(instruction.id);

  let amountRaw: string | null = null;
  try {
    amountRaw = toWei(instruction.amount, decimals).toString();
  } catch {
    amountRaw = null;
  }

  return {
    externalRef,
    settledAt: new Date(),
    submitted: true,
    receiptJson: {
      kind: POLYGON_ADAPTER_KIND,
      mode: 'DRY_RUN',
      reason,
      chain:           asset.chain ?? 'polygon-pos',
      chainId:         asset.chainId ?? 137,
      contract:        asset.contractAddress ?? null,
      action:          instruction.actionType,
      assetSymbol:     asset.symbol,
      decimals,
      amountHuman:     instruction.amount,
      amountRaw,
      to:              route.to,
      from:            route.from,
      settlementToken: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      note: 'DRY_RUN: no transaction broadcast. SETTLED requires on-chain confirmation via externallySettleInstruction.',
    },
  };
}

// ── LIVE dispatch (real broadcast via Polygon RPC) ─────────────────

/**
 * ERC-20 minimal ABI.
 * Polygon Phase 5 uses only `transfer()`. `mint` and `burn` are included
 * for completeness but are blocked by the action-type guard below.
 */
const ERC20_MINIMAL_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

async function liveDispatch(input: AdapterDispatchInput): Promise<AdapterDispatchResult> {
  const { instruction, asset } = input;

  // Gate 1: both multichain flags must be set.
  assertChainEnabled();

  // Gate 2: asset must have a contract address.
  if (!asset.contractAddress) {
    throw new Error(`polygon-adapter: asset ${asset.symbol} has no contractAddress`);
  }

  // Gate 3: asset must have a known chain ID.
  const chainId = asset.chainId ?? null;
  if (chainId === null) {
    throw new Error(`polygon-adapter: asset ${asset.symbol} has no chainId`);
  }

  // Gate 4: chain ID must be in the LIVE-permitted set (137 or 80002).
  if (!SUPPORTED_LIVE_CHAIN_IDS.has(chainId)) {
    throw new Error(
      `polygon-adapter: chainId=${chainId} not in live-broadcast set ` +
      `(supported: ${Array.from(SUPPORTED_LIVE_CHAIN_IDS).join(',')})`,
    );
  }

  // Gate 5: Phase 5 only supports TRANSFER (USDC payments).
  // MINT/REDEEM are Arbitrum-canonical and must never route to Polygon.
  if (instruction.actionType !== 'TRANSFER') {
    throw new Error(
      `polygon-adapter: actionType="${instruction.actionType}" is not supported on Polygon Phase 5. ` +
      `Only TRANSFER is valid. MINT/REDEEM are Arbitrum-canonical (EVM adapter).`,
    );
  }

  // Gate 6: TRANSFER requires a recipient address.
  const route = resolveRoute(input);
  if (!route.to) {
    throw new Error(
      `polygon-adapter: TRANSFER requires payloadJson.recipient (0x… address)`,
    );
  }

  // Lazy ethers import so DRY_RUN environments don't pay the load cost.
  // chainId is passed to prefer POLYGON_AMOY_RPC_URL for Amoy (80002).
  const { ethers } = await import('ethers');
  const provider   = new ethers.JsonRpcProvider(polygonRpcUrl(chainId));

  // Chain ID verification: ensure the RPC endpoint's actual network matches
  // the expected asset chainId before broadcasting. Catches misconfigured
  // POLYGON_RPC_URL (e.g. pointing at Arbitrum or Avalanche).
  const rpcNetwork  = await provider.getNetwork();
  const rpcChainId  = Number(rpcNetwork.chainId);
  if (rpcChainId !== chainId) {
    throw new Error(
      `polygon-adapter: RPC endpoint returned chainId=${rpcChainId} but ` +
      `asset.chainId=${chainId} — possible wrong-RPC misconfiguration; refusing to broadcast`,
    );
  }

  const wallet   = new ethers.Wallet(deployerPrivateKey(), provider);
  const contract = new ethers.Contract(asset.contractAddress, ERC20_MINIMAL_ABI, wallet);

  const decimals  = asset.decimals ?? 6;
  const amountRaw = toWei(instruction.amount, decimals);

  // Only TRANSFER is routed here (gate 5 above guards against MINT/REDEEM).
  const tx = await contract.transfer(route.to, amountRaw);

  // Return submitted=true. SETTLED requires on-chain confirmation via
  // externallySettleInstruction (webhook or reconciliation poll).
  return {
    externalRef: tx.hash,
    settledAt:   new Date(),
    submitted:   true,
    receiptJson: {
      kind:        POLYGON_ADAPTER_KIND,
      mode:        'LIVE',
      chain:       asset.chain ?? 'polygon-pos',
      chainId:     asset.chainId ?? 137,
      contract:    asset.contractAddress,
      action:      instruction.actionType,
      assetSymbol: asset.symbol,
      decimals,
      amountHuman: instruction.amount,
      amountRaw:   amountRaw.toString(),
      to:          route.to,
      from:        route.from,
      txHash:      tx.hash,
      nonce:       tx.nonce ?? null,
      from_address: wallet.address,
      settlementToken: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      note: 'LIVE: transaction broadcast. SETTLED requires on-chain confirmation via externallySettleInstruction.',
    },
  };
}

// ── Mode-gate entry point ──────────────────────────────────────────

export async function dispatchPolygon(
  input: AdapterDispatchInput,
): Promise<AdapterDispatchResult> {
  const baseMode = resolveMode();

  if (baseMode === 'DISABLED') {
    throw new AdapterDisabledError(POLYGON_ADAPTER_KIND);
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
}
