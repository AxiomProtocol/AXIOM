import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from '../../../lib/db';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const TIER_CONFIG = {
  bronze: { minStake: 0, apy: 5, icon: '🥉' },
  silver: { minStake: 1000, apy: 8, icon: '🥈' },
  gold: { minStake: 5000, apy: 12, icon: '🥇' },
  platinum: { minStake: 25000, apy: 18, icon: '💎' },
  diamond: { minStake: 100000, apy: 25, icon: '👑' }
};

function calculateTier(stakedAmount: number): string {
  if (stakedAmount >= TIER_CONFIG.diamond.minStake) return 'diamond';
  if (stakedAmount >= TIER_CONFIG.platinum.minStake) return 'platinum';
  if (stakedAmount >= TIER_CONFIG.gold.minStake) return 'gold';
  if (stakedAmount >= TIER_CONFIG.silver.minStake) return 'silver';
  return 'bronze';
}

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
      const positionsResult = await client.query(`
        SELECT * FROM depin_staking_positions
        WHERE LOWER(operator_address) = LOWER($1)
        ORDER BY created_at DESC
      `, [address]);

      const nodesResult = await client.query(`
        SELECT * FROM depin_nodes
        WHERE LOWER(operator_address) = LOWER($1)
      `, [address]);

      const positions = positionsResult.rows.map(row => ({
        id: row.id,
        nodeId: row.node_id,
        stakedAmount: row.staked_amount,
        tier: row.tier,
        apyRate: row.apy_rate,
        rewardsEarned: row.rewards_earned,
        rewardsClaimed: row.rewards_claimed,
        stakingStartDate: row.staking_start_date,
        lockEndDate: row.lock_end_date,
        isLocked: row.is_locked
      }));

      const nodes = nodesResult.rows.map(row => ({
        nodeId: row.node_id,
        nodeTier: row.node_tier,
        stakedAmount: row.staked_amount_axm || '0',
        status: row.status
      }));

      const totalStaked = nodes.reduce((sum, n) => sum + parseFloat(n.stakedAmount || '0'), 0);
      const currentTier = calculateTier(totalStaked);
      const tierInfo = TIER_CONFIG[currentTier as keyof typeof TIER_CONFIG];

      const totalRewardsEarned = positions.reduce((sum, p) => sum + parseFloat(p.rewardsEarned || '0'), 0);
      const pendingRewards = positions.reduce((sum, p) => 
        sum + (parseFloat(p.rewardsEarned || '0') - parseFloat(p.rewardsClaimed || '0')), 0);

      res.json({
        positions,
        nodes,
        summary: {
          totalStaked: totalStaked.toFixed(2),
          currentTier,
          tierIcon: tierInfo.icon,
          currentApy: tierInfo.apy,
          totalRewardsEarned: totalRewardsEarned.toFixed(8),
          pendingRewards: pendingRewards.toFixed(8),
          nodeCount: nodes.length
        },
        tierConfig: TIER_CONFIG
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching staking positions:', error);
    res.status(500).json({ message: 'Failed to fetch positions', error: error.message });
  }
}
