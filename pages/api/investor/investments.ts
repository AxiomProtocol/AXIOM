import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug, email } = req.query;

  if (!slug || !email) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const portal = await pool.query(
      'SELECT id FROM partner_portal_config WHERE portal_slug = $1',
      [slug]
    );

    if (portal.rows.length === 0) {
      return res.status(404).json({ error: 'Portal not found' });
    }

    const investor = await pool.query(
      'SELECT id, name FROM portal_investors WHERE portal_id = $1 AND email = $2',
      [portal.rows[0].id, email]
    );

    if (investor.rows.length === 0) {
      return res.status(404).json({ error: 'Investor not found' });
    }

    const investments = await pool.query(
      `SELECT pi.id, pi.investment_amount, pi.investment_date, pi.status, 
              pi.distributions_paid, pds.property_type as deal_name
       FROM portal_investments pi
       LEFT JOIN partner_deal_submissions pds ON pi.deal_id = pds.id
       WHERE pi.investor_id = $1
       ORDER BY pi.created_at DESC`,
      [investor.rows[0].id]
    );

    return res.status(200).json({
      investments: investments.rows,
      investorName: investor.rows[0].name,
    });
  } catch (error) {
    console.error('Error fetching investments:', error);
    return res.status(500).json({ error: 'Failed to fetch investments' });
  }
}
