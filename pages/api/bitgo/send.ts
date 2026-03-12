import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../lib/middleware/siweAuth';
import { bitGoTransactionService } from '../../../lib/services/BitGoTransactionService';
import { bitGoWalletService } from '../../../lib/services/BitGoWalletService';
import { rateLimitStrict } from '../../../lib/rateLimit';
import { validateEthAddress, validateCryptoAmount } from '../../../lib/validation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!rateLimitStrict(req, res)) return;

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  const { walletId, toAddress, amount, coin, memo } = req.body ?? {};

  const addrErr = validateEthAddress(toAddress);
  if (addrErr) return res.status(400).json({ error: addrErr });
  const amtErr = validateCryptoAmount(amount);
  if (amtErr) return res.status(400).json({ error: amtErr });

  const wallet = await bitGoWalletService.getWallet(walletId);
  if (!wallet || wallet.walletAddress.toLowerCase() !== session.address.toLowerCase()) {
    return res.status(403).json({ error: 'Wallet not found.' });
  }

  const result = await bitGoTransactionService.sendTransaction({
    walletAddress: session.address,
    bitgoWalletId: wallet.bitgoWalletId,
    toAddress: String(toAddress),
    amountStr: String(amount),
    coin: coin ?? wallet.coin,
    memo: memo ? String(memo) : undefined,
  });

  if (!result.success) return res.status(400).json({ error: result.error });

  return res.status(200).json({
    success: true,
    txId: result.txId,
    status: result.status,
  });
}
