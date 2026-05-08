/**
 * Axiom internal wallet service.
 *
 * Manages stored-balance ledger operations for the internal funding layer.
 * All monetary amounts are in integer USD cents.
 *
 * Concurrency model: every mutation uses SELECT FOR UPDATE on the balance
 * row within a serialized transaction so concurrent callers never produce
 * a negative balance or a mis-stamped balance_after_cents snapshot.
 */

import { db } from '../../server/db';
import {
  axiomWalletBalances,
  axiomWalletTransactions,
  type AxiomWalletBalance,
  type AxiomWalletTransaction,
} from '../../shared/walletSchema';
import { capAuditEvents } from '../../shared/capInfraSchema';
import { eq, desc, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { generateId } from '../capinfra/ids';

// ── ID generation ─────────────────────────────────────────────────────────
function walletTxId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `wtx_${Date.now()}_${rand}`;
}

// ── Ensure balance row exists (upsert on first touch) ─────────────────────
export async function ensureBalance(userId: string): Promise<AxiomWalletBalance> {
  await db
    .insert(axiomWalletBalances)
    .values({ userId, availableCents: 0, pendingCents: 0 })
    .onConflictDoNothing({ target: axiomWalletBalances.userId });
  const rows = await db
    .select()
    .from(axiomWalletBalances)
    .where(eq(axiomWalletBalances.userId, userId))
    .limit(1);
  if (!rows[0]) throw new Error(`wallet balance row not found for ${userId}`);
  return rows[0];
}

// ── Credit (top-up confirmed) ─────────────────────────────────────────────
export async function creditTopUp(opts: {
  userId: string;
  amountCents: number;
  referenceId: string;
  idempotencyKey: string;
  notes?: string;
}): Promise<AxiomWalletTransaction> {
  if (!Number.isInteger(opts.amountCents) || opts.amountCents <= 0) {
    throw new Error('amountCents must be a positive integer');
  }
  const { txn: txnRow, wasNew } = await db.transaction(async (tx) => {
    // Idempotency check first — no-op if already credited.
    const existing = await tx
      .select()
      .from(axiomWalletTransactions)
      .where(eq(axiomWalletTransactions.idempotencyKey, opts.idempotencyKey))
      .limit(1);
    if (existing[0]) return { txn: existing[0], wasNew: false };

    // Ensure balance row exists, then lock it.
    await tx
      .insert(axiomWalletBalances)
      .values({ userId: opts.userId, availableCents: 0, pendingCents: 0 })
      .onConflictDoNothing({ target: axiomWalletBalances.userId });

    const locked = await tx.execute(
      sql`SELECT available_cents, pending_cents FROM axiom_wallet_balances WHERE user_id = ${opts.userId} FOR UPDATE`,
    );
    const row = locked.rows[0] as { available_cents: number; pending_cents: number };
    const newAvailable = (Number(row.available_cents) || 0) + opts.amountCents;

    const txnId = walletTxId();
    const [txnRow] = await tx
      .insert(axiomWalletTransactions)
      .values({
        id: txnId,
        userId: opts.userId,
        type: 'TOP_UP',
        amountCents: opts.amountCents,
        direction: 'CREDIT',
        balanceAfterCents: newAvailable,
        status: 'SETTLED',
        referenceType: 'STRIPE_CHECKOUT',
        referenceId: opts.referenceId,
        notes: opts.notes ?? null,
        idempotencyKey: opts.idempotencyKey,
      })
      .returning();

    await tx
      .update(axiomWalletBalances)
      .set({
        availableCents: newAvailable,
        lifetimeDepositedCents: sql`lifetime_deposited_cents + ${opts.amountCents}`,
        updatedAt: new Date(),
      })
      .where(eq(axiomWalletBalances.userId, opts.userId));

    return { txn: txnRow, wasNew: true };
  });

  // Fire-and-forget: AI allocation plan → immediate execution.
  // Only runs on a genuinely new credit, never on an idempotency replay.
  // Non-blocking: never throws to caller. Both stages share the same
  // IIFE so execution always follows a successful plan.
  if (wasNew && txnRow) {
    (async () => {
      let runId: string | undefined;
      try {
        const { runAutoAlloc } = await import('./autoAllocate');
        const allocResult = await runAutoAlloc({ amountCents: opts.amountCents, depositId: opts.referenceId });
        runId = allocResult.runId;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[wallet] auto-alloc plan failed:', msg);
        db.insert(capAuditEvents).values({
          id: generateId('ae'),
          eventType: 'card_deposit.auto_allocation_failed',
          aggregateType: 'card_deposit',
          aggregateId: opts.referenceId,
          payloadJson: { error: msg, source: 'creditTopUp:plan', amount_cents: opts.amountCents },
          actor: 'system',
        }).onConflictDoNothing().catch(() => {});
        return; // don't attempt execution if planning failed
      }

      // Stage 2 — execute the plan: fetch prices, write positions, debit wallet
      try {
        const { executeAlloc } = await import('./executeAlloc');
        await executeAlloc({ runId, userId: opts.userId });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[wallet] auto-alloc execution failed:', msg);
        db.insert(capAuditEvents).values({
          id: generateId('ae'),
          eventType: 'treasury_allocation.execution_failed',
          aggregateType: 'treasury_allocation',
          aggregateId: runId,
          payloadJson: { error: msg, source: 'creditTopUp:execute', run_id: runId, amount_cents: opts.amountCents },
          actor: 'system',
        }).onConflictDoNothing().catch(() => {});
      }
    })();
  }

  return txnRow;
}

// ── Place a hold (allocation in flight) ───────────────────────────────────
export async function placeHold(opts: {
  userId: string;
  amountCents: number;
  referenceId: string;
  allocationAsset?: string;
  idempotencyKey: string;
}): Promise<AxiomWalletTransaction> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(axiomWalletTransactions)
      .where(eq(axiomWalletTransactions.idempotencyKey, opts.idempotencyKey))
      .limit(1);
    if (existing[0]) return existing[0];

    const locked = await tx.execute(
      sql`SELECT available_cents, pending_cents FROM axiom_wallet_balances WHERE user_id = ${opts.userId} FOR UPDATE`,
    );
    const row = locked.rows[0] as { available_cents: number; pending_cents: number };
    const available = Number(row.available_cents) || 0;
    const pending   = Number(row.pending_cents) || 0;
    if (available < opts.amountCents) {
      throw new Error(`Insufficient balance: available ${available} cents, requested ${opts.amountCents}`);
    }
    const newAvailable = available - opts.amountCents;
    const newPending   = pending   + opts.amountCents;

    const txnId = walletTxId();
    const [txnRow] = await tx
      .insert(axiomWalletTransactions)
      .values({
        id: txnId,
        userId: opts.userId,
        type: 'HOLD',
        amountCents: opts.amountCents,
        direction: 'DEBIT',
        balanceAfterCents: newAvailable,
        status: 'SETTLED',
        referenceType: 'ALLOCATION',
        referenceId: opts.referenceId,
        allocationAsset: opts.allocationAsset ?? null,
        idempotencyKey: opts.idempotencyKey,
      })
      .returning();

    await tx
      .update(axiomWalletBalances)
      .set({ availableCents: newAvailable, pendingCents: newPending, updatedAt: new Date() })
      .where(eq(axiomWalletBalances.userId, opts.userId));

    return txnRow;
  });
}

// ── Settle a hold into a confirmed debit ──────────────────────────────────
export async function settleHold(opts: {
  userId: string;
  amountCents: number;
  holdReferenceId: string;
  allocationAsset?: string;
  notes?: string;
}): Promise<AxiomWalletTransaction> {
  return db.transaction(async (tx) => {
    const locked = await tx.execute(
      sql`SELECT available_cents, pending_cents FROM axiom_wallet_balances WHERE user_id = ${opts.userId} FOR UPDATE`,
    );
    const row = locked.rows[0] as { available_cents: number; pending_cents: number };
    const newPending = Math.max(0, (Number(row.pending_cents) || 0) - opts.amountCents);

    const txnId = walletTxId();
    const [txnRow] = await tx
      .insert(axiomWalletTransactions)
      .values({
        id: txnId,
        userId: opts.userId,
        type: 'DEBIT',
        amountCents: opts.amountCents,
        direction: 'DEBIT',
        balanceAfterCents: Number(row.available_cents) || 0,
        status: 'SETTLED',
        referenceType: 'ALLOCATION_SETTLED',
        referenceId: opts.holdReferenceId,
        allocationAsset: opts.allocationAsset ?? null,
        notes: opts.notes ?? null,
        idempotencyKey: walletTxId(),
      })
      .returning();

    await tx
      .update(axiomWalletBalances)
      .set({
        pendingCents: newPending,
        lifetimeAllocatedCents: sql`lifetime_allocated_cents + ${opts.amountCents}`,
        updatedAt: new Date(),
      })
      .where(eq(axiomWalletBalances.userId, opts.userId));

    return txnRow;
  });
}

// ── Release a hold (on failure) ───────────────────────────────────────────
export async function releaseHold(opts: {
  userId: string;
  amountCents: number;
  notes?: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const locked = await tx.execute(
      sql`SELECT available_cents, pending_cents FROM axiom_wallet_balances WHERE user_id = ${opts.userId} FOR UPDATE`,
    );
    const row = locked.rows[0] as { available_cents: number; pending_cents: number };
    const newAvailable = (Number(row.available_cents) || 0) + opts.amountCents;
    const newPending   = Math.max(0, (Number(row.pending_cents) || 0) - opts.amountCents);

    await tx
      .insert(axiomWalletTransactions)
      .values({
        id: walletTxId(),
        userId: opts.userId,
        type: 'HOLD_RELEASE',
        amountCents: opts.amountCents,
        direction: 'CREDIT',
        balanceAfterCents: newAvailable,
        status: 'SETTLED',
        notes: opts.notes ?? 'hold released',
        idempotencyKey: walletTxId(),
      });

    await tx
      .update(axiomWalletBalances)
      .set({ availableCents: newAvailable, pendingCents: newPending, updatedAt: new Date() })
      .where(eq(axiomWalletBalances.userId, opts.userId));
  });
}

// ── Read helpers ──────────────────────────────────────────────────────────
export async function getBalance(userId: string): Promise<AxiomWalletBalance | null> {
  const rows = await db
    .select()
    .from(axiomWalletBalances)
    .where(eq(axiomWalletBalances.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function listTransactions(opts: {
  userId: string;
  limit?: number;
  offset?: number;
}): Promise<AxiomWalletTransaction[]> {
  const limit  = Math.min(opts.limit  ?? 50, 200);
  const offset = opts.offset ?? 0;
  return db
    .select()
    .from(axiomWalletTransactions)
    .where(eq(axiomWalletTransactions.userId, opts.userId))
    .orderBy(desc(axiomWalletTransactions.createdAt))
    .limit(limit)
    .offset(offset);
}
