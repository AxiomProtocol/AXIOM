import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { onrampPurchaseIntents, OnrampPurchaseIntent } from '../../../shared/onrampSchema';
import { eq, desc } from 'drizzle-orm';

interface HistoryResponse {
  intents: OnrampPurchaseIntent[];
}

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HistoryResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const wallet = req.query.wallet as string | undefined;

  if (!wallet) {
    return res.status(400).json({ error: 'wallet query parameter is required' });
  }

  try {
    const intents = await db
      .select()
      .from(onrampPurchaseIntents)
      .where(eq(onrampPurchaseIntents.walletAddress, wallet.toLowerCase()))
      .orderBy(desc(onrampPurchaseIntents.createdAt))
      .limit(20);

    return res.status(200).json({ intents });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database error';
    return res.status(500).json({ error: msg });
  }
}
