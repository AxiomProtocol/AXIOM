import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { reservePositions } from '../../../shared/treasurySchema';
import { desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10), 100);
    const rows = await db
      .select()
      .from(reservePositions)
      .orderBy(desc(reservePositions.snapshotAt))
      .limit(limit);

    const assetLatest = new Map<string, typeof rows[0]>();
    for (const row of rows) {
      if (!assetLatest.has(row.assetSymbol)) assetLatest.set(row.assetSymbol, row);
    }

    const latest = Array.from(assetLatest.values());

    return res.status(200).json({
      success: true,
      data: latest.map((p) => ({
        id: p.id,
        assetSymbol: p.assetSymbol,
        positionType: p.positionType,
        quantity: p.quantity,
        markPrice: p.markPrice,
        usdValue: p.usdValue,
        valuationSource: p.valuationSource,
        valuationConfidence: p.valuationConfidence,
        snapshotAt: p.snapshotAt?.toISOString() ?? null,
      })),
      count: latest.length,
      allPositions: rows.length,
    });
  } catch (err: any) {
    console.error('[api/reserves/positions]', err?.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch reserve positions' });
  }
}
