import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../../lib/middleware/siweAuth';
import { bitGoWalletService } from '../../../../lib/services/BitGoWalletService';
import { rateLimitStrict } from '../../../../lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!rateLimitStrict(req, res)) return;

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  const existing = await bitGoWalletService.getWalletsForUser(session.address);
  if (existing.length > 0) {
    return res.status(200).json({
      success: true,
      walletId: existing[0].bitgoWalletId,
      receiveAddress: existing[0].receiveAddress,
      message: 'Custody wallet already exists.',
    });
  }

  const result = await bitGoWalletService.createUserWallet({
    walletAddress: session.address,
  });

  if (!result.success) return res.status(400).json({ error: result.error });

  return res.status(200).json({
    success: true,
    walletId: result.walletId,
    receiveAddress: result.receiveAddress,
  });
}
