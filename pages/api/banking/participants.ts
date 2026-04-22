import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import {
  increaseParticipants,
  increaseProductEscrows,
  increaseLpDeposits,
} from '../../../shared/increaseParticipantSchema';
import { eq, and, desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_SOLVENCY_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const [participants, insuranceEscrows, deposits] = await Promise.all([
      db.select().from(increaseParticipants).orderBy(desc(increaseParticipants.createdAt)),
      db
        .select()
        .from(increaseProductEscrows)
        .where(
          and(
            eq(increaseProductEscrows.product, 'wealth-practice'),
            eq(increaseProductEscrows.purpose, 'insurance-hold'),
          )
        )
        .orderBy(desc(increaseProductEscrows.createdAt)),
      db.select().from(increaseLpDeposits).orderBy(desc(increaseLpDeposits.createdAt)),
    ]);

    const participantMap = new Map(participants.map((p) => [p.id, p]));

    const enrichedHolds = insuranceEscrows.map((h) => {
      const p = participantMap.get(h.participantId);
      const maskedAccount = p?.virtualAccountNumber
        ? `••${p.virtualAccountNumber.slice(-4)}`
        : null;
      return {
        ...h,
        participantRef: p?.participantRef ?? null,
        participantName: p?.fullName ?? null,
        maskedAccountNumber: maskedAccount,
        cardStatus: p?.cardStatus ?? null,
        cardLast4: p?.cardLast4 ?? null,
        // Helper flag for admin UI — these need action
        requiresAction: h.status === 'pending' || h.status === 'partial',
      };
    });

    const enrichedDeposits = deposits.map((d) => ({
      ...d,
      participantRef: participantMap.get(d.participantId)?.participantRef ?? null,
      participantName: participantMap.get(d.participantId)?.fullName ?? null,
    }));

    // Open escrows for the admin Participants tab — pending or partial holds needing confirmation
    const openEscrows = enrichedHolds.filter((h) => h.requiresAction);

    return res.status(200).json({
      success: true,
      participants,
      insuranceHolds: enrichedHolds,
      openEscrows,
      lpDeposits: enrichedDeposits,
      counts: {
        participants: participants.length,
        holds: insuranceEscrows.length,
        pendingHolds: insuranceEscrows.filter((h) => h.status === 'pending').length,
        partialHolds: insuranceEscrows.filter((h) => h.status === 'partial').length,
        fundedHolds: insuranceEscrows.filter((h) => h.status === 'funded').length,
        releasedHolds: insuranceEscrows.filter((h) => h.status === 'released').length,
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
