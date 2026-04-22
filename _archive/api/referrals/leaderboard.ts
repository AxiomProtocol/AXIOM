import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await pool.query(`
      SELECT 
        referrer_address as address,
        COUNT(*) as count,
        SUM(CAST(reward_amount AS DECIMAL)) as earned
      FROM referral_reward_claims
      WHERE referrer_address IS NOT NULL
      GROUP BY referrer_address
      ORDER BY count DESC
      LIMIT 10
    `);

    const leaderboard = result.rows.map(row => ({
      address: row.address,
      count: parseInt(row.count) || 0,
      earned: parseFloat(row.earned || 0).toLocaleString()
    }));

    if (leaderboard.length === 0) {
      return res.status(200).json({
        success: true,
        leaderboard: [],
        message: 'Be the first to refer friends and top the leaderboard!'
      });
    }

    return res.status(200).json({
      success: true,
      leaderboard
    });
  } catch (error: any) {
    console.error('Leaderboard error:', error);
    return res.status(200).json({
      success: true,
      leaderboard: [],
      message: 'Leaderboard coming soon'
    });
  }
}
