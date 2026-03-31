import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import {
  increaseProductEscrows,
} from '../../../../shared/increaseParticipantSchema';
import { eq, and } from 'drizzle-orm';

// GET  /api/banking/insurance/[holdId]  — retrieve an insurance-hold escrow (admin only)
// PATCH /api/banking/insurance/[holdId] — update hold status (admin only)
//
// Reads/writes increase_product_escrows with purpose='insurance-hold'.
// Preferred alternatives: /api/banking/wealth-practice/insurance/{fund,release,status}

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
      const rows = await db
        .select()
        .from(increaseProductEscrows)
        .where(
          and(
            eq(increaseProductEscrows.id, holdId),
            eq(increaseProductEscrows.purpose, 'insurance-hold'),
          )
        )
        .limit(1);
      if (rows.length === 0) return res.status(404).json({ error: 'Insurance hold not found' });
      return res.status(200).json({ success: true, hold: rows[0] });
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
      const rows = await db
        .select()
        .from(increaseProductEscrows)
        .where(
          and(
            eq(increaseProductEscrows.id, holdId),
            eq(increaseProductEscrows.purpose, 'insurance-hold'),
          )
        )
        .limit(1);

      if (rows.length === 0) return res.status(404).json({ error: 'Insurance hold not found' });
      const hold = rows[0];

      const now = new Date();
      let updateData: Record<string, unknown> = {};

      if (action === 'fund') {
        const deposited = depositedAmountCents ?? hold.amountCents;
        updateData = {
          status: 'funded',
          depositedAmountCents: deposited,
          fundedAt: now,
        };
      } else if (action === 'forfeit') {
        updateData = { status: 'forfeited', forfeitedAt: now };
      } else if (action === 'release') {
        updateData = { status: 'released', releasedAt: now };
      }

      const [updated] = await db
        .update(increaseProductEscrows)
        .set(updateData)
        .where(eq(increaseProductEscrows.id, holdId))
        .returning();

      return res.status(200).json({ success: true, hold: updated });
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
