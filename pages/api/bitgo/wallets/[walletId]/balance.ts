import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../../../lib/middleware/siweAuth';
import { bitGoWalletService } from '../../../../../lib/services/BitGoWalletService';
import { rateLimitDefault } from '../../../../../lib/rateLimit';

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

  const balance = await bitGoWalletService.syncBalance(walletId);

  return res.status(200).json({
    walletId: wallet.bitgoWalletId,
    coin: wallet.coin,
    receiveAddress: wallet.receiveAddress,
    confirmedBalance: balance?.confirmedBalance ?? wallet.confirmedBalanceStr ?? '0',
    spendableBalance: balance?.spendableBalance ?? wallet.spendableBalanceStr ?? '0',
    label: wallet.label,
    lastSyncedAt: wallet.lastSyncedAt,
  });
}
