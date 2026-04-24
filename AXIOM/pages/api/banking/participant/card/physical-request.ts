import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import { increaseParticipants } from '../../../../../shared/increaseParticipantSchema';
import { getSiweWallet } from '../../../../../lib/server/banking/siweHelper';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress } = req.query;
  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'walletAddress query param required' });
  }
  const wallet = walletAddress.toLowerCase();

  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) return res.status(401).json({ error: 'Wallet sign-in required' });
  if (siweWallet !== '__dev__' && siweWallet.toLowerCase() !== wallet) {
    return res.status(403).json({ error: 'You may only manage your own card' });
  }

  const rows = await db
    .select()
    .from(increaseParticipants)
    .where(eq(increaseParticipants.walletAddress, wallet))
    .limit(1);

  if (rows.length === 0) return res.status(404).json({ error: 'Participant not found' });
  const participant = rows[0];

  if (participant.physicalCardRequested === true) {
    return res.status(200).json({ success: true, message: 'Physical card request already on file.' });
  }

  const { shippingAddress } = req.body as { shippingAddress?: string };

  await db
    .update(increaseParticipants)
    .set({
      physicalCardRequested: true,
      physicalCardRequestedAt: new Date(),
      notes: participant.notes
        ? `${participant.notes}\n[Physical Card Request ${new Date().toISOString()}]${shippingAddress ? `: ${shippingAddress}` : ''}`
        : `[Physical Card Request ${new Date().toISOString()}]${shippingAddress ? `: ${shippingAddress}` : ''}`,
      updatedAt: new Date(),
    })
    .where(eq(increaseParticipants.walletAddress, wallet));

  return res.status(201).json({ success: true, message: 'Physical card request submitted. Operations will contact you within 3–5 business days.' });
}
