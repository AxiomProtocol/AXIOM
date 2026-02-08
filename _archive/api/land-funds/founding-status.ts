import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

const TOTAL_FOUNDING_SPOTS = 10000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM land_fund_founding_members WHERE status = $1',
      ['active']
    );

    const claimed = parseInt(result.rows[0].count) || 0;
    const remaining = Math.max(0, TOTAL_FOUNDING_SPOTS - claimed);
    const percentageClaimed = ((claimed / TOTAL_FOUNDING_SPOTS) * 100).toFixed(1);

    res.status(200).json({
      total: TOTAL_FOUNDING_SPOTS,
      claimed,
      remaining,
      percentageClaimed,
      isAvailable: remaining > 0
    });

  } catch (error: any) {
    console.error('Founding status error:', error);
    res.status(200).json({
      total: TOTAL_FOUNDING_SPOTS,
      claimed: 0,
      remaining: TOTAL_FOUNDING_SPOTS,
      percentageClaimed: '0',
      isAvailable: true
    });
  }
}
