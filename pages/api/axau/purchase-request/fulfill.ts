import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { axauPurchaseRequests } from '../../../../shared/axauSchema';
import { eq } from 'drizzle-orm';

const ADMIN_KEY = process.env.ADMIN_SOLVENCY_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = req.headers['x-admin-key'];
  if (!ADMIN_KEY || adminKey !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { requestId, action, fulfillmentTxHash, notes } = req.body;

  if (!requestId || typeof requestId !== 'string') {
    return res.status(400).json({ error: 'requestId required' });
  }
  if (!['processing', 'fulfilled', 'failed'].includes(action)) {
    return res.status(400).json({ error: 'action must be: processing | fulfilled | failed' });
  }
  if (action === 'fulfilled' && (!fulfillmentTxHash || typeof fulfillmentTxHash !== 'string')) {
    return res.status(400).json({ error: 'fulfillmentTxHash required for fulfilled action' });
  }

  try {
    const existing = await db
      .select()
      .from(axauPurchaseRequests)
      .where(eq(axauPurchaseRequests.id, requestId))
      .limit(1);

    if (!existing.length) {
      return res.status(404).json({ error: 'Purchase request not found' });
    }

    const now = new Date();

    let updated;
    if (action === 'fulfilled') {
      [updated] = await db
        .update(axauPurchaseRequests)
        .set({ status: 'fulfilled', fulfillmentTxHash, fulfilledAt: now, notes: notes || existing[0].notes, updatedAt: now })
        .where(eq(axauPurchaseRequests.id, requestId))
        .returning();
    } else if (action === 'processing') {
      [updated] = await db
        .update(axauPurchaseRequests)
        .set({ status: 'processing', notes: notes || existing[0].notes, updatedAt: now })
        .where(eq(axauPurchaseRequests.id, requestId))
        .returning();
    } else {
      [updated] = await db
        .update(axauPurchaseRequests)
        .set({ status: 'failed', notes: notes || existing[0].notes, updatedAt: now })
        .where(eq(axauPurchaseRequests.id, requestId))
        .returning();
    }

    return res.status(200).json({ success: true, data: updated });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
