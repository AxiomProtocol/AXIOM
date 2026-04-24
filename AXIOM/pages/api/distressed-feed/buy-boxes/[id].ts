import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { dpBuyBoxes } from '../../../../shared/distressedFeedSchema';
import { eq } from 'drizzle-orm';
import { getMatchesForBuyBox } from '../../../../lib/distressed-feed/matching';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Buy box ID required' });
  }

  if (req.method === 'GET') {
    try {
      const rows = await db.select().from(dpBuyBoxes).where(eq(dpBuyBoxes.id, id)).limit(1);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Buy box not found' });
      }

      const matches = await getMatchesForBuyBox(id);
      return res.json({ buyBox: rows[0], matches: matches.matches });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: 'Failed to fetch buy box', detail: message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      const allowed = ['name', 'targetCities', 'targetStates', 'minPrice', 'maxPrice',
        'propertyTypes', 'distressTypes', 'minBedrooms', 'minSqft', 'maxPricePerSqft',
        'minDscr', 'minCapRate', 'maxRiskLevel', 'active'];

      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          if (['minPrice', 'maxPrice', 'maxPricePerSqft', 'minDscr', 'minCapRate'].includes(key)) {
            updateData[key] = req.body[key] ? String(req.body[key]) : null;
          } else {
            updateData[key] = req.body[key];
          }
        }
      }

      const [updated] = await db.update(dpBuyBoxes)
        .set(updateData)
        .where(eq(dpBuyBoxes.id, id))
        .returning();

      if (!updated) return res.status(404).json({ error: 'Buy box not found' });
      return res.json({ buyBox: updated });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: 'Failed to update buy box', detail: message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const [deleted] = await db.delete(dpBuyBoxes)
        .where(eq(dpBuyBoxes.id, id))
        .returning();
      if (!deleted) return res.status(404).json({ error: 'Buy box not found' });
      return res.json({ deleted: true, id: deleted.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: 'Failed to delete buy box', detail: message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
