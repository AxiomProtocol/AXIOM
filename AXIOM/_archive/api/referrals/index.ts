import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { users, referralRewardClaims } from '../../../shared/schema';
import { eq, sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Address required' });
  }

  try {
    const user = await db.select()
      .from(users)
      .where(eq(users.walletAddress, address))
      .limit(1);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://axiom.money';

    if (user.length === 0) {
      const tempCode = `AXM${address.slice(2, 8).toUpperCase()}`;
      return res.status(200).json({
        success: true,
        stats: {
          totalReferrals: 0,
          activeReferrals: 0,
          totalRewardsEarned: '0',
          pendingRewards: '0',
          referralCode: tempCode,
          referralLink: `${baseUrl}/join?ref=${tempCode}`
        },
        referrals: []
      });
    }

    const userData = user[0];

    const rewardClaims = await db.select()
      .from(referralRewardClaims)
      .where(eq(referralRewardClaims.referrerAddress, address))
      .limit(50);

    const totalRewards = rewardClaims.reduce((sum, claim) => {
      return sum + parseFloat(claim.rewardAmount || '0');
    }, 0);

    const pendingClaims = rewardClaims.filter(c => !c.txHash || c.txHash.startsWith('pending'));
    const pendingRewards = pendingClaims.reduce((sum, claim) => {
      return sum + parseFloat(claim.rewardAmount || '0');
    }, 0);

    const referralCode = userData.referralCode || `AXM${address.slice(2, 8).toUpperCase()}`;

    return res.status(200).json({
      success: true,
      stats: {
        totalReferrals: userData.referralCount || rewardClaims.length,
        activeReferrals: rewardClaims.filter(c => c.txHash && !c.txHash.startsWith('pending')).length,
        totalRewardsEarned: totalRewards.toFixed(2),
        pendingRewards: pendingRewards.toFixed(2),
        referralCode,
        referralLink: `${baseUrl}/join?ref=${referralCode}`
      },
      referrals: rewardClaims.map((claim) => ({
        id: claim.id.toString(),
        address: claim.referredAddress,
        joinedAt: claim.claimedAt?.getTime() || Date.now(),
        status: claim.txHash && !claim.txHash.startsWith('pending') ? 'active' : 'pending',
        rewardEarned: claim.rewardAmount || '0'
      }))
    });
  } catch (error: any) {
    console.error('Referral API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch referrals'
    });
  }
}
