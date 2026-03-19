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

  const { dealId, offeringId, limit: limitParam } = req.query;
  const limit = Math.min(parseInt(String(limitParam || '50')), 200);

  const conditions: string[] = [];
  const params: any[] = [];

  if (dealId) {
    params.push(dealId);
    conditions.push(`cie.deal_id = $${params.length}`);
  }

  if (offeringId) {
    params.push(offeringId);
    conditions.push(`cie.offering_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(limit);
  const limitClause = `LIMIT $${params.length}`;

  try {
    const result = await pool.query(
      `SELECT
         cie.id,
         cie.deal_id,
         cie.offering_id,
         cie.event_type,
         cie.capital_source_type,
         cie.raise_velocity,
         cie.minimum_capital_met,
         cie.investor_demand_score,
         cie.lender_path_chosen,
         cie.refi_outcome,
         cie.payload,
         cie.created_at,
         COALESCE(rp.address_raw, d.deal_name) AS deal_address,
         o.name AS offering_name
       FROM capital_intelligence_events cie
       LEFT JOIN re_deals d ON d.id = cie.deal_id
       LEFT JOIN re_properties rp ON rp.id = d.property_id
       LEFT JOIN syn_offerings o ON o.id::text = cie.offering_id::text
       ${whereClause}
       ORDER BY cie.created_at DESC
       ${limitClause}`,
      params
    );

    return res.status(200).json({
      success: true,
      events: result.rows,
      count: result.rows.length,
    });
  } catch (error: any) {
    console.error('[capital-intelligence/events] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
