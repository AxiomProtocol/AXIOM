import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../lib/db';
import jwt from 'jsonwebtoken';

function getJWTSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT secret not configured');
  return secret;
}

function verifyAdminToken(req: NextApiRequest): boolean {
  const token = req.cookies.admin_token;
  if (!token) return false;
  
  try {
    const decoded = jwt.verify(token, getJWTSecret()) as any;
    return decoded.isAdmin === true;
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!verifyAdminToken(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const [
        totalResult,
        todayResult,
        weekResult,
        referralResult,
        rewardResult
      ] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM early_access_signups'),
        pool.query(`SELECT COUNT(*) as count FROM early_access_signups WHERE created_at >= CURRENT_DATE`),
        pool.query(`SELECT COUNT(*) as count FROM early_access_signups WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`),
        pool.query(`SELECT COUNT(*) as count FROM early_access_signups WHERE referred_by IS NOT NULL`),
        pool.query(`SELECT 
          SUM(base_reward) as total_base,
          SUM(referral_reward) as total_referral
        FROM early_access_signups`)
      ]);

      const stats = {
        total: parseInt(totalResult.rows[0].count, 10),
        today: parseInt(todayResult.rows[0].count, 10),
        thisWeek: parseInt(weekResult.rows[0].count, 10),
        referredSignups: parseInt(referralResult.rows[0].count, 10),
        spotsRemaining: Math.max(0, 5000 - parseInt(totalResult.rows[0].count, 10)),
        totalBaseRewards: parseInt(rewardResult.rows[0].total_base || 0, 10),
        totalReferralRewards: parseInt(rewardResult.rows[0].total_referral || 0, 10),
        totalRewardsCommitted: parseInt(rewardResult.rows[0].total_base || 0, 10) + parseInt(rewardResult.rows[0].total_referral || 0, 10)
      };

      return res.status(200).json(stats);
    } catch (error) {
      console.error('Error fetching early access stats:', error);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
