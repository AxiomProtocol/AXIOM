import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { status, organizationId } = req.query;

      const conditions: string[] = [];
      const params: any[] = [];

      if (status) {
        params.push(status);
        conditions.push(`o.status = $${params.length}`);
      }
      if (organizationId) {
        params.push(organizationId);
        conditions.push(`o.organization_id = $${params.length}`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await pool.query(
        `SELECT o.*,
          (SELECT COUNT(*) FROM syn_pipeline p WHERE p.offering_id = o.id) as pipeline_count,
          (SELECT COUNT(*) FROM syn_subscriptions s WHERE s.offering_id = o.id) as subscription_count,
          (SELECT COALESCE(SUM(s.amount::numeric), 0) FROM syn_subscriptions s WHERE s.offering_id = o.id AND s.status IN ('approved', 'funded')) as total_committed,
          (SELECT COALESCE(SUM(f.amount::numeric), 0) FROM syn_funding_records f JOIN syn_subscriptions s2 ON f.subscription_id = s2.id WHERE s2.offering_id = o.id AND f.status = 'completed') as total_funded
         FROM syn_offerings o
         ${whereClause}
         ORDER BY o.created_at DESC
         LIMIT 50`,
        params
      );

      return res.status(200).json({
        success: true,
        offerings: result.rows,
        total: result.rows.length,
      });
    } catch (error: any) {
      console.error('[syndication] List offerings error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        name, offeringType, entityType, description, targetRaise,
        minimumInvestment, organizationId, holdPeriodYears
      } = req.body;

      if (!name || !offeringType) {
        return res.status(400).json({ success: false, error: 'name and offeringType are required' });
      }

      const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

      const result = await pool.query(
        `INSERT INTO syn_offerings (
          organization_id, name, slug, status, offering_type, entity_type,
          description, target_raise, minimum_investment, hold_period_years
        ) VALUES ($1, $2, $3, 'draft', $4::syn_offering_type, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          organizationId || null, name, slug, offeringType,
          entityType || 'spv', description || null,
          targetRaise || null, minimumInvestment || null,
          holdPeriodYears || null
        ]
      );

      return res.status(201).json({ success: true, offeringId: result.rows[0].id });
    } catch (error: any) {
      console.error('[syndication] Create offering error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
