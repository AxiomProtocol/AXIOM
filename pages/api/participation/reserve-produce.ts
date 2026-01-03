import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * POST /api/participation/reserve-produce
 * Reserves a Produce Box slot for a specific cycle
 * 
 * TODO: Wire to on-chain contract when available
 * Currently uses off-chain placeholder storage
 */

interface ProduceReservation {
  wallet: string;
  cycleId: string;
  timestamp: number;
  creditsSpent: number;
}

const reservations: Map<string, ProduceReservation> = new Map();

const cycleSlots: Record<string, { total: number; reserved: number }> = {
  'spring-2026': { total: 100, reserved: 23 },
  'summer-2026': { total: 150, reserved: 8 }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet, cycleId, credits } = req.body;

    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }

    if (!cycleId || typeof cycleId !== 'string') {
      return res.status(400).json({ error: 'Valid cycle ID required' });
    }

    const normalizedWallet = wallet.toLowerCase();
    const reservationKey = `${normalizedWallet}-${cycleId}`;
    
    if (reservations.has(reservationKey)) {
      return res.status(200).json({ 
        success: true, 
        message: 'Already reserved for this cycle',
        alreadyReserved: true
      });
    }

    const cycle = cycleSlots[cycleId];
    if (!cycle) {
      return res.status(400).json({ error: 'Invalid cycle ID' });
    }

    if (cycle.reserved >= cycle.total) {
      return res.status(400).json({ error: 'No slots available for this cycle' });
    }

    const reservation: ProduceReservation = {
      wallet: normalizedWallet,
      cycleId,
      timestamp: Date.now(),
      creditsSpent: credits || 0
    };

    reservations.set(reservationKey, reservation);
    cycle.reserved += 1;

    return res.status(200).json({
      success: true,
      message: 'Produce box slot reserved',
      cycleId,
      slotsRemaining: cycle.total - cycle.reserved
    });

  } catch (error) {
    console.error('Produce reservation error:', error);
    return res.status(500).json({ error: 'Failed to reserve slot' });
  }
}
