import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MISSION_REWARDS: Record<string, { reward: number; rewardType: string }> = {
  'complete_onboarding': { reward: 50, rewardType: 'AXM' },
  'invite_1': { reward: 100, rewardType: 'AXM' },
  'invite_5': { reward: 500, rewardType: 'AXM' },
  'friend_joins_susu': { reward: 250, rewardType: 'AXM' },
  'group_milestone': { reward: 1000, rewardType: 'AXM' },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { missionId, walletAddress } = req.body;
  if (!missionId || !walletAddress) {
    return res.status(400).json({ error: 'Mission ID and wallet address required' });
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
    const rewards = MISSION_REWARDS[missionId];

    if (!rewards) {
      return res.status(400).json({ error: 'Invalid mission ID' });
    }

    const existingProgress = await pool.query(
      `SELECT status FROM social_mission_progress WHERE user_id = $1 AND mission_id = $2`,
      [userId, missionId]
    );

    if (existingProgress.rows.length > 0 && existingProgress.rows[0].status === 'claimed') {
      return res.status(400).json({ error: 'Mission already claimed' });
    }

    await pool.query(
      `INSERT INTO social_mission_progress (user_id, mission_id, progress, status, reward_claimed, claimed_at)
       VALUES ($1, $2, 1, 'claimed', $3, NOW())
       ON CONFLICT (user_id, mission_id) 
       DO UPDATE SET status = 'claimed', reward_claimed = $3, claimed_at = NOW()`,
      [userId, missionId, rewards.reward]
    );

    if (missionId === 'invite_5') {
      const referralsResult = await pool.query(
        `SELECT id FROM users WHERE referred_by = $1 LIMIT 5`,
        [userId]
      );

      for (const referral of referralsResult.rows) {
        await pool.query(
          `INSERT INTO social_mission_progress (user_id, mission_id, progress, status, reward_claimed, claimed_at)
           VALUES ($1, 'squad_bonus', 1, 'claimed', 100, NOW())
           ON CONFLICT (user_id, mission_id) DO NOTHING`,
          [referral.id]
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Mission reward claimed successfully',
      rewards,
    });
  } catch (error) {
    console.error('Claim mission error:', error);
    return res.status(500).json({ error: 'Failed to claim mission reward' });
  }
}
