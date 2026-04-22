import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import {
  increaseParticipants,
  increaseLpDeposits,
} from '../../../shared/increaseParticipantSchema';
import { getSiweWallet } from '../../../lib/server/banking/siweHelper';
import { eq, desc } from 'drizzle-orm';

function isAdmin(req: NextApiRequest): boolean {
  const key = req.headers['x-admin-key'];
  return typeof key === 'string' && key === process.env.ADMIN_SOLVENCY_KEY;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { walletAddress, amountCents, product, notes } = req.body;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }
    if (typeof amountCents !== 'number' || amountCents < 10000) {
      return res.status(400).json({ error: 'amountCents must be >= 10000 ($100 minimum)' });
    }

    const wallet = walletAddress.toLowerCase();

    const siweWallet = await getSiweWallet(req);
    if (!siweWallet) {
      return res.status(401).json({ error: 'Wallet sign-in required — connect your wallet and sign in' });
    }
    if (siweWallet !== '__dev__' && siweWallet.toLowerCase() !== wallet) {
      return res.status(403).json({ error: 'You may only record deposits for your own wallet' });
    }

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

      const [deposit] = await db
        .insert(increaseLpDeposits)
        .values({
          participantId: participant.id,
          amountCents,
          status: 'pending',
          memoRef: participant.participantRef,
          product: product ?? 'lending-fund',
          notes: notes ?? null,
        })
        .returning();

      return res.status(201).json({
        success: true,
        deposit,
        instructions: {
          amountRequired: amountCents,
          amountRequiredFormatted: `$${(amountCents / 100).toFixed(2)}`,
          memo: participant.participantRef,
          note: `ACH to Axiom Nexus Account. Include your reference code "${participant.participantRef}" in the memo field.`,
        },
      });
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (req.method === 'GET') {
    const { walletAddress } = req.query;
    if (!walletAddress || typeof walletAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }
    const wallet = walletAddress.toLowerCase();

    const adminOk = isAdmin(req);
    if (!adminOk) {
      const siweWallet = await getSiweWallet(req);
      if (!siweWallet) {
        return res.status(401).json({ error: 'Wallet sign-in required' });
      }
      if (siweWallet !== '__dev__' && siweWallet.toLowerCase() !== wallet) {
        return res.status(403).json({ error: 'You may only view your own deposit records' });
      }
    }

    try {
      const participants = await db
        .select()
        .from(increaseParticipants)
        .where(eq(increaseParticipants.walletAddress, wallet))
        .limit(1);

      if (participants.length === 0) {
        return res.status(200).json({ success: true, registered: false, deposits: [] });
      }

      const participant = participants[0];
      const deposits = await db
        .select()
        .from(increaseLpDeposits)
        .where(eq(increaseLpDeposits.participantId, participant.id))
        .orderBy(desc(increaseLpDeposits.createdAt));

      return res.status(200).json({ success: true, registered: true, participant, deposits });
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
