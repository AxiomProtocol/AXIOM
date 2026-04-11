import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import { increaseParticipants } from '../../../../../shared/increaseParticipantSchema';
import { getSiweWallet } from '../../../../../lib/server/banking/siweHelper';
import { eq } from 'drizzle-orm';

async function fetchCardTransactions(cardId: string, limit = 25): Promise<unknown[]> {
  const apiKey = process.env.INCREASE_API_KEY ?? '';
  const isLive = process.env.INCREASE_ENVIRONMENT === 'production';
  const baseUrl = isLive ? (process.env.INCREASE_BASE_URL ?? 'https://api.increase.com') : 'https://sandbox.increase.com';

  const res = await fetch(`${baseUrl}/card_purchases?card_id=${cardId}&limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail ?? data?.title ?? `Increase API error ${res.status}`);
  }

  const data = await res.json();
  return data?.data ?? [];
}

interface CardPurchase {
  id: string;
  amount: number;
  currency: string;
  created_at: string;
  merchant_description?: string;
  merchant_name?: string;
  merchant_category_code?: string;
  status?: string;
  network_details?: {
    visa?: {
      merchant_name?: string;
    };
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress } = req.query;
  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'walletAddress query param required' });
  }
  const wallet = walletAddress.toLowerCase();

  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) return res.status(401).json({ error: 'Wallet sign-in required' });
  if (siweWallet !== '__dev__' && siweWallet.toLowerCase() !== wallet) {
    return res.status(403).json({ error: 'You may only access your own card transactions' });
  }

  const rows = await db
    .select()
    .from(increaseParticipants)
    .where(eq(increaseParticipants.walletAddress, wallet))
    .limit(1);

  if (rows.length === 0) return res.status(404).json({ error: 'Participant not found' });
  const participant = rows[0];

  if (!participant.cardId) {
    return res.status(200).json({ transactions: [] });
  }

  try {
    const raw = await fetchCardTransactions(participant.cardId, 25) as CardPurchase[];
    const transactions = raw.map((t: CardPurchase) => ({
      id: t.id,
      date: t.created_at,
      merchant: t.merchant_name ?? t.merchant_description ?? t.network_details?.visa?.merchant_name ?? 'Unknown Merchant',
      amount: t.amount,
      currency: t.currency ?? 'USD',
      status: t.status ?? 'settled',
    }));
    return res.status(200).json({ transactions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to fetch card transactions', detail: msg });
  }
}
