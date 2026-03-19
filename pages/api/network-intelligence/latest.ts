import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const result = await pool.query(`
      SELECT *
      FROM network_intelligence_snapshots
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(200).json({ success: true, snapshot: null });
    }

    const snapshot = result.rows[0];

    const marketCostResult = await pool.query(`
      SELECT
        strategy_type,
        market,
        ROUND(AVG(capex_per_unit)::numeric, 2)  AS avg_capex_per_unit,
        ROUND(AVG(confidence)::numeric, 4)       AS avg_confidence,
        SUM(sample_size)::int                    AS total_sample_size,
        COUNT(*)::int                            AS signal_count
      FROM market_cost_signals
      WHERE capex_per_unit IS NOT NULL
      GROUP BY strategy_type, market
      ORDER BY strategy_type, market
    `);

    return res.status(200).json({
      success: true,
      snapshot,
      currentSignals: marketCostResult.rows,
    });
  } catch (error: any) {
    console.error('[network-intelligence/latest] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
