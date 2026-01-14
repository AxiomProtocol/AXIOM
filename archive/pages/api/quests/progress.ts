import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MILESTONE_QUESTS = [
  { id: 'welcome', title: 'Welcome to Axiom', description: 'Complete your profile and join a group', category: 'onboarding', xpReward: 100, axmReward: 25, creditBoost: 15, maxProgress: 1, icon: '👋', tier: 'starter' },
  { id: 'first_contribution', title: 'First Contribution', description: 'Make your first SUSU contribution', category: 'susu', xpReward: 200, axmReward: 50, creditBoost: 25, maxProgress: 1, icon: '💰', tier: 'starter' },
  { id: 'week_streak', title: 'Weekly Warrior', description: 'Login for 7 consecutive days', category: 'community', xpReward: 150, axmReward: 30, creditBoost: 10, maxProgress: 7, icon: '🔥', tier: 'starter' },
  { id: 'invite_friend', title: 'Community Builder', description: 'Invite 3 friends who join', category: 'community', xpReward: 300, axmReward: 100, creditBoost: 20, maxProgress: 3, icon: '👥', tier: 'builder' },
  { id: 'complete_cycle', title: 'Full Circle', description: 'Complete an entire SUSU rotation', category: 'susu', xpReward: 500, axmReward: 150, creditBoost: 50, maxProgress: 1, icon: '🎯', tier: 'builder' },
  { id: 'lock_veaxm', title: 'Diamond Hands', description: 'Lock 1000 AXM in Wealth Engine', category: 'staking', xpReward: 400, axmReward: 75, creditBoost: 35, maxProgress: 1000, icon: '💎', tier: 'builder' },
  { id: 'vote_3', title: 'Active Citizen', description: 'Vote on 3 governance proposals', category: 'governance', xpReward: 250, axmReward: 60, creditBoost: 20, maxProgress: 3, icon: '🗳️', tier: 'builder' },
  { id: 'month_streak', title: 'Consistency Champion', description: 'Make on-time payments for 3 months', category: 'susu', xpReward: 750, axmReward: 200, creditBoost: 75, maxProgress: 3, icon: '🏆', tier: 'champion' },
  { id: 'lead_group', title: 'Circle Leader', description: 'Become an organizer of a SUSU circle', category: 'community', xpReward: 600, axmReward: 250, creditBoost: 40, maxProgress: 1, icon: '👑', tier: 'champion' },
  { id: 'create_proposal', title: 'Governance Pioneer', description: 'Create an approved governance proposal', category: 'governance', xpReward: 1000, axmReward: 500, creditBoost: 100, maxProgress: 1, icon: '⚡', tier: 'legend' },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  try {
    const userResult = await pool.query(
      `SELECT id FROM users WHERE LOWER(wallet_address) = LOWER($1)`,
      [address]
    );

    let userProgress: Record<string, { progress: number; status: string }> = {};
    let totalXp = 0;

    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;

      const progressResult = await pool.query(
        `SELECT quest_id, progress, status FROM user_quest_progress WHERE user_id = $1`,
        [userId]
      );

      progressResult.rows.forEach(row => {
        userProgress[row.quest_id] = { progress: row.progress, status: row.status };
      });

      const xpResult = await pool.query(
        `SELECT COALESCE(SUM(xp_earned), 0) as total_xp FROM user_quest_progress WHERE user_id = $1 AND status = 'claimed'`,
        [userId]
      );
      totalXp = parseInt(xpResult.rows[0]?.total_xp || '0');

      const referralCount = await pool.query(
        `SELECT COUNT(*) as count FROM referrals WHERE referrer_id = $1`,
        [userId]
      );
      const referrals = parseInt(referralCount.rows[0]?.count || '0');

      const groupMembership = await pool.query(
        `SELECT COUNT(*) as count FROM susu_group_members WHERE user_id = $1`,
        [userId]
      );
      const hasJoinedGroup = parseInt(groupMembership.rows[0]?.count || '0') > 0;

      if (hasJoinedGroup && !userProgress['welcome']) {
        userProgress['welcome'] = { progress: 1, status: 'completed' };
      }

      if (referrals > 0) {
        userProgress['invite_friend'] = { 
          progress: Math.min(referrals, 3), 
          status: referrals >= 3 ? 'completed' : 'active' 
        };
      }
    }

    const quests = MILESTONE_QUESTS.map((quest, index) => {
      const progress = userProgress[quest.id];
      
      let status: 'locked' | 'active' | 'completed' | 'claimed' = 'locked';
      let currentProgress = 0;

      if (progress) {
        currentProgress = progress.progress;
        status = progress.status as any;
      } else {
        if (index < 3) {
          status = 'active';
        }
      }

      return {
        ...quest,
        progress: currentProgress,
        status,
      };
    });

    return res.status(200).json({
      success: true,
      quests,
      totalXp,
    });
  } catch (error) {
    console.error('Quest progress error:', error);
    return res.status(500).json({ error: 'Failed to fetch quest progress' });
  }
}
