import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import {
  increaseInsuranceHolds,
} from '../../../../../shared/increaseParticipantSchema';
import { eq, and } from 'drizzle-orm';

function isAdmin(req: NextApiRequest): boolean {
  const key = req.headers['x-admin-key'];
  return typeof key === 'string' && key === process.env.ADMIN_SOLVENCY_KEY;
}

// POST /api/banking/wealth-practice/insurance/fund
// Admin-only: mark an insurance hold as funded after ACH settlement is confirmed.
// Body: { holdId, depositedAmountCents, increaseTransactionId? }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin authorization required' });
  }

  const { holdId, depositedAmountCents, increaseTransactionId } = req.body;

  if (!holdId || typeof holdId !== 'number') {
    return res.status(400).json({ error: 'holdId (number) required' });
  }
  if (typeof depositedAmountCents !== 'number' || depositedAmountCents < 0) {
    return res.status(400).json({ error: 'depositedAmountCents required' });
  }

  try {
    const existing = await db
      .select()
      .from(increaseInsuranceHolds)
      .where(eq(increaseInsuranceHolds.id, holdId))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Hold not found' });
    }

    const hold = existing[0];

    if (hold.status === 'funded') {
      return res.status(200).json({ success: true, hold, alreadyFunded: true });
    }

    const totalDeposited = hold.depositedAmountCents + depositedAmountCents;
    const isFunded = totalDeposited >= hold.requiredAmountCents;

    const [updated] = await db
      .update(increaseInsuranceHolds)
      .set({
        depositedAmountCents: totalDeposited,
        status: isFunded ? 'funded' : 'pending',
        fundedAt: isFunded ? new Date() : undefined,
        notes: increaseTransactionId
          ? `Increase txn: ${increaseTransactionId}`
          : hold.notes ?? undefined,
      })
      .where(eq(increaseInsuranceHolds.id, holdId))
      .returning();

    return res.status(200).json({
      success: true,
      hold: updated,
      funded: isFunded,
      shortfallCents: isFunded ? 0 : hold.requiredAmountCents - totalDeposited,
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
