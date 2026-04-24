import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { increaseParticipants } from '../../../../shared/increaseParticipantSchema';
import { IncreaseService, getAccountId } from '../../../../lib/services/IncreaseService';
import { getSiweWallet } from '../../../../lib/server/banking/siweHelper';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { walletAddress } = req.query;
  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'walletAddress query param required' });
  }
  const wallet = walletAddress.toLowerCase();

  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) return res.status(401).json({ error: 'Wallet sign-in required' });
  if (siweWallet !== '__dev__' && siweWallet.toLowerCase() !== wallet) {
    return res.status(403).json({ error: 'You may only access your own card' });
  }

  const rows = await db
    .select()
    .from(increaseParticipants)
    .where(eq(increaseParticipants.walletAddress, wallet))
    .limit(1);

  if (rows.length === 0) return res.status(404).json({ error: 'Participant not found' });
  const participant = rows[0];

  if (req.method === 'GET') {
    if (participant.cardId) {
      try {
        const card = await IncreaseService.getCard(participant.cardId);
        return res.status(200).json({ card, cardStatus: participant.cardStatus, cardLast4: participant.cardLast4 });
      } catch {
        return res.status(200).json({ cardStatus: participant.cardStatus, cardLast4: participant.cardLast4 });
      }
    }
    return res.status(200).json({ cardStatus: participant.cardStatus, cardLast4: participant.cardLast4 });
  }

  if (req.method === 'POST') {
    if (participant.cardStatus !== 'not_requested') {
      return res.status(200).json({ message: 'Card already issued or pending', cardStatus: participant.cardStatus });
    }

    // Use participant's dedicated account when available; fall back to org account only if not set
    const accountId = participant.increaseAccountId ?? getAccountId();
    if (!accountId) return res.status(503).json({ error: 'Banking account not configured' });

    try {
      const card = await IncreaseService.issueVirtualCard({
        account_id: accountId,
        description: `Axiom Nexus Card — ${participant.participantRef}`,
      });

      await db
        .update(increaseParticipants)
        .set({
          cardStatus: 'issued',
          cardId: card.id,
          cardLast4: card.last4,
          updatedAt: new Date(),
        })
        .where(eq(increaseParticipants.walletAddress, wallet));

      return res.status(201).json({ success: true, card, cardStatus: 'issued' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await db
        .update(increaseParticipants)
        .set({ cardStatus: 'program_required', updatedAt: new Date() })
        .where(eq(increaseParticipants.walletAddress, wallet));
      return res.status(202).json({
        cardStatus: 'program_required',
        message: 'Card program setup required — your card request has been queued. You will be notified when your card is ready.',
        detail: msg,
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
