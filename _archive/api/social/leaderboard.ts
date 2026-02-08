import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type LeaderboardType = 'veaxm' | 'streak' | 'referrals' | 'quests';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type = 'veaxm', wallet, limit = '50' } = req.query;
  const leaderboardType = type as LeaderboardType;
  const maxEntries = Math.min(parseInt(limit as string) || 50, 100);

  try {
    let entries: any[] = [];
    let userRank: number | null = null;

    switch (leaderboardType) {
      case 'veaxm':
        entries = await getVeAXMLeaderboard(maxEntries);
        break;
      case 'streak':
        entries = await getStreakLeaderboard(maxEntries);
        break;
      case 'referrals':
        entries = await getReferralLeaderboard(maxEntries);
        break;
      case 'quests':
        entries = await getQuestLeaderboard(maxEntries);
        break;
    }

    if (wallet) {
      const userEntry = entries.find(e => e.walletAddress.toLowerCase() === (wallet as string).toLowerCase());
      userRank = userEntry?.rank || null;
    }

    const now = new Date();
    const seasonEnd = new Date('2025-03-31');
    const daysRemaining = Math.max(0, Math.ceil((seasonEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return res.status(200).json({
      entries,
      userRank,
      season: {
        name: 'Season 1: Genesis',
        startDate: '2025-01-01',
        endDate: '2025-03-31',
        daysRemaining,
        prizePool: 100000,
      },
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return res.status(200).json({
      entries: [],
      userRank: null,
      season: {
        name: 'Season 1: Genesis',
        startDate: '2025-01-01',
        endDate: '2025-03-31',
        daysRemaining: 90,
        prizePool: 100000,
      },
    });
  }
}

async function getVeAXMLeaderboard(limit: number) {
  try {
    const result = await pool.query(`
      SELECT 
        u.wallet_address,
        u.display_name,
        COALESCE(s.amount, 0) as score
      FROM users u
      LEFT JOIN veaxm_stakes s ON u.id = s.user_id
      WHERE s.amount > 0
      ORDER BY score DESC
      LIMIT $1
    `, [limit]);

    return result.rows.map((row, index) => ({
      rank: index + 1,
      walletAddress: row.wallet_address,
      displayName: row.display_name || '',
      score: parseFloat(row.score) || 0,
      change: 0,
    }));
  } catch {
    return generateMockEntries(limit, 'veaxm');
  }
}

async function getStreakLeaderboard(limit: number) {
  try {
    const result = await pool.query(`
      SELECT 
        u.wallet_address,
        u.display_name,
        COALESCE(s.current_streak, 0) as score
      FROM users u
      LEFT JOIN user_streaks s ON u.id = s.user_id
      WHERE s.current_streak > 0
      ORDER BY score DESC
      LIMIT $1
    `, [limit]);

    return result.rows.map((row, index) => ({
      rank: index + 1,
      walletAddress: row.wallet_address,
      displayName: row.display_name || '',
      score: parseInt(row.score) || 0,
      change: 0,
    }));
  } catch {
    return generateMockEntries(limit, 'streak');
  }
}

async function getReferralLeaderboard(limit: number) {
  try {
    const result = await pool.query(`
      SELECT 
        u.wallet_address,
        u.display_name,
        COUNT(r.id) as score
      FROM users u
      LEFT JOIN users r ON r.referred_by = u.id
      GROUP BY u.id, u.wallet_address, u.display_name
      HAVING COUNT(r.id) > 0
      ORDER BY score DESC
      LIMIT $1
    `, [limit]);

    return result.rows.map((row, index) => ({
      rank: index + 1,
      walletAddress: row.wallet_address,
      displayName: row.display_name || '',
      score: parseInt(row.score) || 0,
      change: 0,
    }));
  } catch {
    return generateMockEntries(limit, 'referrals');
  }
}

async function getQuestLeaderboard(limit: number) {
  try {
    const result = await pool.query(`
      SELECT 
        u.wallet_address,
        u.display_name,
        COALESCE(SUM(q.xp_earned), 0) as score
      FROM users u
      LEFT JOIN user_quest_progress q ON u.id = q.user_id
      GROUP BY u.id, u.wallet_address, u.display_name
      HAVING SUM(q.xp_earned) > 0
      ORDER BY score DESC
      LIMIT $1
    `, [limit]);

    return result.rows.map((row, index) => ({
      rank: index + 1,
      walletAddress: row.wallet_address,
      displayName: row.display_name || '',
      score: parseInt(row.score) || 0,
      change: 0,
    }));
  } catch {
    return generateMockEntries(limit, 'quests');
  }
}

function generateMockEntries(limit: number, type: string): any[] {
  return [];
}
