import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await pool.query(`
      SELECT
        pav.id,
        pav.deal_id,
        pav.outcome_id,
        pav.metric_key,
        pav.predicted_value,
        pav.actual_value,
        pav.variance_value,
        pav.variance_pct,
        pav.interpretation,
        pav.created_at,
        rd.deal_name
      FROM prediction_actual_variances pav
      LEFT JOIN re_deals rd ON rd.id = pav.deal_id
      ORDER BY pav.created_at DESC
      LIMIT 200
    `);

    return res.status(200).json({ variances: result.rows });
  } catch (err: any) {
    console.error('GET /api/founder-ops/variances error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
