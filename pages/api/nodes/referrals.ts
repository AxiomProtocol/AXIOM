import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { nodeReferralBonuses } from '../../../shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

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

    const referrals = await db.select()
      .from(nodeReferralBonuses)
      .where(eq(nodeReferralBonuses.referrerAddress, walletLower))
      .orderBy(desc(nodeReferralBonuses.createdAt))
      .limit(20);

    const statsResult = await db.select({
      totalReferrals: sql<number>`count(*)`,
      totalEarned: sql<number>`coalesce(sum(bonus_amount) filter (where status = 'paid'), 0)`,
      pendingEarnings: sql<number>`coalesce(sum(bonus_amount) filter (where status = 'pending'), 0)`
    })
    .from(nodeReferralBonuses)
    .where(eq(nodeReferralBonuses.referrerAddress, walletLower));

    const stats = statsResult[0] || { totalReferrals: 0, totalEarned: 0, pendingEarnings: 0 };

    return res.status(200).json({
      success: true,
      stats: {
        totalReferrals: Number(stats.totalReferrals) || 0,
        totalEarned: Number(stats.totalEarned) || 0,
        pendingEarnings: Number(stats.pendingEarnings) || 0,
        referralCode
      },
      referrals: referrals.map((r: InferSelectModel<typeof nodeReferralBonuses>) => ({
        id: r.id,
        referredAddress: r.referredAddress,
        nodeTier: r.nodeTier,
        bonusAmount: parseFloat(r.bonusAmount as string) || 0,
        status: r.status,
        createdAt: r.createdAt?.toISOString()
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
