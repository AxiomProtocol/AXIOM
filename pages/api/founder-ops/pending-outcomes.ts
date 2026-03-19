import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const outcomesRes = await pool.query(
      `SELECT vpo.*, rd.deal_name, rp.address as property_address
       FROM verified_project_outcomes vpo
       LEFT JOIN re_deals rd ON rd.id = vpo.deal_id
       LEFT JOIN re_properties rp ON rp.id = (
         SELECT property_id FROM re_deal_scenarios WHERE deal_id = vpo.deal_id LIMIT 1
       )
       WHERE vpo.status = 'under_review'
       ORDER BY vpo.submitted_at DESC
       LIMIT 50`
    );

    const outcomes = outcomesRes.rows;

    for (const outcome of outcomes) {
      const varianceRes = await pool.query(
        `SELECT metric_key, predicted_value, actual_value, variance_value, variance_pct
         FROM prediction_actual_variances
         WHERE outcome_id = $1
         ORDER BY metric_key`,
        [outcome.id]
      );
      outcome.variances = varianceRes.rows;
    }

    return res.status(200).json({
      outcomes,
      count: outcomes.length,
    });
  } catch (err: any) {
    console.error('GET /api/founder-ops/pending-outcomes error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
