import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const result = await pool.query(`
      SELECT
        osp.operator_wallet,
        osp.strategy_type,
        osp.asset_class,
        osp.market,
        osp.observations,
        COUNT(oss.id)::int                       AS signal_count,
        ROUND(AVG(oss.capex_per_unit)::numeric, 2) AS avg_capex_per_unit,
        ROUND(AVG(oss.rent_lift)::numeric, 2)      AS avg_rent_lift,
        ROUND(AVG(oss.noi_lift)::numeric, 2)       AS avg_noi_lift,
        ROUND(AVG(oss.stabilization_days)::numeric, 1) AS avg_stabilization_days,
        ROUND(AVG(oss.confidence)::numeric, 4)     AS avg_confidence,
        COUNT(DISTINCT oss.deal_id)::int           AS deal_count,
        MAX(oss.created_at)                        AS last_signal_at
      FROM operator_strategy_profiles osp
      LEFT JOIN operator_strategy_signals oss ON oss.profile_id = osp.id
      GROUP BY
        osp.id,
        osp.operator_wallet,
        osp.strategy_type,
        osp.asset_class,
        osp.market,
        osp.observations
      ORDER BY osp.operator_wallet, osp.strategy_type
    `);

    return res.status(200).json({
      success: true,
      profiles: result.rows,
      count: result.rows.length,
    });
  } catch (error: any) {
    console.error('[operator-strategy/profiles] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
