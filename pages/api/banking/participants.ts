import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import {
  increaseParticipants,
  increaseInsuranceHolds,
  increaseLpDeposits,
} from '../../../shared/increaseParticipantSchema';
import { desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_SOLVENCY_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const [participants, holds, deposits] = await Promise.all([
      db.select().from(increaseParticipants).orderBy(desc(increaseParticipants.createdAt)),
      db.select().from(increaseInsuranceHolds).orderBy(desc(increaseInsuranceHolds.createdAt)),
      db.select().from(increaseLpDeposits).orderBy(desc(increaseLpDeposits.createdAt)),
    ]);

    const participantMap = new Map(participants.map((p) => [p.id, p]));

    const enrichedHolds = holds.map((h) => ({
      ...h,
      participantRef: participantMap.get(h.participantId)?.participantRef ?? null,
      participantName: participantMap.get(h.participantId)?.fullName ?? null,
    }));

    const enrichedDeposits = deposits.map((d) => ({
      ...d,
      participantRef: participantMap.get(d.participantId)?.participantRef ?? null,
      participantName: participantMap.get(d.participantId)?.fullName ?? null,
    }));

    return res.status(200).json({
      success: true,
      participants,
      insuranceHolds: enrichedHolds,
      lpDeposits: enrichedDeposits,
      counts: {
        participants: participants.length,
        holds: holds.length,
        pendingHolds: holds.filter((h) => h.status === 'pending').length,
        fundedHolds: holds.filter((h) => h.status === 'funded').length,
        deposits: deposits.length,
        pendingDeposits: deposits.filter((d) => d.status === 'pending').length,
        receivedDeposits: deposits.filter((d) => d.status === 'received').length,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
