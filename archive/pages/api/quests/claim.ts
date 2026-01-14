import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const QUEST_REWARDS: Record<string, { xpReward: number; axmReward: number; creditBoost: number }> = {
  'welcome': { xpReward: 100, axmReward: 25, creditBoost: 15 },
  'first_contribution': { xpReward: 200, axmReward: 50, creditBoost: 25 },
  'week_streak': { xpReward: 150, axmReward: 30, creditBoost: 10 },
  'invite_friend': { xpReward: 300, axmReward: 100, creditBoost: 20 },
  'complete_cycle': { xpReward: 500, axmReward: 150, creditBoost: 50 },
  'lock_veaxm': { xpReward: 400, axmReward: 75, creditBoost: 35 },
  'vote_3': { xpReward: 250, axmReward: 60, creditBoost: 20 },
  'month_streak': { xpReward: 750, axmReward: 200, creditBoost: 75 },
  'lead_group': { xpReward: 600, axmReward: 250, creditBoost: 40 },
  'create_proposal': { xpReward: 1000, axmReward: 500, creditBoost: 100 },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { questId, walletAddress } = req.body;
  if (!questId || !walletAddress) {
    return res.status(400).json({ error: 'Quest ID and wallet address required' });
  }

  try {
    const userResult = await pool.query(
      `SELECT id FROM users WHERE LOWER(wallet_address) = LOWER($1)`,
      [walletAddress]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResult.rows[0].id;
    const rewards = QUEST_REWARDS[questId];

    if (!rewards) {
      return res.status(400).json({ error: 'Invalid quest ID' });
    }

    const existingProgress = await pool.query(
      `SELECT status FROM user_quest_progress WHERE user_id = $1 AND quest_id = $2`,
      [userId, questId]
    );

    if (existingProgress.rows.length > 0 && existingProgress.rows[0].status === 'claimed') {
      return res.status(400).json({ error: 'Quest already claimed' });
    }

    if (existingProgress.rows.length > 0 && existingProgress.rows[0].status !== 'completed') {
      return res.status(400).json({ error: 'Quest not completed yet' });
    }

    await pool.query(
      `UPDATE user_quest_progress 
       SET status = 'claimed', xp_earned = $3, axm_earned = $4, claimed_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND quest_id = $2`,
      [userId, questId, rewards.xpReward, rewards.axmReward]
    );

    return res.status(200).json({
      success: true,
      message: 'Quest reward claimed successfully',
      rewards,
    });
  } catch (error) {
    console.error('Claim quest error:', error);
    return res.status(500).json({ error: 'Failed to claim quest reward' });
  }
}
