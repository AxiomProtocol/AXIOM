import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import { stewardReservations, stewardAssignments, stewardDrops } from '../../../../../shared/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id, wallet } = req.query;
  const dropId = parseInt(id as string);

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  if (isNaN(dropId)) {
    return res.status(400).json({ error: 'Invalid drop ID' });
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

      const reservations = await db
        .select()
        .from(stewardReservations)
        .where(eq(stewardReservations.dropId, dropId))
        .catch(() => []);

      return res.status(200).json({ reservations });
    } catch (error) {
      console.error('Reservations fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch reservations' });
    }
  }

  if (req.method === 'PATCH') {
    const { reservationId, status } = req.body;

    if (!reservationId || !status) {
      return res.status(400).json({ error: 'Reservation ID and status required' });
    }

    try {
      const assignments = await db
        .select()
        .from(stewardAssignments)
        .where(eq(stewardAssignments.wallet, wallet.toLowerCase()))
        .limit(1)
        .catch(() => []);

      if (assignments.length === 0 || !['probationary', 'active'].includes(assignments[0].status || '')) {
        return res.status(403).json({ error: 'Unauthorized: Not an active steward' });
      }

      const regionId = assignments[0].regionId;
      const drop = await db
        .select()
        .from(stewardDrops)
        .where(eq(stewardDrops.id, dropId))
        .limit(1);

      if (drop.length === 0 || (regionId && drop[0].regionId !== regionId)) {
        return res.status(403).json({ error: 'Unauthorized: Drop not in your region' });
      }

      const [updated] = await db
        .update(stewardReservations)
        .set({ status, updatedAt: new Date() })
        .where(eq(stewardReservations.id, reservationId))
        .returning();

      return res.status(200).json({ reservation: updated });
    } catch (error) {
      console.error('Reservation update error:', error);
      return res.status(500).json({ error: 'Failed to update reservation' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
