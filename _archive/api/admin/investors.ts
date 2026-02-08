import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const investors = await pool.query(
      `SELECT 
        pi.id, pi.email, pi.name, pi.phone, 
        pi.accreditation_status, pi.kyc_status,
        pi.last_login, pi.created_at,
        ppc.portal_name, ppc.partner_email
       FROM portal_investors pi
       JOIN partner_portal_config ppc ON pi.portal_id = ppc.id
       ORDER BY pi.created_at DESC`
    );

    const portals = await pool.query(
      `SELECT 
        ppc.portal_name, ppc.partner_email,
        COUNT(pi.id) as investor_count
       FROM partner_portal_config ppc
       LEFT JOIN portal_investors pi ON pi.portal_id = ppc.id
       GROUP BY ppc.id, ppc.portal_name, ppc.partner_email
       ORDER BY investor_count DESC`
    );

    return res.status(200).json({
      investors: investors.rows,
      portals: portals.rows.map(p => ({
        ...p,
        investor_count: parseInt(p.investor_count)
      })),
    });
  } catch (error) {
    console.error('Error fetching admin investors:', error);
    return res.status(500).json({ error: 'Failed to fetch investors' });
  }
}
