import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { sentinelRegimeSnapshots } from '../../../../shared/agentGovSchema';
import { desc } from 'drizzle-orm';

const AME_REGIME_MAP: Record<string, string> = {
  TREND_UP: 'STABLE',
  RANGE_LOW_VOL: 'STABLE',
  TREND_DOWN: 'CAUTION',
  HIGH_VOL_DISLOCATION: 'STRESS',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const rows = await db.select()
    .from(sentinelRegimeSnapshots)
    .orderBy(desc(sentinelRegimeSnapshots.createdAt))
    .limit(1);

  if (rows.length === 0) {
    return res.json({
      regime: 'STABLE',
      band: 'STABLE',
      source: 'default',
      snapshot: null,
    });
  }

  const row = rows[0];
  const band = AME_REGIME_MAP[row.regime] || 'STABLE';

  return res.json({
    regime: row.regime,
    band,
    source: 'sentinel',
    confidence: row.confidence,
    snapshot: {
      id: row.id,
      createdAt: row.createdAt,
      sma20Slope: row.sma20Slope,
      sma50Slope: row.sma50Slope,
      volatility20d: row.volatility20d,
      volatilityRatio: row.volatilityRatio,
      breadthScore: row.breadthScore,
      notes: row.notes,
    },
  });
}
