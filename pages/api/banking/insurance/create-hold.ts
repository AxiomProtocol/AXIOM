import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import {
  increaseParticipants,
  increaseProductEscrows,
} from '../../../../shared/increaseParticipantSchema';
import { getSiweWallet } from '../../../../lib/server/banking/siweHelper';
import { eq, and } from 'drizzle-orm';

// NOTE: This endpoint is superseded by /api/banking/wealth-practice/insurance/fund
// It is retained for backwards compatibility and now writes to increase_product_escrows.

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

  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) {
    return res.status(401).json({ error: 'Wallet sign-in required — connect your wallet and sign in' });
  }
  if (siweWallet !== '__dev__' && siweWallet.toLowerCase() !== wallet) {
    return res.status(403).json({ error: 'You may only create holds for your own wallet' });
  }

  try {
    const participants = await db
      .select()
      .from(increaseParticipants)
      .where(eq(increaseParticipants.walletAddress, wallet))
      .limit(1);

    if (participants.length === 0) {
      return res.status(404).json({
        error: 'Participant not registered — please register first.',
        code: 'NEXUS_NOT_REGISTERED',
      });
    }

    const participant = participants[0];

    const existingEscrows = await db
      .select()
      .from(increaseProductEscrows)
      .where(
        and(
          eq(increaseProductEscrows.participantId, participant.id),
          eq(increaseProductEscrows.product, 'wealth-practice'),
          eq(increaseProductEscrows.purpose, 'insurance-hold'),
          eq(increaseProductEscrows.groupId, groupId),
        )
      )
      .limit(1);

    if (existingEscrows.length > 0 && !['released', 'forfeited'].includes(existingEscrows[0].status)) {
      return res.status(200).json({ success: true, hold: existingEscrows[0], isNew: false });
    }

    const weeklyEquivalentCents = Math.ceil(contributionAmountCents / 4);

    const [hold] = await db
      .insert(increaseProductEscrows)
      .values({
        product: 'wealth-practice',
        purpose: 'insurance-hold',
        participantId: participant.id,
        groupId,
        groupDisplayName: groupDisplayName ?? null,
        amountCents: weeklyEquivalentCents,
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
