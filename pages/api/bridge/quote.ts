import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../lib/middleware/siweAuth';
import { bridgeService } from '../../../lib/services/BridgeService';
import { rateLimitDefault } from '../../../lib/rateLimit';
import { validateDollarAmount } from '../../../lib/validation';

const VALID_ASSETS = ['AXM', 'AXUSD', 'ETH', 'USDC'] as const;
type CryptoAsset = typeof VALID_ASSETS[number];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!rateLimitDefault(req, res)) return;

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  const { direction, fiatAmountCents, cryptoAsset } = req.body ?? {};

  const amtErr = validateDollarAmount(fiatAmountCents);
  if (amtErr) return res.status(400).json({ error: amtErr });

  if (!VALID_ASSETS.includes(cryptoAsset as CryptoAsset)) {
    return res.status(400).json({ error: `Asset must be one of: ${VALID_ASSETS.join(', ')}.` });
  }

  if (direction !== 'fiat_to_crypto' && direction !== 'crypto_to_fiat') {
    return res.status(400).json({ error: 'Direction must be fiat_to_crypto or crypto_to_fiat.' });
  }

  const result = await bridgeService.getBridgeQuote({
    walletAddress: session.address,
    direction,
    fiatAmountCents: Number(fiatAmountCents),
    cryptoAsset: cryptoAsset as CryptoAsset,
  });

  if (!result.success) return res.status(400).json({ error: result.error });

  return res.status(200).json({ success: true, quote: result.quote });
}
