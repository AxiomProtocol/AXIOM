import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey } from '@/src/config/adminRoles';
import { db } from '@/server/db';
import { reservePositions } from '@/shared/treasurySchema';
import { desc, eq } from 'drizzle-orm';

/**
 * GET /api/capinfra/operator/reserve-source-history
 *
 * Returns the most recent N reserve_positions snapshots for a given asset,
 * including valuation_source so operators can track which price source the
 * allocation engine used over time (CoinGecko / camelot_twap / last_known).
 *
 * Query params:
 *   asset  — asset symbol (default: AXM)
 *   limit  — number of rows to return, max 25 (default: 10)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const asset = typeof req.query.asset === 'string'
    ? req.query.asset.toUpperCase()
    : 'AXM';
  const rawLimit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 10;
  const limit = Math.min(isNaN(rawLimit) || rawLimit < 1 ? 10 : rawLimit, 25);

  try {
    const rows = await db
      .select({
        id:               reservePositions.id,
        snapshotAt:       reservePositions.snapshotAt,
        markPrice:        reservePositions.markPrice,
        valuationSource:  reservePositions.valuationSource,
        settlementStatus: reservePositions.settlementStatus,
        usdValue:         reservePositions.usdValue,
      })
      .from(reservePositions)
      .where(eq(reservePositions.assetSymbol, asset))
      .orderBy(desc(reservePositions.snapshotAt))
      .limit(limit);

    return res.status(200).json({
      success: true,
      asset,
      rows: rows.map(r => ({
        id:               r.id,
        snapshot_at:      r.snapshotAt,
        mark_price:       r.markPrice !== null ? Number(r.markPrice) : null,
        valuation_source: r.valuationSource ?? null,
        settlement_status: r.settlementStatus ?? null,
        usd_value:        r.usdValue !== null ? Number(r.usdValue) : null,
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[reserve-source-history]', msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
