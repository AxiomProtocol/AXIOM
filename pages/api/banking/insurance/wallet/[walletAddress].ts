import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import {
  increaseParticipants,
  increaseInsuranceHolds,
} from '../../../../../shared/increaseParticipantSchema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress } = req.query;
  if (!walletAddress || typeof walletAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
    return res.status(400).json({ error: 'Valid wallet address required' });
  }

  const wallet = walletAddress.toLowerCase();

  try {
    const participants = await db
      .select()
      .from(increaseParticipants)
      .where(eq(increaseParticipants.walletAddress, wallet))
      .limit(1);

    if (participants.length === 0) {
      return res.status(200).json({ success: true, registered: false, holds: [] });
    }

    const participant = participants[0];
    const holds = await db
      .select()
      .from(increaseInsuranceHolds)
      .where(eq(increaseInsuranceHolds.participantId, participant.id));

    return res.status(200).json({
      success: true,
      registered: true,
      participant,
      holds,
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
