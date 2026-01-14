import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';
import { isDatabaseConfigured } from '../../../lib/envValidation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ message: 'Address required' });
  }

  if (!isDatabaseConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Database not configured',
      rewards: [],
      summary: { totalPending: '0', totalEarned: '0', totalClaimed: '0', positionCount: 0 }
    });
  }

  let client;
  try {
    client = await pool.connect();
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
  } catch (error: any) {
    console.error('Error fetching liquidity rewards:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch rewards', 
      rewards: [],
      summary: { totalPending: '0', totalEarned: '0', totalClaimed: '0', positionCount: 0 }
    });
  } finally {
    if (client) {
      client.release();
    }
  }
}
