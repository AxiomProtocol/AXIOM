import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email, property_type, property_address, 
              deal_value, status, partner_role, recommended_primary, created_at
       FROM partner_deal_submissions
       ORDER BY created_at DESC`
    );

    const statusCounts = await pool.query(
      `SELECT status, COUNT(*) as count 
       FROM partner_deal_submissions 
       GROUP BY status`
    );

    return res.status(200).json({
      deals: result.rows,
      statusCounts: statusCounts.rows.reduce((acc: Record<string, number>, row: any) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {}),
    });
  } catch (error) {
    console.error('Error fetching deals:', error);
    return res.status(500).json({ error: 'Failed to fetch deals' });
  }
}
