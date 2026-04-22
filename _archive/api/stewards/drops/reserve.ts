import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { stewardReservations, stewardDrops } from '../../../../shared/schema';
import { eq, and } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet, dropId } = req.body;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  if (!dropId || typeof dropId !== 'number') {
    return res.status(400).json({ error: 'Drop ID required' });
  }

  const normalizedWallet = wallet.toLowerCase();

  try {
    const drops = await db
      .select()
      .from(stewardDrops)
      .where(eq(stewardDrops.id, dropId))
      .limit(1);

    if (drops.length === 0) {
      return res.status(404).json({ error: 'Drop not found' });
    }

    const drop = drops[0];

    if (drop.status !== 'published') {
      return res.status(400).json({ error: 'Drop is not open for reservations' });
    }

    if (drop.cutoffAt && new Date(drop.cutoffAt) < new Date()) {
      return res.status(400).json({ error: 'Reservation cutoff has passed' });
    }

    const existing = await db
      .select()
      .from(stewardReservations)
      .where(and(
        eq(stewardReservations.dropId, dropId),
        eq(stewardReservations.wallet, normalizedWallet)
      ))
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already reserved for this drop' });
    }

    const [reservation] = await db
      .insert(stewardReservations)
      .values({
        dropId,
        wallet: normalizedWallet,
        status: 'reserved'
      })
      .returning();

    return res.status(201).json({
      success: true,
      reservationId: reservation.id,
      message: 'Reservation created successfully'
    });
  } catch (error) {
    console.error('Drop reservation error:', error);
    return res.status(500).json({ error: 'Failed to create reservation' });
  }
}
