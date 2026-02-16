import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM susu_interest_hubs WHERE is_active = true ORDER BY member_count DESC`
    );

    return res.status(200).json({
      success: true,
      hubs: result.rows,
      total: result.rows.length,
    });
  } catch (error: any) {
    console.error('Wealth Practice hubs error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch interest hubs',
    });
  }
}
