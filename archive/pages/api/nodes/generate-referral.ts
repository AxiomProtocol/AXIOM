import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

function generateReferralCode(wallet: string): string {
  const prefix = wallet.slice(2, 6).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AXM-${prefix}-${random}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet } = req.body;

    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const walletLower = wallet.toLowerCase();
    const referralCode = generateReferralCode(wallet);

    const statsResult = await pool.query(
      `SELECT 
        COALESCE(SUM(bonus_amount), 0) as total_earnings,
        COUNT(*) as referral_count
       FROM node_referral_bonuses
       WHERE referrer_address = $1`,
      [walletLower]
    );

    const stats = statsResult.rows[0] || { total_earnings: 0, referral_count: 0 };

    return res.status(200).json({
      success: true,
      referralCode,
      referralLink: `https://axiom.city/axiom-nodes?ref=${referralCode}`,
      stats: {
        totalEarnings: Number(stats.total_earnings) || 0,
        referralCount: Number(stats.referral_count) || 0,
        bonusPercent: 5
      }
    });
  } catch (error: any) {
    console.error('Referral generation error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to generate referral code' });
  }
}
