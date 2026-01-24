import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function validateInvestorToken(token: string): Promise<{ investorId: number } | null> {
  try {
    const result = await pool.query(
      `SELECT investor_id FROM investor_sessions 
       WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );
    if (result.rows.length === 0) return null;
    return { investorId: result.rows[0].investor_id };
  } catch (error) {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  const token = authHeader.substring(7);
  const session = await validateInvestorToken(token);
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const { slug } = req.query;

  if (!slug) {
    return res.status(400).json({ error: 'Missing portal slug' });
  }

  try {
    const investor = await pool.query(
      `SELECT pi.id, pi.name, pi.portal_id 
       FROM portal_investors pi
       JOIN partner_portal_config ppc ON pi.portal_id = ppc.id
       WHERE pi.id = $1 AND ppc.portal_slug = $2`,
      [session.investorId, slug]
    );

    if (investor.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const investments = await pool.query(
      `SELECT pi.id, pi.investment_amount, pi.investment_date, pi.status, 
              pi.distributions_paid, pds.property_type as deal_name
       FROM portal_investments pi
       LEFT JOIN partner_deal_submissions pds ON pi.deal_id = pds.id
       WHERE pi.investor_id = $1
       ORDER BY pi.created_at DESC`,
      [session.investorId]
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
