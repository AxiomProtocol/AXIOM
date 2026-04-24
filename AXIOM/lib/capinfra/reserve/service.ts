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
