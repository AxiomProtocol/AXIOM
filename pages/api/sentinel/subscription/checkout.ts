import type { NextApiRequest, NextApiResponse } from 'next';
import { sentinelBilling, LegacyStripeAccountError } from '../../../../lib/sentinel/billing';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress, email } = req.body as { walletAddress?: string; email?: string };
  if (!walletAddress || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Valid walletAddress required' });
  }

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const successUrl = `${origin}/sentinel?subscribed=1`;
  const cancelUrl = `${origin}/sentinel`;

  try {
    const url = await sentinelBilling.createCheckoutSession(
      walletAddress,
      email,
      successUrl,
      cancelUrl,
    );
    return res.status(200).json({ url });
  } catch (err: any) {
    if (err instanceof LegacyStripeAccountError) {
      return res.status(409).json({ error: 'legacy_stripe_account', message: err.message });
    }
    console.error('[sentinel/subscription/checkout]', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
