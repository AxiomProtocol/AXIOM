import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../../../lib/middleware/siweAuth';
import { bitGoWalletService } from '../../../../../lib/services/BitGoWalletService';
import { rateLimitDefault } from '../../../../../lib/rateLimit';
import { db } from '../../../../../lib/db';
import { bitgoTransactions } from '../../../../../shared/bitgoSchema';
import { eq, desc } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!rateLimitDefault(req, res)) return;

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  const { walletId } = req.query as { walletId: string };

  const wallet = await bitGoWalletService.getWallet(walletId);
  if (!wallet || wallet.walletAddress.toLowerCase() !== session.address.toLowerCase()) {
    return res.status(404).json({ error: 'Wallet not found.' });
  }

  await bitGoWalletService.getTransactionHistory(walletId);

  const txs = await db
    .select()
    .from(bitgoTransactions)
    .where(eq(bitgoTransactions.bitgoWalletId, walletId))
    .orderBy(desc(bitgoTransactions.createdAt))
    .limit(50);

  return res.status(200).json({ transactions: txs });
}
