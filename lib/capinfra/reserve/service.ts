/**
 * Capital Infrastructure — Phase 3A.2 reserve service.
 *
 * Append-only ledger semantics: every adjustment is a new row in
 * `cap_reserve_holdings` and net per-asset balance is a SUM aggregate
 * over `direction`. `direction = CREDIT` adds to gross, `direction =
 * DEBIT` subtracts. Per clarification #3, the API boundary requires
 * (idempotencyKey, reasonCode, actor) on every adjust; idempotency
 * is also enforced by a unique DB index.
 *
 * Per R7 and the Phase 3 plan, reserve NEVER mutates settlement
 * state. Insufficient headroom blocks via the policy layer
 * (RESERVE_INSUFFICIENT reason code) — see `lib/capinfra/policy.ts`.
 */

import { db } from '../../../server/db';
import {
  capReserveHoldings,
  type CapReserveHolding,
  type NewCapReserveHolding,
} from '../../../shared/capInfraSchema';
import { and, eq, sql } from 'drizzle-orm';
import { generateId } from '../ids';
import { emitAuditEventStrict } from '../audit';
import { ValidationError, ConflictError } from '../errors';

export type ReserveDirection = 'CREDIT' | 'DEBIT';
export type ReserveSource =
  | 'DEPOSIT'
  | 'REDEMPTION'
  | 'ATTESTATION'
  | 'ADJUSTMENT'
  | 'INITIAL';

export interface AdjustReserveInput {
  assetId: string;
  amount: string; // decimal string for numeric(30,10)
  direction: ReserveDirection;
  source: ReserveSource;
  reasonCode: string;
  actor: string;
  idempotencyKey: string;
  referenceId?: string | null;
  attestationRef?: string | null;
  correlationId?: string | null;
}

export interface AssetHeadroom {
  assetId: string;
  gross: string;
  debited: string;
  available: string;
  rowCount: number;
}

function ensureDecimal(amount: string, fieldName: string): void {
  if (!/^-?\d+(\.\d+)?$/.test(amount)) {
    throw new ValidationError(`${fieldName} must be a decimal string`);
  }
  if (amount.startsWith('-')) {
    throw new ValidationError(`${fieldName} must be non-negative`);
  }
}

/**
 * Adjust the reserve. Returns the persisted row. On idempotent
 * replay (same idempotencyKey), returns the existing row unchanged.
 */
export async function adjustReserve(input: AdjustReserveInput): Promise<CapReserveHolding> {
  if (!input.idempotencyKey) throw new ValidationError('idempotencyKey is required');
  if (!input.reasonCode) throw new ValidationError('reasonCode is required');
  if (!input.actor) throw new ValidationError('actor is required');
  if (input.direction !== 'CREDIT' && input.direction !== 'DEBIT') {
    throw new ValidationError('direction must be CREDIT or DEBIT');
  }
  ensureDecimal(input.amount, 'amount');

  // Replay path
  const existing = await db
    .select()
    .from(capReserveHoldings)
    .where(eq(capReserveHoldings.idempotencyKey, input.idempotencyKey))
    .limit(1);
  if (existing[0]) {
    // Verify it matches the new request — divergent payloads on the
    // same idempotency key are a client error, not a silent overwrite.
    const e = existing[0];
    // Amount is stored at full numeric precision, so compare numerically
    // rather than as a raw string ('1000000' vs '1000000.0000000000').
    const amountsEqual = (() => {
      try { return Number(e.amount) === Number(input.amount); } catch { return false; }
    })();
    if (
      e.assetId !== input.assetId ||
      e.direction !== input.direction ||
      e.source !== input.source ||
      !amountsEqual
    ) {
      throw new ConflictError(
        'Idempotency key reused with a different payload',
        { existingId: e.id },
      );
    }
    return e;
  }

  const id = generateId('hld');
  const row: NewCapReserveHolding = {
    id,
    assetId: input.assetId,
    source: input.source,
    direction: input.direction,
    amount: input.amount,
    referenceId: input.referenceId ?? null,
    attestationRef: input.attestationRef ?? null,
    reasonCode: input.reasonCode,
    idempotencyKey: input.idempotencyKey,
    actor: input.actor,
  };

  return await db.transaction(async (tx) => {
    let inserted: CapReserveHolding[] = [];
    try {
      inserted = await tx
        .insert(capReserveHoldings)
        .values(row)
        .onConflictDoNothing({ target: capReserveHoldings.idempotencyKey })
        .returning();
    } catch (err) {
      throw err;
    }
    if (inserted.length === 0) {
      // Lost race — fetch winner.
      const [winner] = await tx
        .select()
        .from(capReserveHoldings)
        .where(eq(capReserveHoldings.idempotencyKey, input.idempotencyKey))
        .limit(1);
      if (!winner) throw new Error('reserve adjust race: no winner');
      return winner;
    }
    await emitAuditEventStrict(
      {
        eventType: `reserve.${input.direction.toLowerCase()}`,
        aggregateType: 'cap_reserve_holding',
        aggregateId: inserted[0].id,
        assetId: input.assetId,
        actor: input.actor,
        correlationId: input.correlationId ?? undefined,
        payloadJson: {
          source: input.source,
          amount: input.amount,
          reasonCode: input.reasonCode,
          referenceId: input.referenceId ?? null,
          attestationRef: input.attestationRef ?? null,
          idempotencyKey: input.idempotencyKey,
        },
      },
      tx,
    );
    return inserted[0];
  }).then(async (row) => {
    // Post-commit Collateral Risk Policy integrity hook. If the
    // ledger event we just recorded reveals that the asset is
    // under-reserved (gross < debited), trigger the canonical
    // integrity-failure chokepoint so the asset is downgraded to
    // RED and the event is published. Two distinct kinds:
    //
    //   - source = 'ATTESTATION'  → kind: 'reserve_attestation_failed'
    //   - source = 'REDEMPTION'   → kind: 'redemption_failed'
    //
    // Best-effort, fire-and-forget: an integrity-record failure must
    // never break the underlying reserve write. The integrity helper
    // is itself idempotent (edge-triggered: skips writes when the
    // asset is already RED), so this is safe to call on every
    // attestation/redemption event.
    if (input.source !== 'ATTESTATION' && input.source !== 'REDEMPTION') {
      return row;
    }
    try {
      const headroom = await getAssetHeadroom(input.assetId);
      const availableScaled = decimalToScaled(headroom.available);
      if (availableScaled >= 0n) return row;
      const { recordIntegrityFailure } = await import('../risk/integrity');
      const kind: 'reserve_attestation_failed' | 'redemption_failed' =
        input.source === 'ATTESTATION'
          ? 'reserve_attestation_failed'
          : 'redemption_failed';
      const detail =
        input.source === 'ATTESTATION'
          ? `Attestation ${input.attestationRef ?? '(no ref)'} resulted in negative headroom: gross=${headroom.gross} debited=${headroom.debited} available=${headroom.available}`
          : `Redemption (reasonCode=${input.reasonCode}, ref=${input.referenceId ?? 'n/a'}) over-drew reserve: gross=${headroom.gross} debited=${headroom.debited} available=${headroom.available}`;
      await recordIntegrityFailure({
        assetId: input.assetId,
        kind,
        detail,
        actor: `system:reserve.${input.source.toLowerCase()}`,
        correlationId: input.correlationId ?? undefined,
      });
    } catch (err) {
      console.warn(
        '[reserve.adjust] integrity hook failed (non-blocking):',
        (err as Error).message,
      );
    }
    return row;
  });
}

/**
 * Compute net headroom for an asset by summing the append-only
 * holdings ledger. Deterministic for a fixed ledger state.
 */
export async function getAssetHeadroom(assetId: string): Promise<AssetHeadroom> {
  if (!assetId) throw new ValidationError('assetId is required');
  const rows = await db
    .select({
      direction: capReserveHoldings.direction,
      total: sql<string>`COALESCE(SUM(${capReserveHoldings.amount}), 0)::text`,
      n: sql<number>`COUNT(*)::int`,
    })
    .from(capReserveHoldings)
    .where(eq(capReserveHoldings.assetId, assetId))
    .groupBy(capReserveHoldings.direction);

  // Use BigInt-scaled fixed-point arithmetic to avoid float drift on
  // large or fractional values stored in numeric(30,10).
  let grossScaled = 0n;
  let debitedScaled = 0n;
  let count = 0;
  for (const r of rows) {
    const v = decimalToScaled(r.total);
    count += Number(r.n);
    if (r.direction === 'CREDIT') grossScaled += v;
    else if (r.direction === 'DEBIT') debitedScaled += v;
  }
  const availableScaled = grossScaled - debitedScaled;
  return {
    assetId,
    gross: scaledToDecimal(grossScaled),
    debited: scaledToDecimal(debitedScaled),
    available: scaledToDecimal(availableScaled),
    rowCount: count,
  };
}

/**
 * Pure check used by the policy layer. Returns true if the asset
 * has at least `requiredAmount` available reserve headroom. Compares
 * via BigInt-scaled fixed point — never JS float — so that a
 * numeric(30,10) headroom of e.g. 1234567890123456789.0000000001
 * compares correctly against an identical mint request.
 */
export async function hasSufficientHeadroom(
  assetId: string,
  requiredAmount: string,
): Promise<{ ok: boolean; available: string; required: string }> {
  ensureDecimal(requiredAmount, 'requiredAmount');
  const h = await getAssetHeadroom(assetId);
  const availableScaled = decimalToScaled(h.available);
  const requiredScaled = decimalToScaled(requiredAmount);
  return {
    ok: availableScaled >= requiredScaled,
    available: h.available,
    required: requiredAmount,
  };
}

// ────────────────── Decimal helpers ──────────────────
// Scale matches the DB column: numeric(30,10).
const SCALE = 10;

/** Convert a decimal-string (e.g. "1234.5") to BigInt scaled by 10^SCALE. */
function decimalToScaled(input: string): bigint {
  const s = (input ?? '0').trim();
  if (s === '' || s === '-' || s === '.') return 0n;
  const negative = s.startsWith('-');
  const body = negative ? s.slice(1) : s;
  const [intPart, fracPartRaw = ''] = body.split('.');
  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(fracPartRaw)) {
    throw new Error(`invalid decimal string: ${input}`);
  }
  const fracPart = (fracPartRaw + '0'.repeat(SCALE)).slice(0, SCALE);
  const combined = (intPart || '0') + fracPart;
  const scaled = BigInt(combined);
  return negative ? -scaled : scaled;
}

/** Convert a scaled BigInt back to a decimal string with SCALE fractional digits. */
function scaledToDecimal(scaled: bigint): string {
  const negative = scaled < 0n;
  const abs = negative ? -scaled : scaled;
  const s = abs.toString().padStart(SCALE + 1, '0');
  const intPart = s.slice(0, s.length - SCALE);
  const fracPart = s.slice(s.length - SCALE);
  const out = `${intPart}.${fracPart}`;
  return negative ? `-${out}` : out;
}

// ─────────────────────────────────────────────────────────────────────────────
// On-chain ↔ Ledger Reconciliation
// ─────────────────────────────────────────────────────────────────────────────
//
// reconcileOnChainVsLedger() compares two independent views of reserve balances:
//
//   LEDGER VIEW  — the append-only `cap_reserve_holdings` table, which is the
//                  source of truth for settlement headroom and policy enforcement.
//                  Balance = SUM(CREDIT) - SUM(DEBIT) per assetId.
//
//   ON-CHAIN VIEW — getCanonicalReserveSnapshot(), which queries the chain live
//                   (eth_call / balanceOf / totalSupply) and BitGo CaaS DB.
//
// Intended use: scheduled cron (e.g. every 6h), post-mint webhook, or manual
// operator trigger via /api/internal/reserve-reconcile (not yet wired).
//
// Output shape intentionally mirrors standard double-entry difference reports:
//   discrepancy > 0  — ledger shows MORE than on-chain (possible over-crediting)
//   discrepancy < 0  — ledger shows LESS than on-chain (possible under-crediting)
//   discrepancy = 0  — views agree within tolerance
//
// IMPORTANT: This function is READ-ONLY. It does not mutate the ledger or
// trigger corrections. Remediation (e.g. ADJUSTMENT entries) must be initiated
// by an authorized operator with a valid idempotencyKey and reasonCode, following
// the same path as adjustReserve().
// ─────────────────────────────────────────────────────────────────────────────

import { getCanonicalReserveSnapshot } from '../../reserves/getCanonicalReserveSnapshot';

export type ReconciliationStatus =
  | 'MATCH'      // within tolerance
  | 'DISCREPANCY' // outside tolerance — needs review
  | 'LEDGER_EMPTY' // no ledger rows for this asset — new or uninitialized
  | 'ONCHAIN_ZERO' // on-chain balance is 0 (zero supply or not yet deployed)
  | 'ERROR';       // one side failed to fetch

export interface ReconciliationEntry {
  assetId: string;         // canonical asset identifier (e.g. 'AXUSD', 'PAXG')
  ledgerAvailable: string; // decimal string from getAssetHeadroom()
  onChainBalance: string;  // decimal string from getCanonicalReserveSnapshot()
  discrepancy: string;     // ledgerAvailable - onChainBalance (signed decimal)
  discrepancyUsd: number | null;
  status: ReconciliationStatus;
  notes: string;
}

export interface ReconciliationReport {
  reconciledAt: string;
  entries: ReconciliationEntry[];
  summary: {
    totalEntries: number;
    matches: number;
    discrepancies: number;
    errors: number;
    hasActionableDiscrepancy: boolean;
  };
}

/** Tolerance: differences below this amount (in token units) are treated as
 *  rounding noise rather than real discrepancies. Adjustable per-asset in future.
 *  Currently set to 0.01 tokens — sufficient for 18-decimal ERC-20s. */
const DEFAULT_TOLERANCE = 0.01;

/**
 * Scaffold: reconcile on-chain reserve balances against the capinfra ledger.
 *
 * Phase 1 (current): reads both sides and returns a diff report.
 * Phase 2 (planned): emit audit events for discrepancies above threshold.
 * Phase 3 (planned): auto-open JIRA/Linear ticket via webhook on DISCREPANCY.
 *
 * Wire to: POST /api/internal/reserve-reconcile (requires ADMIN_SOLVENCY_KEY).
 */
export async function reconcileOnChainVsLedger(
  opts: {
    toleranceOverride?: number;
    actor?: string;
  } = {},
): Promise<ReconciliationReport> {
  const reconciledAt = new Date().toISOString();
  const tolerance    = opts.toleranceOverride ?? DEFAULT_TOLERANCE;

  // The canonical on-chain snapshot is the external source of truth.
  // The ledger (cap_reserve_holdings SUM) is the internal source of truth.
  // We compare per asset and surface any discrepancy.
  const [snap, axusdHeadroom, paxgHeadroom, usdcHeadroom] = await Promise.allSettled([
    getCanonicalReserveSnapshot(),
    getAssetHeadroom('AXUSD').catch(() => null),
    getAssetHeadroom('PAXG').catch(() => null),
    getAssetHeadroom('USDC').catch(() => null),
  ]);

  const entries: ReconciliationEntry[] = [];

  function makeEntry(
    assetId: string,
    ledgerResult: PromiseSettledResult<AssetHeadroom | null>,
    onChainBalance: number,
    priceUsd: number | null,
  ): ReconciliationEntry {
    if (ledgerResult.status === 'rejected') {
      return {
        assetId,
        ledgerAvailable: '0',
        onChainBalance: onChainBalance.toFixed(10),
        discrepancy: '0',
        discrepancyUsd: null,
        status: 'ERROR',
        notes: `Ledger fetch failed: ${(ledgerResult as PromiseRejectedResult).reason?.message ?? 'unknown error'}`,
      };
    }

    const headroom = ledgerResult.value;
    if (!headroom || headroom.rowCount === 0) {
      return {
        assetId,
        ledgerAvailable: '0',
        onChainBalance: onChainBalance.toFixed(10),
        discrepancy: (-onChainBalance).toFixed(10),
        discrepancyUsd: priceUsd !== null ? -onChainBalance * priceUsd : null,
        status: 'LEDGER_EMPTY',
        notes: `No ledger rows for ${assetId}. On-chain balance: ${onChainBalance.toFixed(6)}. Ledger not yet initialized or all adjustments netted to zero.`,
      };
    }

    if (onChainBalance === 0) {
      return {
        assetId,
        ledgerAvailable: headroom.available,
        onChainBalance: '0',
        discrepancy: headroom.available,
        discrepancyUsd: priceUsd !== null ? parseFloat(headroom.available) * priceUsd : null,
        status: 'ONCHAIN_ZERO',
        notes: `On-chain balance is 0 for ${assetId}. Ledger available: ${headroom.available}. Possible: deployment not live, wrong address, or balance transferred out.`,
      };
    }

    const ledgerFloat = parseFloat(headroom.available);
    const diff        = ledgerFloat - onChainBalance;
    const absDiff     = Math.abs(diff);
    const status: ReconciliationStatus = absDiff <= tolerance ? 'MATCH' : 'DISCREPANCY';

    return {
      assetId,
      ledgerAvailable: headroom.available,
      onChainBalance: onChainBalance.toFixed(10),
      discrepancy: diff.toFixed(10),
      discrepancyUsd: priceUsd !== null ? diff * priceUsd : null,
      status,
      notes: status === 'MATCH'
        ? `Within tolerance (diff: ${diff.toFixed(8)}, tolerance: ${tolerance})`
        : `Discrepancy detected: ledger=${ledgerFloat.toFixed(6)}, on-chain=${onChainBalance.toFixed(6)}, diff=${diff.toFixed(8)}. Operator review required.`,
    };
  }

  if (snap.status === 'rejected') {
    // On-chain fetch failed entirely — cannot compare any asset.
    for (const assetId of ['AXUSD', 'PAXG', 'USDC']) {
      entries.push({
        assetId,
        ledgerAvailable: '0',
        onChainBalance: '0',
        discrepancy: '0',
        discrepancyUsd: null,
        status: 'ERROR',
        notes: `On-chain snapshot failed: ${(snap as PromiseRejectedResult).reason?.message ?? 'unknown error'}`,
      });
    }
  } else {
    const s = snap.value;
    const r = s._raw;

    entries.push(makeEntry('AXUSD', axusdHeadroom, r.axusdTotal,     1.0));
    entries.push(makeEntry('PAXG',  paxgHeadroom,  r.paxgBal,        r.xauPrice));
    entries.push(makeEntry('USDC',  usdcHeadroom,  r.usdcTotal,      1.0));

    // AXUSD circulating supply check: on-chain totalSupply vs. sum of all
    // CREDIT entries in the ledger is a higher-level consistency check.
    // Scaffolded here for Phase 2 — requires a dedicated assetId convention
    // (e.g. 'AXUSD:totalSupply') and a separate ledger sweep.
    // TODO (Phase 2): emit audit event if axusdCirculatingSupply > axusdTotal + headroom
  }

  const matches       = entries.filter(e => e.status === 'MATCH').length;
  const discrepancies = entries.filter(e => e.status === 'DISCREPANCY').length;
  const errors        = entries.filter(e => e.status === 'ERROR').length;

  return {
    reconciledAt,
    entries,
    summary: {
      totalEntries: entries.length,
      matches,
      discrepancies,
      errors,
      hasActionableDiscrepancy: discrepancies > 0,
    },
  };
}
