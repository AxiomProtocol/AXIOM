import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { stewardDrops, stewardReservations, stewardAssignments } from '../../../../shared/schema';
import { eq, and, count } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { wallet, regionId } = req.query;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  if (req.method === 'GET') {
    try {
      const assignments = await db
        .select()
        .from(stewardAssignments)
        .where(eq(stewardAssignments.wallet, wallet.toLowerCase()))
        .limit(1)
        .catch(() => []);

      if (assignments.length === 0) {
        return res.status(403).json({ error: 'Not a steward' });
      }

      const assignment = assignments[0];
      const targetRegionId = regionId ? parseInt(regionId as string) : assignment.regionId;

      if (!targetRegionId) {
        return res.status(200).json({ drops: [] });
      }

      const drops = await db
        .select()
        .from(stewardDrops)
        .where(eq(stewardDrops.regionId, targetRegionId))
        .orderBy(stewardDrops.date)
        .catch(() => []);

      const dropsWithCounts = await Promise.all(
        drops.map(async (drop) => {
          const reservationCount = await db
            .select({ count: count() })
            .from(stewardReservations)
            .where(eq(stewardReservations.dropId, drop.id))
            .catch(() => [{ count: 0 }]);

          return {
            ...drop,
            reservations: reservationCount[0]?.count || 0
          };
        })
      );

      return res.status(200).json({ drops: dropsWithCounts });
    } catch (error) {
      console.error('Drops fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch drops' });
    }
  }

  if (req.method === 'POST') {
    const { date, location, capacity, timeWindow } = req.body;

    if (!date || !location) {
      return res.status(400).json({ error: 'Date and location required' });
    }

    try {
      const assignments = await db
        .select()
        .from(stewardAssignments)
        .where(eq(stewardAssignments.wallet, wallet.toLowerCase()))
        .limit(1)
        .catch(() => []);

      if (assignments.length === 0 || !assignments[0].regionId) {
        return res.status(403).json({ error: 'Not assigned to a region' });
      }

      const [drop] = await db
        .insert(stewardDrops)
        .values({
          regionId: assignments[0].regionId,
          date: new Date(date),
          location,
          capacity: capacity || 50,
          timeWindows: timeWindow ? [timeWindow] : null,
          status: 'draft',
          createdBy: wallet.toLowerCase()
        })
        .returning();

      return res.status(201).json({ drop });
    } catch (error) {
      console.error('Drop create error:', error);
      return res.status(500).json({ error: 'Failed to create drop' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
