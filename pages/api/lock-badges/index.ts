import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { lockChallengeBadges } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

const BADGE_DEFINITIONS = [
  { id: 'committed', name: 'Committed', requiredYears: 1, minAmount: 100, rarity: 'Common' },
  { id: 'dedicated', name: 'Dedicated', requiredYears: 2, minAmount: 100, rarity: 'Rare' },
  { id: 'believer', name: 'True Believer', requiredYears: 3, minAmount: 100, rarity: 'Epic' },
  { id: 'diamond_hands', name: 'Diamond Hands', requiredYears: 4, minAmount: 100, rarity: 'Legendary' },
  { id: 'whale_lock', name: 'Whale Locker', requiredYears: 4, minAmount: 10000, rarity: 'Legendary' },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { wallet } = req.query;
      
      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'Wallet required' });
      }

      const earnedBadges = await db.select()
        .from(lockChallengeBadges)
        .where(eq(lockChallengeBadges.walletAddress, wallet.toLowerCase()));

      return res.status(200).json({
        success: true,
        badges: earnedBadges.map((b: InferSelectModel<typeof lockChallengeBadges>) => ({
          id: b.id,
          badgeType: b.badgeType,
          badgeName: b.badgeName,
          lockDurationYears: b.lockDurationYears,
          lockAmount: parseFloat(b.lockAmount as string) || 0,
          unlockedAt: b.unlockedAt?.toISOString(),
          displayOnProfile: b.displayOnProfile
        })),
        earnedBadgeIds: earnedBadges.map((b: InferSelectModel<typeof lockChallengeBadges>) => b.badgeType)
      });
    } catch (error) {
      console.error('Get badges error:', error);
      return res.status(200).json({ success: true, badges: [], earnedBadgeIds: [] });
    }
  }

  if (req.method === 'POST') {
    try {
      const { wallet, lockYears, lockAmount } = req.body;
      
      if (!wallet || !lockYears || !lockAmount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const walletLower = wallet.toLowerCase();
      const existingBadges = await db.select()
        .from(lockChallengeBadges)
        .where(eq(lockChallengeBadges.walletAddress, walletLower));

      const existingIds = new Set(existingBadges.map((b: InferSelectModel<typeof lockChallengeBadges>) => b.badgeType));
      
      const eligibleBadges = BADGE_DEFINITIONS.filter(badge => 
        lockYears >= badge.requiredYears && 
        lockAmount >= badge.minAmount && 
        !existingIds.has(badge.id)
      );

      const newBadges = [];
      for (const badge of eligibleBadges) {
        const inserted = await db.insert(lockChallengeBadges).values({
          walletAddress: walletLower,
          badgeType: badge.id,
          badgeName: badge.name,
          lockDurationYears: lockYears,
          lockAmount: lockAmount.toString(),
          displayOnProfile: true,
          metadata: { rarity: badge.rarity }
        }).returning();
        newBadges.push(...inserted);
      }

      return res.status(200).json({
        success: true,
        newBadges: newBadges.map(b => b.badgeType),
        message: newBadges.length > 0 ? `Unlocked ${newBadges.length} new badge(s)!` : 'No new badges unlocked'
      });
    } catch (error) {
      console.error('Claim badges error:', error);
      return res.status(500).json({ success: false, error: 'Failed to claim badges' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
