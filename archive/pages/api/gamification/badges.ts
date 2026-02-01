import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { COMMUNITY_CONTRACTS, NETWORK_CONFIG } from '../../../shared/contracts';
import { db } from '../../../server/db';
import { memberCredentials, reputationEvents } from '../../../shared/schema';
import { eq, desc } from 'drizzle-orm';

const GAMIFICATION_ABI = [
  "function getUserBadges(address user) external view returns (uint256[] memory badgeIds)",
  "function getUserPoints(address user) external view returns (uint256)",
  "function getAchievementCount(address user) external view returns (uint256)"
];

const BADGE_POINTS: Record<string, number> = {
  first_stake: 50,
  rotation_complete: 100,
  identity_verified: 75,
  first_vote: 50,
  node_owner: 200,
  perfect_attendance: 150,
  reputation_70: 100,
  reputation_90: 250,
  delegator: 75,
  eco_contributor: 100,
  academy_graduate: 150,
  referral_3: 125
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet } = req.query;
  
  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  try {
    const normalizedWallet = wallet.toLowerCase();
    
    const earnedBadges: Array<{ badgeId: string; earnedAt: Date; points: number }> = [];

    const credential = await db
      .select()
      .from(memberCredentials)
      .where(eq(memberCredentials.walletAddress, normalizedWallet))
      .limit(1);

    if (credential.length > 0) {
      const cred = credential[0];
      
      if (cred.isVerified) {
        earnedBadges.push({ 
          badgeId: 'identity_verified', 
          earnedAt: cred.verifiedAt || new Date(), 
          points: BADGE_POINTS.identity_verified 
        });
      }

      if ((cred.reputationScore ?? 0) >= 70) {
        earnedBadges.push({ 
          badgeId: 'reputation_70', 
          earnedAt: new Date(), 
          points: BADGE_POINTS.reputation_70 
        });
      }

      if ((cred.reputationScore ?? 0) >= 90) {
        earnedBadges.push({ 
          badgeId: 'reputation_90', 
          earnedAt: new Date(), 
          points: BADGE_POINTS.reputation_90 
        });
      }

      if ((cred.completedRotations ?? 0) >= 1) {
        earnedBadges.push({ 
          badgeId: 'rotation_complete', 
          earnedAt: new Date(), 
          points: BADGE_POINTS.rotation_complete 
        });
      }

      if ((cred.onTimePayments ?? 0) >= 10) {
        earnedBadges.push({ 
          badgeId: 'perfect_attendance', 
          earnedAt: new Date(), 
          points: BADGE_POINTS.perfect_attendance 
        });
      }
    }

    try {
      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      const gamificationContract = new ethers.Contract(
        COMMUNITY_CONTRACTS.GAMIFICATION,
        GAMIFICATION_ABI,
        provider
      );

      const [chainBadgeIds, chainPoints] = await Promise.all([
        gamificationContract.getUserBadges(wallet).catch(() => []),
        gamificationContract.getUserPoints(wallet).catch(() => BigInt(0))
      ]);

      if (chainBadgeIds.length > 0) {
        if (chainBadgeIds.includes(BigInt(1))) {
          earnedBadges.push({ badgeId: 'first_stake', earnedAt: new Date(), points: BADGE_POINTS.first_stake });
        }
        if (chainBadgeIds.includes(BigInt(2))) {
          earnedBadges.push({ badgeId: 'first_vote', earnedAt: new Date(), points: BADGE_POINTS.first_vote });
        }
        if (chainBadgeIds.includes(BigInt(3))) {
          earnedBadges.push({ badgeId: 'node_owner', earnedAt: new Date(), points: BADGE_POINTS.node_owner });
        }
        if (chainBadgeIds.includes(BigInt(4))) {
          earnedBadges.push({ badgeId: 'delegator', earnedAt: new Date(), points: BADGE_POINTS.delegator });
        }
        if (chainBadgeIds.includes(BigInt(5))) {
          earnedBadges.push({ badgeId: 'eco_contributor', earnedAt: new Date(), points: BADGE_POINTS.eco_contributor });
        }
        if (chainBadgeIds.includes(BigInt(6))) {
          earnedBadges.push({ badgeId: 'academy_graduate', earnedAt: new Date(), points: BADGE_POINTS.academy_graduate });
        }
        if (chainBadgeIds.includes(BigInt(7))) {
          earnedBadges.push({ badgeId: 'referral_3', earnedAt: new Date(), points: BADGE_POINTS.referral_3 });
        }
      }
    } catch (err) {
      console.error('Error fetching on-chain badges:', err);
    }

    const uniqueBadges = Array.from(new Map(earnedBadges.map(b => [b.badgeId, b])).values());
    const totalPoints = uniqueBadges.reduce((sum, b) => sum + b.points, 0);

    res.status(200).json({
      success: true,
      wallet: normalizedWallet,
      badges: uniqueBadges,
      points: totalPoints,
      totalBadges: 12,
      earnedCount: uniqueBadges.length
    });
  } catch (error) {
    console.error('Badges API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch badges',
      badges: [],
      points: 0
    });
  }
}
