/**
 * Capital Infrastructure — Avalanche C-Chain dispatcher.
 *
 * Contains all dispatch logic for the AVALANCHE settlement adapter:
 *   - toWei()          : decimal string → wei BigInt (strict, no truncation)
 *   - resolveRoute()   : parse recipient/from from instruction.payloadJson
 *   - dryRunDispatch() : synthetic receipt, no broadcast
 *   - liveDispatch()   : real EVM broadcast via AVALANCHE_RPC_URL
 *   - dispatchAvalanche(): mode-gate entry point called by index.ts
 *
 * Side-effect contract: this module MUST NOT write to portfolio, reserve,
 * audit log, or notifications. settlement.ts owns all post-dispatch state.
 *
 * SUBMITTED semantics (returned when submitted=true):
 *   No workflow may infer economic completion, reserve credit, treasury
 *   availability, or bank-final settlement from SUBMITTED alone.
 */

import {
  AdapterDisabledError,
  type AdapterDispatchInput,
  type AdapterDispatchResult,
} from '../types';
import {
  resolveMode,
  effectiveModeForAsset,
  avalancheRpcUrl,
  deployerPrivateKey,
  assertChainEnabled,
  SUPPORTED_LIVE_CHAIN_IDS,
} from './config';
import { generateId } from '../../ids';

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

// ── Amount conversion: decimal string → wei BigInt ─────────────────

export function toWei(amount: string, decimals: number): bigint {
  const trimmed = amount.trim();
  if (!trimmed) throw new Error('avalanche-adapter: amount string is empty');
  if (trimmed.startsWith('-')) {
    throw new Error(`avalanche-adapter: negative amounts not supported ("${amount}")`);
  }
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error(`avalanche-adapter: invalid decimals=${decimals}`);
  }
  const parts = trimmed.split('.');
  if (parts.length > 2) {
    throw new Error(`avalanche-adapter: invalid amount "${amount}" (multiple decimal points)`);
  }
  const [whole, fracRaw = ''] = parts;
  if (!/^\d+$/.test(whole)) {
    throw new Error(`avalanche-adapter: invalid amount "${amount}" (non-digit in whole)`);
  }
  if (fracRaw && !/^\d+$/.test(fracRaw)) {
    throw new Error(`avalanche-adapter: invalid amount "${amount}" (non-digit in fractional)`);
  }
  if (fracRaw.length > decimals) {
    const excess = fracRaw.slice(decimals);
    if (!/^0*$/.test(excess)) {
      throw new Error(
        `avalanche-adapter: amount "${amount}" exceeds asset decimals=${decimals} (would silently truncate)`,
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

// ── DRY_RUN dispatch (no broadcast) ───────────────────────────────

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

// ── LIVE dispatch (real broadcast via AVALANCHE_RPC_URL) ───────────

const ERC20_MINIMAL_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function mint(address to, uint256 amount)',
  'function burn(address from, uint256 amount)',
];

async function liveDispatch(input: AdapterDispatchInput): Promise<AdapterDispatchResult> {
  const { instruction, asset } = input;

  // Gate: both multichain flags must be set for LIVE broadcast.
  assertChainEnabled();

  if (!asset.contractAddress) {
    throw new Error(`avalanche-adapter: asset ${asset.symbol} has no contractAddress`);
  }
  const chainId = asset.chainId ?? null;
  if (chainId === null) {
    throw new Error(`avalanche-adapter: asset ${asset.symbol} has no chainId`);
  }
  if (!SUPPORTED_LIVE_CHAIN_IDS.has(chainId)) {
    throw new Error(
      `avalanche-adapter: chainId=${chainId} not in live-broadcast list ` +
        `(supported: ${Array.from(SUPPORTED_LIVE_CHAIN_IDS).join(',')})`,
    );
  }

  const route = resolveRoute(input);
  if ((instruction.actionType === 'MINT' || instruction.actionType === 'TRANSFER') && !route.to) {
    throw new Error(
      `avalanche-adapter: action ${instruction.actionType} requires payloadJson.recipient (0x… address)`,
    );
  }

  // Lazy ethers import so DRY_RUN environments don't pay the load cost.
  // Pass chainId to prefer AVALANCHE_FUJI_RPC_URL for Fuji (43113).
  const { ethers } = await import('ethers');
  const provider = new ethers.JsonRpcProvider(avalancheRpcUrl(chainId));

  // T03 hardening: verify the RPC endpoint's actual network matches the
  // expected asset chainId before broadcasting. Catches misconfigured
  // AVALANCHE_RPC_URL / AVALANCHE_FUJI_RPC_URL (e.g. pointing to Arbitrum).
  const rpcNetwork = await provider.getNetwork();
  const rpcChainId = Number(rpcNetwork.chainId);
  if (rpcChainId !== chainId) {
    throw new Error(
      `avalanche-adapter: RPC endpoint returned chainId=${rpcChainId} but ` +
        `asset.chainId=${chainId} — possible wrong-RPC misconfiguration; refusing to broadcast`,
    );
  }

  const wallet = new ethers.Wallet(deployerPrivateKey(), provider);
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

// ── Mode-gate entry point ──────────────────────────────────────────

export async function dispatchAvalanche(
  input: AdapterDispatchInput,
): Promise<AdapterDispatchResult> {
  const baseMode = resolveMode();
  if (baseMode === 'DISABLED') throw new AdapterDisabledError('AVALANCHE');
  const mode = effectiveModeForAsset(input.asset.symbol, baseMode);
  if (mode === 'DRY_RUN') {
    return dryRunDispatch(input, baseMode === 'LIVE' ? 'asset_not_allowlisted' : 'mode');
  }
  return liveDispatch(input);
}
