import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import { increaseParticipants } from '../../../../../shared/increaseParticipantSchema';
import { getSiweWallet } from '../../../../../lib/server/banking/siweHelper';
import { eq } from 'drizzle-orm';

async function increaseUpdateCard(cardId: string, status: 'disabled' | 'active'): Promise<{ id: string; status: string }> {
  const apiKey = process.env.INCREASE_API_KEY;
  if (!apiKey) throw new Error('INCREASE_API_KEY environment variable is not set');
  const isLive = process.env.INCREASE_ENVIRONMENT === 'production';
  const baseUrl = isLive ? (process.env.INCREASE_BASE_URL ?? 'https://api.increase.com') : 'https://sandbox.increase.com';

  const res = await fetch(`${baseUrl}/cards/${cardId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail ?? data?.title ?? `Increase API error ${res.status}`);
  }
  return data;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

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

  if (!participant.cardId) {
    return res.status(400).json({ error: 'No card issued for this account' });
  }

  const { freeze } = req.body as { freeze?: boolean };
  if (typeof freeze !== 'boolean') {
    return res.status(400).json({ error: 'freeze (boolean) is required in request body' });
  }

  const increaseStatus = freeze ? 'disabled' : 'active';

  try {
    await increaseUpdateCard(participant.cardId, increaseStatus);

    const newCardStatus = freeze ? 'frozen' : 'issued';
    await db
      .update(increaseParticipants)
      .set({ cardStatus: newCardStatus, updatedAt: new Date() })
      .where(eq(increaseParticipants.walletAddress, wallet));

    return res.status(200).json({ success: true, cardStatus: newCardStatus, frozen: freeze });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to update card status', detail: msg });
  }
}
