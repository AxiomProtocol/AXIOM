import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const result = await pool.query(`
      SELECT *
      FROM land_governance_proposals
      ORDER BY created_at DESC
    `);

    return res.status(200).json({
      success: true,
      proposals: result.rows,
      total: result.rows.length,
    });
  } catch (error: any) {
    console.error('Governance proposals fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch governance proposals',
      details: error.message,
    });
  }
}
