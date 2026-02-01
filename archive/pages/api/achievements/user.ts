import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { userAchievements, achievementDefinitions, users } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { cacheGet, cacheSet, CacheTTL } from '../../../lib/cache';
import { achievements as achievementsList, calculateTotalPoints } from '../../../lib/achievements';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address, userId } = req.query;

    if (!address && !userId) {
      return res.status(400).json({ error: 'Address or userId required' });
    }

    const cacheKey = `achievements:${address || userId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, ...cached, fromCache: true });
    }

    let userIdNum: number | null = null;

    if (userId) {
      userIdNum = parseInt(userId as string);
    } else if (address) {
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.walletAddress, (address as string).toLowerCase()))
        .limit(1);
      
      if (user) {
        userIdNum = user.id;
      }
    }

    if (!userIdNum) {
      const result = {
        earned: [],
        total: achievementsList.length,
        points: 0,
        nextAchievements: achievementsList.slice(0, 3)
      };
      return res.status(200).json({ success: true, ...result });
    }

    const dbAchievements = await db
      .select({
        id: userAchievements.id,
        achievementId: userAchievements.achievementId,
        progress: userAchievements.progress,
        maxProgress: userAchievements.maxProgress,
        isUnlocked: userAchievements.isUnlocked,
        unlockedAt: userAchievements.unlockedAt
      })
      .from(userAchievements)
      .where(and(
        eq(userAchievements.userId, userIdNum),
        eq(userAchievements.isUnlocked, true)
      ));

    const definitions = await db
      .select()
      .from(achievementDefinitions);

    const defMap = new Map(definitions.map(d => [d.id, d]));

    const earned = dbAchievements.map(ua => {
      const def = defMap.get(ua.achievementId);
      return {
        achievementId: def?.achievementType || `achievement_${ua.achievementId}`,
        name: def?.name || 'Achievement',
        description: def?.description || '',
        icon: def?.badgeIcon || '🏆',
        earnedAt: ua.unlockedAt?.toISOString()
      };
    });

    const earnedIds = earned.map(e => e.achievementId);
    const points = calculateTotalPoints(earnedIds);

    const notEarned = achievementsList
      .filter(a => !earnedIds.includes(a.id))
      .slice(0, 3);

    const result = {
      earned,
      total: achievementsList.length,
      points,
      nextAchievements: notEarned
    };

    await cacheSet(cacheKey, result, CacheTTL.MEDIUM);

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
}
