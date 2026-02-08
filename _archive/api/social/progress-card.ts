import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet } = req.query;

  try {
    let progressData = {
      totalXP: 0,
      totalAXM: 0,
      streakDays: 0,
      questsCompleted: 0,
      susuRotations: 0,
      creditScore: 300,
      rank: 'Newcomer',
      referralCode: '',
    };

    if (wallet) {
      const userResult = await pool.query(
        `SELECT id, referral_code FROM users WHERE LOWER(wallet_address) = LOWER($1)`,
        [wallet]
      );

      if (userResult.rows.length > 0) {
        const userId = userResult.rows[0].id;
        progressData.referralCode = userResult.rows[0].referral_code || '';

        const questProgress = await pool.query(
          `SELECT 
            COALESCE(SUM(xp_earned), 0) as total_xp,
            COALESCE(SUM(axm_earned), 0) as total_axm,
            COUNT(*) FILTER (WHERE status = 'claimed') as quests_completed
           FROM user_quest_progress WHERE user_id = $1`,
          [userId]
        );

        if (questProgress.rows[0]) {
          progressData.totalXP = Number(questProgress.rows[0].total_xp) || 0;
          progressData.totalAXM = Math.floor(Number(questProgress.rows[0].total_axm) || 0);
          progressData.questsCompleted = Number(questProgress.rows[0].quests_completed) || 0;
        }

        try {
          const streakResult = await pool.query(
            `SELECT current_streak FROM user_streaks WHERE user_id = $1`,
            [userId]
          );
          if (streakResult.rows[0]) {
            progressData.streakDays = streakResult.rows[0].current_streak || 0;
          }
        } catch (e) {
        }

        try {
          const creditResult = await pool.query(
            `SELECT score FROM credit_scores WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1`,
            [userId]
          );
          if (creditResult.rows[0]) {
            progressData.creditScore = creditResult.rows[0].score || 300;
          }
        } catch (e) {
        }

        if (progressData.totalXP >= 5000) {
          progressData.rank = 'Legend';
        } else if (progressData.totalXP >= 2500) {
          progressData.rank = 'Champion';
        } else if (progressData.totalXP >= 1000) {
          progressData.rank = 'Achiever';
        } else if (progressData.totalXP >= 250) {
          progressData.rank = 'Builder';
        }
      }
    }

    return res.status(200).json(progressData);
  } catch (error) {
    console.error('Progress card error:', error);
    return res.status(200).json({
      totalXP: 0,
      totalAXM: 0,
      streakDays: 0,
      questsCompleted: 0,
      susuRotations: 0,
      creditScore: 300,
      rank: 'Newcomer',
      referralCode: '',
    });
  }
}
