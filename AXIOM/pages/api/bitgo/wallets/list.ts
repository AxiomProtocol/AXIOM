import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../../lib/middleware/siweAuth';
import { bitGoWalletService } from '../../../../lib/services/BitGoWalletService';
import { isBitGoConfigured } from '../../../../lib/bitgo/client';
import { rateLimitDefault } from '../../../../lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!rateLimitDefault(req, res)) return;

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  const configured = isBitGoConfigured();
  const wallets = await bitGoWalletService.getWalletsForUser(session.address);

  if (configured && wallets.length > 0) {
    await Promise.allSettled(
      wallets.map((w) => bitGoWalletService.syncBalance(w.bitgoWalletId))
    );
    const refreshed = await bitGoWalletService.getWalletsForUser(session.address);
    return res.status(200).json({ wallets: refreshed, configured });
  }

  return res.status(200).json({ wallets, configured });
}
