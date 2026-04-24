import type { NextApiRequest, NextApiResponse } from 'next';
import { getEstimateWithLines } from '../../../../../server/services/cost-intelligence/engine';
import { pool } from '../../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const estimateId = Array.isArray(req.query.estimateId)
    ? req.query.estimateId[0]
    : req.query.estimateId;
  if (!estimateId) return res.status(400).json({ error: 'estimateId required' });

  try {
    if (req.method === 'GET') {
      const estimate = await getEstimateWithLines(estimateId);
      if (!estimate) return res.status(404).json({ error: 'Estimate not found' });
      return res.json({ estimate });
    }

    if (req.method === 'PATCH') {
      const allowed = [
        'estimate_name', 'region_code', 'total_units', 'avg_unit_sqft',
        'contingency_pct', 'soft_cost_pct', 'labor_adj_pct', 'material_adj_pct',
        'arv_estimate', 'notes', 'status',
      ];
      const body = req.body || {};
      const sets: string[] = [];
      const values: any[] = [];
      let idx = 1;

      for (const key of allowed) {
        const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        if (body[camel] !== undefined) {
          sets.push(`${key} = $${idx++}`);
          values.push(body[camel]);
        } else if (body[key] !== undefined) {
          sets.push(`${key} = $${idx++}`);
          values.push(body[key]);
        }
      }

      if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
      sets.push(`updated_at = NOW()`);
      values.push(estimateId);

      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          `UPDATE cost_estimates SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
          values,
        );
        return res.json({ estimate: rows[0] });
      } finally {
        client.release();
      }
    }

    if (req.method === 'DELETE') {
      const client = await pool.connect();
      try {
        await client.query('DELETE FROM cost_estimates WHERE id = $1', [estimateId]);
        return res.json({ ok: true });
      } finally {
        client.release();
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
