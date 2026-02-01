import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

    if (userResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        streak: {
          currentStreak: 0,
          longestStreak: 0,
          weeklyProgress: 0,
          weeklyGoal: 3,
          lastActivityDate: null,
          streakType: 'payment',
          rewards: { axmBonus: 0, creditBoost: 0 },
        },
      });
    }

    const userId = userResult.rows[0].id;

    const streakResult = await pool.query(
      `SELECT 
        current_streak,
        longest_streak,
        weekly_goal,
        last_activity_date,
        total_lessons_completed
       FROM learning_streaks
       WHERE user_id = $1`,
      [userId]
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let weeklyGoal = 3;
    let lastActivityDate = null;

    if (streakResult.rows.length > 0) {
      const row = streakResult.rows[0];
      currentStreak = row.current_streak || 0;
      longestStreak = row.longest_streak || 0;
      weeklyGoal = row.weekly_goal || 3;
      lastActivityDate = row.last_activity_date;
    }

    const paymentResult = await pool.query(
      `SELECT COUNT(*) as count FROM susu_contributions 
       WHERE user_id = $1 AND paid_on_time = true`,
      [userId]
    );
    const onTimePayments = parseInt(paymentResult.rows[0]?.count || '0');

    const weeklyActivity = await pool.query(
      `SELECT COUNT(*) as count FROM susu_contributions 
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
      [userId]
    );
    const weeklyProgress = parseInt(weeklyActivity.rows[0]?.count || '0');

    let axmBonus = 0;
    let creditBoost = 0;
    
    if (currentStreak >= 90) { axmBonus = 500; creditBoost = 100; }
    else if (currentStreak >= 60) { axmBonus = 200; creditBoost = 50; }
    else if (currentStreak >= 30) { axmBonus = 75; creditBoost = 25; }
    else if (currentStreak >= 14) { axmBonus = 25; creditBoost = 10; }
    else if (currentStreak >= 7) { axmBonus = 10; creditBoost = 5; }

    return res.status(200).json({
      success: true,
      streak: {
        currentStreak: Math.max(currentStreak, onTimePayments),
        longestStreak: Math.max(longestStreak, onTimePayments),
        weeklyProgress,
        weeklyGoal,
        lastActivityDate,
        streakType: 'payment',
        rewards: { axmBonus, creditBoost },
      },
    });
  } catch (error) {
    console.error('Streak status error:', error);
    return res.status(500).json({ error: 'Failed to fetch streak status' });
  }
}
