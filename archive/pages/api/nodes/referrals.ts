import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet } = req.query;
    
    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const walletLower = wallet.toLowerCase();
    const referralCode = walletLower.slice(2, 10).toUpperCase();

    const referralsResult = await pool.query(
      `SELECT id, referred_address, node_tier, bonus_amount, status, created_at
       FROM node_referral_bonuses
       WHERE referrer_address = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [walletLower]
    );

    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_referrals,
        COALESCE(SUM(bonus_amount) FILTER (WHERE status = 'paid'), 0) as total_earned,
        COALESCE(SUM(bonus_amount) FILTER (WHERE status = 'pending'), 0) as pending_earnings
       FROM node_referral_bonuses
       WHERE referrer_address = $1`,
      [walletLower]
    );

    const stats = statsResult.rows[0] || { total_referrals: 0, total_earned: 0, pending_earnings: 0 };

    return res.status(200).json({
      success: true,
      stats: {
        totalReferrals: Number(stats.total_referrals) || 0,
        totalEarned: Number(stats.total_earned) || 0,
        pendingEarnings: Number(stats.pending_earnings) || 0,
        referralCode
      },
      referrals: referralsResult.rows.map((r: any) => ({
        id: r.id,
        referredAddress: r.referred_address,
        nodeTier: r.node_tier,
        bonusAmount: parseFloat(r.bonus_amount) || 0,
        status: r.status,
        createdAt: r.created_at?.toISOString()
      }))
    });
  } catch (error) {
    console.error('Node referrals error:', error);
    return res.status(200).json({
      success: true,
      stats: {
        totalReferrals: 0,
        totalEarned: 0,
        pendingEarnings: 0,
        referralCode: 'LOADING'
      },
      referrals: []
    });
  }
}
