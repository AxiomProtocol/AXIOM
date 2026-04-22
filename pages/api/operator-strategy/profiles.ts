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
      SELECT
        osp.operator_wallet,
        osp.strategy_type,
        osp.asset_class,
        osp.market,
        osp.observations,
        COUNT(DISTINCT oss.deal_id)::int                        AS deal_count,
        COUNT(oss.id)::int                                      AS signal_count,
        ROUND(AVG(oss.capex_per_unit)::numeric, 2)              AS avg_capex_per_unit,
        ROUND(AVG(oss.rent_lift)::numeric, 2)                   AS avg_rent_lift,
        ROUND(AVG(oss.noi_lift)::numeric, 2)                    AS avg_noi_lift,
        ROUND(AVG(oss.stabilization_days)::numeric, 1)          AS avg_stabilization_days,
        ROUND(AVG(oss.confidence)::numeric, 4)                  AS avg_confidence,
        MAX(oss.created_at)                                     AS last_signal_at,

        COUNT(DISTINCT vpo.id) FILTER (WHERE vpo.status = 'approved')::int
                                                                AS approved_outcomes,
        COUNT(DISTINCT vpo.id) FILTER (WHERE vpo.status IN ('approved','rejected'))::int
                                                                AS reviewed_outcomes,

        ROUND(
          CASE WHEN COUNT(DISTINCT vpo.id) FILTER (WHERE vpo.status IN ('approved','rejected')) > 0
            THEN (
              COUNT(DISTINCT vpo.id) FILTER (WHERE vpo.status = 'approved')::numeric
              / COUNT(DISTINCT vpo.id) FILTER (WHERE vpo.status IN ('approved','rejected'))::numeric
            ) * 100
            ELSE NULL
          END, 1
        ) AS success_rate_pct,

        ROUND(AVG(
          CASE WHEN pav.metric_key = 'rehab_cost' AND pav.predicted_value IS NOT NULL AND pav.predicted_value <> 0
            THEN ABS(pav.variance_pct)
          END
        )::numeric, 2) AS avg_cost_error_pct,

        ROUND(AVG(
          CASE WHEN pav.metric_key = 'timeline_days' AND pav.predicted_value IS NOT NULL AND pav.predicted_value <> 0
            THEN ABS(pav.variance_pct)
          END
        )::numeric, 2) AS avg_timeline_error_pct,

        ROUND(AVG(
          CASE WHEN pav.metric_key = 'total_return' AND pav.predicted_value IS NOT NULL AND pav.predicted_value <> 0
            THEN pav.variance_pct
          END
        )::numeric, 4) AS avg_roi_variance_pct

      FROM operator_strategy_profiles osp
      LEFT JOIN operator_strategy_signals oss ON oss.profile_id = osp.id
      LEFT JOIN re_deals rd ON rd.id = oss.deal_id AND rd.created_by_wallet ILIKE osp.operator_wallet
      LEFT JOIN verified_project_outcomes vpo ON vpo.deal_id = rd.id
      LEFT JOIN prediction_actual_variances pav ON pav.outcome_id = vpo.id
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
