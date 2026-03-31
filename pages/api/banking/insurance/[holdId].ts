import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import {
  increaseInsuranceHolds,
} from '../../../../shared/increaseParticipantSchema';
import { eq } from 'drizzle-orm';

function isAdmin(req: NextApiRequest): boolean {
  const key = req.headers['x-admin-key'];
  return typeof key === 'string' && key === process.env.ADMIN_SOLVENCY_KEY;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const holdId = parseInt(String(req.query.holdId), 10);
  if (isNaN(holdId)) return res.status(400).json({ error: 'Invalid holdId' });

  if (req.method === 'GET') {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    try {
      const holds = await db
        .select()
        .from(increaseInsuranceHolds)
        .where(eq(increaseInsuranceHolds.id, holdId))
        .limit(1);
      if (holds.length === 0) return res.status(404).json({ error: 'Hold not found' });
      return res.status(200).json({ success: true, hold: holds[0] });
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (req.method === 'PATCH') {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { action, depositedAmountCents } = req.body;

    if (!['fund', 'forfeit', 'release'].includes(action)) {
      return res.status(400).json({ error: 'action must be fund | forfeit | release' });
    }

    try {
      const holds = await db
        .select()
        .from(increaseInsuranceHolds)
        .where(eq(increaseInsuranceHolds.id, holdId))
        .limit(1);

      if (holds.length === 0) return res.status(404).json({ error: 'Hold not found' });
      const hold = holds[0];

      const now = new Date();
      let updateData: Partial<typeof hold> = {};

      if (action === 'fund') {
        updateData = {
          status: 'funded',
          depositedAmountCents: depositedAmountCents ?? hold.requiredAmountCents,
          fundedAt: now,
        };
      } else if (action === 'forfeit') {
        updateData = { status: 'forfeited', forfeitedAt: now };
      } else if (action === 'release') {
        updateData = { status: 'released', releasedAt: now };
      }

      const [updated] = await db
        .update(increaseInsuranceHolds)
        .set(updateData)
        .where(eq(increaseInsuranceHolds.id, holdId))
        .returning();

      return res.status(200).json({ success: true, hold: updated });
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
