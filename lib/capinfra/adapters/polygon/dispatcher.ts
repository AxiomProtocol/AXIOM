/**
 * Capital Infrastructure — Polygon PoS dispatcher.
 *
 * Phase 4: DRY_RUN only. LIVE dispatch is intentionally not implemented
 * in this phase. Any attempt to use LIVE mode fails closed with
 * AdapterModeNotPermittedError — this is the correct production posture
 * until all Phase 4 LIVE pre-conditions are met:
 *   1. BitGo Polygon custody wallet registered in custodyWalletRegistry
 *   2. Accepted-risk record signed for Polygon LIVE mode
 *   3. Polygon Amoy smoke test completed with live RPC
 *   4. Full reconciliation model deployed (post-action + daily cron)
 *   5. Legal review of Polygon-settled payments complete
 *
 * DRY_RUN semantics (identical to Avalanche DRY_RUN):
 *   - Returns a deterministic synthetic externalRef (0xpoldry-…)
 *   - Sets submitted=true so settlement.ts parks instruction at SUBMITTED
 *   - No portfolio write occurs until explicit externallySettleInstruction
 *   - No RPC call is made — Polygon env vars are not required
 *   - No transaction is broadcast
 *
 * Settlement token: native USDC on Polygon PoS
 *   0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
 *
 * Side-effect contract: this module MUST NOT write to portfolio, reserve,
 * audit log, or notifications. settlement.ts owns all post-dispatch state.
 */

import {
  AdapterDisabledError,
  AdapterModeNotPermittedError,
  type AdapterDispatchInput,
  type AdapterDispatchResult,
} from '../types';
import {
  resolveMode,
  effectiveModeForAsset,
  POLYGON_ADAPTER_KIND,
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

// ── DRY_RUN dispatch (no broadcast, no RPC) ────────────────────────

function dryRunDispatch(
  input: AdapterDispatchInput,
  reason: 'mode' | 'asset_not_allowlisted' | 'live_not_implemented',
): AdapterDispatchResult {
  const { instruction, asset } = input;
  const route = resolveRoute(input);
  const decimals = asset.decimals ?? 6; // USDC on Polygon uses 6 decimals
  const suffix = generateId('inst').slice(-12);
  const externalRef = `0xpoldry-${instruction.id.slice(-16)}-${suffix}`;

  return {
    externalRef,
    settledAt: new Date(),
    submitted: true,
    receiptJson: {
      kind: POLYGON_ADAPTER_KIND,
      mode: 'DRY_RUN',
      reason,
      chain: asset.chain ?? 'polygon-pos',
      chainId: asset.chainId ?? 137,
      contract: asset.contractAddress ?? null,
      action: instruction.actionType,
      assetSymbol: asset.symbol,
      decimals,
      amountHuman: instruction.amount,
      to: route.to,
      from: route.from,
      settlementToken: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      note: 'DRY_RUN: no transaction broadcast. SETTLED requires on-chain confirmation via externallySettleInstruction. Phase 4: LIVE not yet implemented.',
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

  // Phase 4: LIVE is not implemented. Fail closed regardless of mode.
  // Even if POLYGON_ADAPTER_MODE=LIVE is set, DRY_RUN is enforced.
  // This prevents any accidental live broadcast before the pre-conditions are met.
  if (baseMode === 'LIVE') {
    // Degrade to DRY_RUN for the asset check, but still fail closed with
    // AdapterModeNotPermittedError so the operator knows LIVE was attempted.
    throw new AdapterModeNotPermittedError(POLYGON_ADAPTER_KIND, 'LIVE');
  }

  const mode = effectiveModeForAsset(input.asset.symbol, baseMode);
  if (mode === 'DRY_RUN') {
    return dryRunDispatch(
      input,
      baseMode === 'LIVE' ? 'live_not_implemented' : 'mode',
    );
  }

  // Should never reach here given the LIVE guard above.
  return dryRunDispatch(input, 'mode');
}
