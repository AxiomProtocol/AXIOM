import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from '../../../lib/db';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ message: 'Address required' });
  }

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM dex_liquidity_rewards
        WHERE LOWER(provider_address) = LOWER($1)
        ORDER BY created_at DESC
      `, [address]);

      const rewards = result.rows.map(row => ({
        id: row.id,
        poolAddress: row.pool_address,
        lpTokenBalance: row.lp_token_balance,
        sharePercentage: row.share_percentage,
        rewardsEarned: row.rewards_earned,
        rewardsClaimed: row.rewards_claimed,
        pendingRewards: row.pending_rewards,
        bonusMultiplier: row.bonus_multiplier,
        lockPeriodDays: row.lock_period_days,
        lockEndDate: row.lock_end_date,
        lastClaimDate: row.last_claim_date
      }));

      const totalPending = rewards.reduce((sum, r) => sum + parseFloat(r.pendingRewards || '0'), 0);
      const totalEarned = rewards.reduce((sum, r) => sum + parseFloat(r.rewardsEarned || '0'), 0);
      const totalClaimed = rewards.reduce((sum, r) => sum + parseFloat(r.rewardsClaimed || '0'), 0);

      res.json({
        rewards,
        summary: {
          totalPending: totalPending.toFixed(8),
          totalEarned: totalEarned.toFixed(8),
          totalClaimed: totalClaimed.toFixed(8),
          positionCount: rewards.length
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching liquidity rewards:', error);
    res.status(500).json({ message: 'Failed to fetch rewards', error: error.message });
  }
}
