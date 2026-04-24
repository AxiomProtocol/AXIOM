/**
 * DEV / TEST ONLY — seeds and mutates rows in `cap_card_deposits` so the
 * Playwright spec at e2e/operator-dashboard-card-deposits-link-drain.spec.ts
 * can deterministically verify that the operator dashboard's "Treasury —
 * drain in progress" section appears while in-flight rows exist and
 * disappears once they all reach a terminal status.
 *
 * Disabled in production.
 *
 * Actions (POST body):
 *   { action: 'seed' }
 *     - Archives ANY pre-existing PENDING / PAYOUT_INITIATED rows by
 *       setting their status to SETTLED so the dashboard count is
 *       isolated to this test's row. (Card deposits are a deprecated
 *       drain rail; the only purpose of in-flight rows in dev is to
 *       drive this UI element.)
 *     - Inserts one new PENDING row with a unique idempotency key.
 *     - Returns { id, idempotencyKey, archivedExisting }.
 *
 *   { action: 'set-status', id: string, status: CardDepositStatus }
 *     - Updates the given row to the provided status. The mutation is
 *       a raw column update — it does NOT route through the service
 *       layer's webhook machinery, so it will not emit the drain
 *       archive email or any audit events.
 *     - Returns { id, status }.
 *
 *   { action: 'cleanup', id: string }
 *     - Deletes the given row.
 *     - Returns { id, deleted: true }.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../../../../server/db';
import { capCardDeposits } from '../../../../../shared/capInfraSchema';
import { generateId } from '../../../../../lib/capinfra/ids';

type CardDepositStatus =
  | 'PENDING'
  | 'PAID'
  | 'MINTED'
  | 'PAYOUT_INITIATED'
  | 'SETTLED'
  | 'FAILED'
  | 'REFUNDED';

const ALLOWED_STATUSES: ReadonlyArray<CardDepositStatus> = [
  'PENDING',
  'PAID',
  'MINTED',
  'PAYOUT_INITIATED',
  'SETTLED',
  'FAILED',
  'REFUNDED',
];

interface SeedBody {
  action?: 'seed' | 'set-status' | 'cleanup';
  id?: string;
  status?: CardDepositStatus;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const body = (req.body ?? {}) as SeedBody;
  const action = body.action ?? 'seed';

  try {
    if (action === 'seed') {
      const archived = await db
        .update(capCardDeposits)
        .set({ status: 'SETTLED', updatedAt: new Date() })
        .where(inArray(capCardDeposits.status, ['PENDING', 'PAYOUT_INITIATED']))
        .returning({ id: capCardDeposits.id });

      const id = generateId('cd');
      const idempotencyKey = `e2e-card-deposit-link-drain-${id}`;
      await db.insert(capCardDeposits).values({
        id,
        intent: 'TREASURY_FUND',
        amountCents: 12_345,
        currency: 'usd',
        status: 'PENDING',
        idempotencyKey,
        buyerEmail: 'e2e-card-deposit-link-drain@axiom.local',
        metadataJson: { source: 'e2e-test-seed-card-deposit' },
      });

      return res.status(200).json({
        id,
        idempotencyKey,
        archivedExisting: archived.length,
      });
    }

    if (action === 'set-status') {
      if (!body.id || typeof body.id !== 'string') {
        return res.status(400).json({ error: 'BAD_REQUEST', detail: 'id is required' });
      }
      if (!body.status || !ALLOWED_STATUSES.includes(body.status)) {
        return res.status(400).json({
          error: 'BAD_REQUEST',
          detail: `status must be one of ${ALLOWED_STATUSES.join(', ')}`,
        });
      }
      const updated = await db
        .update(capCardDeposits)
        .set({ status: body.status, updatedAt: new Date() })
        .where(eq(capCardDeposits.id, body.id))
        .returning({ id: capCardDeposits.id });
      if (!updated[0]) {
        return res.status(404).json({ error: 'NOT_FOUND', detail: `no row with id ${body.id}` });
      }
      return res.status(200).json({ id: updated[0].id, status: body.status });
    }

    if (action === 'cleanup') {
      if (!body.id || typeof body.id !== 'string') {
        return res.status(400).json({ error: 'BAD_REQUEST', detail: 'id is required' });
      }
      await db.delete(capCardDeposits).where(eq(capCardDeposits.id, body.id));
      return res.status(200).json({ id: body.id, deleted: true });
    }

    return res.status(400).json({
      error: 'BAD_REQUEST',
      detail: `unknown action: ${String(action)}`,
    });
  } catch (err) {
    return res.status(500).json({
      error: 'SEED_FAILED',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
