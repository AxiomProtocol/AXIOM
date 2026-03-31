import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import {
  increaseParticipants,
  increaseInsuranceHolds,
  increaseLpDeposits,
  increaseDistributions,
} from '../../../../shared/increaseParticipantSchema';
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
      return res.status(404).json({ error: 'Participant not found', registered: false });
    }

    const participant = participants[0];

    const [insuranceHolds, lpDeposits, distributions] = await Promise.all([
      db.select().from(increaseInsuranceHolds).where(eq(increaseInsuranceHolds.participantId, participant.id)),
      db.select().from(increaseLpDeposits).where(eq(increaseLpDeposits.participantId, participant.id)),
      db.select().from(increaseDistributions).where(eq(increaseDistributions.participantId, participant.id)),
    ]);

    const isSandbox = (process.env.INCREASE_ENVIRONMENT ?? 'sandbox') === 'sandbox';
    const nexusAccountId = isSandbox
      ? (process.env.INCREASE_SANDBOX_ACCOUNT_ID ?? 'sandbox_account_nqaq96bjvvhfn2tstwmh')
      : (process.env.INCREASE_ACCOUNT_ID ?? 'account_3q7ro70b6ma4w5ijgivz');

    return res.status(200).json({
      success: true,
      registered: true,
      participant,
      insuranceHolds,
      lpDeposits,
      distributions,
      depositInstructions: {
        routingNumber: '071006486',
        bankName: 'First Internet Bank',
        accountName: 'Axiom Protocol LLC — Nexus Account',
        memo: participant.participantRef,
        note: `Always include your reference code "${participant.participantRef}" in the ACH memo or wire message field.`,
        environment: isSandbox ? 'sandbox' : 'production',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
