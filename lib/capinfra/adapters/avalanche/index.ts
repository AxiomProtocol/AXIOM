/**
 * Capital Infrastructure — Avalanche C-Chain settlement adapter.
 *
 * Dispatches authorized capinfra settlement instructions to Avalanche
 * C-Chain (mainnet 43114 or Fuji testnet 43113). Mirrors the safety
 * architecture of the EVM adapter (evm.ts) with Avalanche-specific
 * RPC configuration.
 *
 * Modes (env: AVALANCHE_ADAPTER_MODE):
 *
 *   DRY_RUN (default)
 *     No broadcast. Returns a deterministic `0xavadry-…` txHash.
 *     Safe for CI, dev, and staging environments.
 *
 *   LIVE
 *     Builds, signs, and broadcasts a real transaction via
 *     AVALANCHE_RPC_URL. Requires AVALANCHE_RPC_URL and
 *     DEPLOYER_PRIVATE_KEY. Assets must also be present in
 *     AVALANCHE_ADAPTER_LIVE_ALLOWLIST.
 *
 *   DISABLED
 *     Throws AdapterDisabledError on every dispatch.
 *
 * Action types supported:
 *   MINT     → contract.mint(to, amountWei)
 *   REDEEM   → contract.burn(from, amountWei)
 *   TRANSFER → contract.transfer(to, amountWei)
 *
 * Supported chain IDs for LIVE broadcast:
 *   43114 — Avalanche C-Chain mainnet
 *   43113 — Avalanche Fuji testnet
 */

import type {
  AdapterDispatchInput,
  AdapterDispatchResult,
  AdapterMode,
  SettlementAdapter,
} from '../types';
import { AdapterDisabledError } from '../types';
import { generateId } from '../../ids';

// ── Mode + allowlist resolution ────────────────────────────────────

const VALID_MODES: AdapterMode[] = ['DRY_RUN', 'LIVE', 'DISABLED'];

function resolveMode(): AdapterMode {
  const raw = (process.env.AVALANCHE_ADAPTER_MODE || 'DRY_RUN').toUpperCase();
  if ((VALID_MODES as string[]).includes(raw)) return raw as AdapterMode;
  return 'DRY_RUN';
}

function resolveAllowlist(): Set<string> {
  const raw = process.env.AVALANCHE_ADAPTER_LIVE_ALLOWLIST || '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
  );
}

function effectiveModeForAsset(symbol: string, baseMode: AdapterMode): AdapterMode {
  if (baseMode !== 'LIVE') return baseMode;
  if (!resolveAllowlist().has(symbol.toUpperCase())) return 'DRY_RUN';
  return 'LIVE';
}

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

// ── Amount conversion ──────────────────────────────────────────────

function toWei(amount: string, decimals: number): bigint {
  const trimmed = amount.trim();
  if (!trimmed) throw new Error('avalanche-adapter: amount string is empty');
  if (trimmed.startsWith('-')) throw new Error(`avalanche-adapter: negative amounts not supported ("${amount}")`);
  const parts = trimmed.split('.');
  if (parts.length > 2) throw new Error(`avalanche-adapter: invalid amount "${amount}" (multiple decimal points)`);
  const [whole, fracRaw = ''] = parts;
  if (!/^\d+$/.test(whole)) throw new Error(`avalanche-adapter: invalid amount "${amount}" (non-digit in whole)`);
  if (fracRaw && !/^\d+$/.test(fracRaw)) throw new Error(`avalanche-adapter: invalid amount "${amount}" (non-digit in fractional)`);
  if (fracRaw.length > decimals) {
    const excess = fracRaw.slice(decimals);
    if (!/^0*$/.test(excess)) {
      throw new Error(`avalanche-adapter: amount "${amount}" exceeds asset decimals=${decimals}`);
    }
  }
  const frac =
    fracRaw.length >= decimals
      ? fracRaw.slice(0, decimals)
      : fracRaw + '0'.repeat(decimals - fracRaw.length);
  const combined = `${whole}${frac}`.replace(/^0+(?=\d)/, '');
  return BigInt(combined.length > 0 ? combined : '0');
}

// ── DRY_RUN dispatch ───────────────────────────────────────────────

function dryRunDispatch(
  input: AdapterDispatchInput,
  reason: 'mode' | 'asset_not_allowlisted',
): AdapterDispatchResult {
  const { instruction, asset } = input;
  const route = resolveRoute(input);
  const decimals = asset.decimals ?? 18;
  const suffix = generateId('inst').slice(-12);
  const externalRef = `0xavadry-${instruction.id.slice(-16)}-${suffix}`;

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
      kind: 'AVALANCHE',
      mode: 'DRY_RUN',
      reason,
      chain: asset.chain ?? 'avalanche-c-chain',
      chainId: asset.chainId ?? 43114,
      contract: asset.contractAddress ?? null,
      action: instruction.actionType,
      assetSymbol: asset.symbol,
      decimals,
      amountHuman: instruction.amount,
      amountWei,
      to: route.to,
      from: route.from,
      note: 'DRY_RUN: no transaction broadcast. SETTLED requires on-chain confirmation via externallySettleInstruction.',
    },
  };
}

// ── LIVE dispatch ──────────────────────────────────────────────────

const ERC20_MINIMAL_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function mint(address to, uint256 amount)',
  'function burn(address from, uint256 amount)',
];

function avalancheRpcUrl(): string {
  const url = process.env.AVALANCHE_RPC_URL;
  if (!url) throw new Error('avalanche-adapter: AVALANCHE_RPC_URL is required for LIVE mode');
  return url;
}

const SUPPORTED_LIVE_CHAIN_IDS = new Set<number>([43114, 43113]);

async function liveDispatch(input: AdapterDispatchInput): Promise<AdapterDispatchResult> {
  const { instruction, asset } = input;

  if (!asset.contractAddress) {
    throw new Error(`avalanche-adapter: asset ${asset.symbol} has no contractAddress`);
  }
  const chainId = asset.chainId ?? null;
  if (chainId === null) {
    throw new Error(`avalanche-adapter: asset ${asset.symbol} has no chainId`);
  }
  if (!SUPPORTED_LIVE_CHAIN_IDS.has(chainId)) {
    throw new Error(
      `avalanche-adapter: chainId=${chainId} not in live-broadcast list (supported: ${Array.from(SUPPORTED_LIVE_CHAIN_IDS).join(',')})`,
    );
  }

  const route = resolveRoute(input);
  if ((instruction.actionType === 'MINT' || instruction.actionType === 'TRANSFER') && !route.to) {
    throw new Error(
      `avalanche-adapter: action ${instruction.actionType} requires payloadJson.recipient`,
    );
  }

  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error('avalanche-adapter: DEPLOYER_PRIVATE_KEY is required for LIVE mode');

  const { ethers } = await import('ethers');
  const provider = new ethers.JsonRpcProvider(avalancheRpcUrl());
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
        `avalanche-adapter: unsupported actionType "${instruction.actionType}" — supported: MINT, REDEEM, TRANSFER`,
      );
  }

  return {
    externalRef: tx.hash,
    settledAt: new Date(),
    submitted: true,
    receiptJson: {
      kind: 'AVALANCHE',
      mode: 'LIVE',
      chain: asset.chain ?? 'avalanche-c-chain',
      chainId: asset.chainId ?? 43114,
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

export const avalancheAdapter: SettlementAdapter = {
  kind: 'AVALANCHE',
  name: 'capinfra-avalanche',
  async dispatch(input: AdapterDispatchInput): Promise<AdapterDispatchResult> {
    const baseMode = resolveMode();
    if (baseMode === 'DISABLED') throw new AdapterDisabledError('AVALANCHE');
    const mode = effectiveModeForAsset(input.asset.symbol, baseMode);
    if (mode === 'DRY_RUN') {
      return dryRunDispatch(input, baseMode === 'LIVE' ? 'asset_not_allowlisted' : 'mode');
    }
    return liveDispatch(input);
  },
};
