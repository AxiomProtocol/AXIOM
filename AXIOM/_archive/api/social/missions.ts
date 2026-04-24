import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DEFAULT_MISSIONS = [
  { id: 'complete_onboarding', title: 'Complete Onboarding', description: 'Finish the guided onboarding flow', requirement: 1, reward: 50, rewardType: 'AXM', icon: '🎯' },
  { id: 'invite_1', title: 'First Friend', description: 'Invite your first friend to join', requirement: 1, reward: 100, rewardType: 'AXM', icon: '👤', prerequisite: 'complete_onboarding' },
  { id: 'invite_5', title: 'Squad Builder', description: 'Invite 5 friends to unlock shared rewards', requirement: 5, reward: 500, rewardType: 'AXM', icon: '👥', prerequisite: 'invite_1' },
  { id: 'friend_joins_susu', title: 'Circle Catalyst', description: 'Have a referred friend join a SUSU circle', requirement: 1, reward: 250, rewardType: 'AXM', icon: '🔄', prerequisite: 'invite_1' },
  { id: 'group_milestone', title: 'Collective Power', description: 'Your referral network reaches 25 members', requirement: 25, reward: 1000, rewardType: 'AXM', icon: '🚀', prerequisite: 'invite_5' },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet } = req.query;

  try {
    let userProgress: Record<string, { progress: number; status: string }> = {};
    let shareCode = '';
    let referralCount = 0;

    if (wallet) {
      const userResult = await pool.query(
        `SELECT id, referral_code FROM users WHERE LOWER(wallet_address) = LOWER($1)`,
        [wallet]
      );

      if (userResult.rows.length > 0) {
        const userId = userResult.rows[0].id;
        shareCode = userResult.rows[0].referral_code || generateReferralCode();

        if (!userResult.rows[0].referral_code) {
          await pool.query(
            `UPDATE users SET referral_code = $1 WHERE id = $2`,
            [shareCode, userId]
          );
        }

        const referralResult = await pool.query(
          `SELECT COUNT(*) as count FROM users WHERE referred_by = $1`,
          [userId]
        );
        referralCount = parseInt(referralResult.rows[0]?.count || '0');

        const progressResult = await pool.query(
          `SELECT mission_id, progress, status FROM social_mission_progress WHERE user_id = $1`,
          [userId]
        );

        for (const row of progressResult.rows) {
          userProgress[row.mission_id] = { progress: row.progress, status: row.status };
        }

        const onboardingComplete = await checkOnboardingComplete(userId);
        if (onboardingComplete) {
          userProgress['complete_onboarding'] = { progress: 1, status: userProgress['complete_onboarding']?.status === 'claimed' ? 'claimed' : 'completed' };
        }

        userProgress['invite_1'] = { 
          progress: Math.min(referralCount, 1), 
          status: referralCount >= 1 ? (userProgress['invite_1']?.status === 'claimed' ? 'claimed' : 'completed') : 'in_progress'
        };
        userProgress['invite_5'] = { 
          progress: Math.min(referralCount, 5), 
          status: referralCount >= 5 ? (userProgress['invite_5']?.status === 'claimed' ? 'claimed' : 'completed') : 'in_progress'
        };
        userProgress['group_milestone'] = { 
          progress: Math.min(referralCount, 25), 
          status: referralCount >= 25 ? (userProgress['group_milestone']?.status === 'claimed' ? 'claimed' : 'completed') : 'in_progress'
        };
      }
    }

    const missions = DEFAULT_MISSIONS.map(mission => {
      const progress = userProgress[mission.id]?.progress || 0;
      const savedStatus = userProgress[mission.id]?.status;
      
      let status: 'locked' | 'in_progress' | 'completed' | 'claimed' = 'locked';
      
      if (savedStatus === 'claimed') {
        status = 'claimed';
      } else if (mission.prerequisite) {
        const prereqProgress = userProgress[mission.prerequisite];
        if (prereqProgress && (prereqProgress.status === 'completed' || prereqProgress.status === 'claimed')) {
          status = progress >= mission.requirement ? 'completed' : 'in_progress';
        }
      } else {
        status = progress >= mission.requirement ? 'completed' : 'in_progress';
      }

      return { ...mission, progress, status };
    });

    return res.status(200).json({ missions, shareCode });
  } catch (error) {
    console.error('Social missions error:', error);
    return res.status(200).json({ 
      missions: DEFAULT_MISSIONS.map(m => ({ ...m, progress: 0, status: 'in_progress' as const })),
      shareCode: '' 
    });
  }
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'AXM';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function checkOnboardingComplete(userId: number): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT onboarding_completed FROM users WHERE id = $1`,
      [userId]
    );
    return result.rows[0]?.onboarding_completed === true;
  } catch {
    return false;
  }
}
