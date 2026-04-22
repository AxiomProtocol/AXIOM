import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';
import { getSIWESession } from '../../../lib/middleware/siweAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  try {
    const result = await pool.query(`
      SELECT *
      FROM network_intelligence_snapshots
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const marketCostResult = await pool.query(`
      SELECT
        strategy_type,
        market,
        SUM(capex_per_unit::numeric * sample_size::numeric)
          / NULLIF(SUM(sample_size::numeric), 0)                 AS avg_capex_per_unit,
        SUM(confidence::numeric * sample_size::numeric)
          / NULLIF(SUM(sample_size::numeric), 0)                 AS avg_confidence,
        SUM(sample_size)::int                                    AS total_sample_size,
        COUNT(*)::int                                            AS signal_count
      FROM market_cost_signals
      WHERE capex_per_unit IS NOT NULL
      GROUP BY strategy_type, market
      ORDER BY strategy_type, market
    `);

    const currentSignals = marketCostResult.rows.map((r: any) => ({
      strategy_type: r.strategy_type,
      market: r.market || 'global',
      avg_capex_per_unit: r.avg_capex_per_unit ? parseFloat(r.avg_capex_per_unit).toFixed(2) : null,
      avg_confidence: r.avg_confidence ? parseFloat(r.avg_confidence).toFixed(4) : '0.0000',
      total_sample_size: r.total_sample_size,
      signal_count: r.signal_count,
    }));

    if (result.rows.length === 0) {
      return res.status(200).json({ success: true, snapshot: null, currentSignals });
    }

    return res.status(200).json({
      success: true,
      snapshot: result.rows[0],
      currentSignals,
    });
  } catch (error: any) {
    console.error('[network-intelligence/latest] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
