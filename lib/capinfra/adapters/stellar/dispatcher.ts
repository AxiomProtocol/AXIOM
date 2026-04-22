/**
 * Capital Infrastructure — Stellar adapter dispatcher (Phase 3B.1a).
 *
 * Mode contract:
 *   DRY_RUN: validate the instruction against the live network (asset
 *            code matches config, anchor account exists, amount well
 *            formed) and return a deterministic synthetic receipt. NO
 *            transaction is signed or submitted. Reconciliation in
 *            3B.1b will use the deterministic externalRef.
 *   LIVE   : explicitly NOT permitted in this slice. Throws
 *            AdapterModeNotPermittedError so the LIVE codepath is
 *            provably gated even though the type is allowed.
 *
 * Side-effect contract: dispatcher MUST NOT write to the portfolio,
 * reserve, audit log, or notifications. The settlement core
 * (`lib/capinfra/settlement.ts`) is the single owner of post-dispatch
 * state transitions.
 */

import {
  AdapterModeNotPermittedError,
  AdapterValidationError,
  type AdapterDispatchInput,
  type AdapterDispatchResult,
} from '../types';
import { requireStellarConfig, modeOf, networkOf } from './config';
import { canonicalDryRunRef, isValidStellarAccount, resolveAnchorAccount } from './sdk';

const DISPATCH_TIMEOUT_MS = 5_000;

export async function dispatchStellar(input: AdapterDispatchInput): Promise<AdapterDispatchResult> {
  const cfg = await requireStellarConfig();

  if (modeOf(cfg) === 'LIVE') {
    // 3B.1a explicit gate — even with LIVE in the type, refuse here.
    throw new AdapterModeNotPermittedError('STELLAR', 'LIVE');
  }

  // ── Validation phase: real network check, no mutation ────────────
  const { instruction, asset } = input;

  // Asset symbol must match adapter's configured asset code. We accept
  // either an exact match on symbol (e.g. AXUSD) or on assetCode itself.
  if (asset.symbol !== cfg.assetCode) {
    throw new AdapterValidationError(
      'ASSET_CODE_MISMATCH',
      `instruction asset symbol ${asset.symbol} does not match adapter assetCode ${cfg.assetCode}`,
    );
  }

  if (!isValidStellarAccount(cfg.anchorAccount)) {
    throw new AdapterValidationError(
      'ANCHOR_ACCOUNT_INVALID',
      `configured anchorAccount is not a valid Stellar G... key`,
    );
  }

  // Amount must be a positive decimal string.
  if (!/^\d+(\.\d+)?$/.test(instruction.amount) || Number(instruction.amount) <= 0) {
    throw new AdapterValidationError(
      'AMOUNT_INVALID',
      `instruction amount ${instruction.amount} is not a positive decimal`,
    );
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), DISPATCH_TIMEOUT_MS);
  let probe;
  try {
    probe = await resolveAnchorAccount(networkOf(cfg), cfg.anchorAccount, ac.signal);
  } finally {
    clearTimeout(timer);
  }

  if (probe.error) {
    throw new AdapterValidationError(
      'ANCHOR_PROBE_FAILED',
      `anchor account probe failed: ${probe.error}`,
    );
  }
  if (!probe.exists) {
    throw new AdapterValidationError(
      'ANCHOR_ACCOUNT_NOT_FOUND',
      `anchor account ${cfg.anchorAccount} not found on ${networkOf(cfg)}`,
    );
  }

  const externalRef = canonicalDryRunRef({
    instructionId: instruction.id,
    assetSymbol: asset.symbol,
    amount: instruction.amount,
    anchorAccount: cfg.anchorAccount,
    assetCode: cfg.assetCode,
  });

  return {
    externalRef,
    settledAt: new Date(),
    receiptJson: {
      mode: 'DRY_RUN',
      kind: 'STELLAR',
      network: networkOf(cfg),
      anchorAccount: cfg.anchorAccount,
      assetCode: cfg.assetCode,
      validated: true,
      anchorProbed: true,
      configVersion: cfg.configVersion,
      configRowId: cfg.rowId,
    },
  };
}
