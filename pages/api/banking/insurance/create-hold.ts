import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import {
  increaseParticipants,
  increaseInsuranceHolds,
} from '../../../../shared/increaseParticipantSchema';
import { eq, and } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress, groupId, groupDisplayName, contributionAmountCents } = req.body;

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
    return res.status(400).json({ error: 'Valid wallet address required' });
  }
  if (!groupId || typeof groupId !== 'string') {
    return res.status(400).json({ error: 'groupId required' });
  }
  if (typeof contributionAmountCents !== 'number' || contributionAmountCents < 100) {
    return res.status(400).json({ error: 'contributionAmountCents must be a number >= 100' });
  }

  const wallet = walletAddress.toLowerCase();

  try {
    const participants = await db
      .select()
      .from(increaseParticipants)
      .where(eq(increaseParticipants.walletAddress, wallet))
      .limit(1);

    if (participants.length === 0) {
      return res.status(404).json({ error: 'Participant not registered. Please register first.' });
    }

    const participant = participants[0];

    const existingHolds = await db
      .select()
      .from(increaseInsuranceHolds)
      .where(
        and(
          eq(increaseInsuranceHolds.participantId, participant.id),
          eq(increaseInsuranceHolds.groupId, groupId),
        ),
      )
      .limit(1);

    if (existingHolds.length > 0) {
      return res.status(200).json({ success: true, hold: existingHolds[0], isNew: false });
    }

    const weeklyEquivalentCents = Math.ceil(contributionAmountCents / 4);

    const [hold] = await db
      .insert(increaseInsuranceHolds)
      .values({
        participantId: participant.id,
        groupId,
        groupDisplayName: groupDisplayName ?? null,
        requiredAmountCents: weeklyEquivalentCents,
        depositedAmountCents: 0,
        status: 'pending',
      })
      .returning();

    return res.status(201).json({
      success: true,
      hold,
      isNew: true,
      instructions: {
        amountRequired: weeklyEquivalentCents,
        amountRequiredFormatted: `$${(weeklyEquivalentCents / 100).toFixed(2)}`,
        memo: participant.participantRef,
        note: `ACH to Axiom Nexus Account. Include your reference code "${participant.participantRef}" in the memo field. Funds are held as insurance and released upon group graduation.`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
