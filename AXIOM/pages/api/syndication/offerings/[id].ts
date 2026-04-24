import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT o.*,
          org.name as org_name, org.legal_name as org_legal_name,
          (SELECT COUNT(*) FROM syn_pipeline p WHERE p.offering_id = o.id) as pipeline_count,
          (SELECT COUNT(*) FROM syn_subscriptions s WHERE s.offering_id = o.id) as subscription_count,
          (SELECT COALESCE(SUM(s.amount::numeric), 0) FROM syn_subscriptions s WHERE s.offering_id = o.id AND s.status IN ('approved', 'funded')) as total_committed,
          (SELECT COALESCE(SUM(f.amount::numeric), 0) FROM syn_funding_records f JOIN syn_subscriptions s2 ON f.subscription_id = s2.id WHERE s2.offering_id = o.id AND f.status = 'completed') as total_funded
         FROM syn_offerings o
         LEFT JOIN syn_organizations org ON o.organization_id = org.id
         WHERE o.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Offering not found' });
      }

      return res.status(200).json({ success: true, offering: result.rows[0] });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const updates = req.body;
      const setClauses: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      const allowedFields = [
        'name', 'status', 'offering_type', 'entity_type', 'description',
        'investment_highlights', 'target_raise', 'minimum_raise', 'maximum_raise',
        'minimum_investment', 'projected_cap_rate', 'projected_cash_on_cash',
        'projected_irr', 'projected_dscr', 'preferred_return', 'promote_split',
        'waterfall_terms', 'fee_structure', 'hold_period_years', 'governance_enabled',
        'settlement_mode', 'open_date', 'close_date', 'meta'
      ];

      for (const [key, value] of Object.entries(updates)) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (allowedFields.includes(snakeKey)) {
          params.push(typeof value === 'object' ? JSON.stringify(value) : value);
          setClauses.push(`${snakeKey} = $${paramIdx}`);
          paramIdx++;
        }
      }

      if (setClauses.length === 0) {
        return res.status(400).json({ success: false, error: 'No valid fields to update' });
      }

      params.push(id);
      setClauses.push(`updated_at = now()`);

      await pool.query(
        `UPDATE syn_offerings SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
        params
      );

      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await pool.query(`DELETE FROM syn_offerings WHERE id = $1 AND status = 'draft'`, [id]);
      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
