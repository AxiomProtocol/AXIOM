import type { NextApiRequest, NextApiResponse } from 'next';
import { sentinelBilling, LegacyStripeAccountError } from '../../../../lib/sentinel/billing';
import { requireWalletOwnership } from '../../../../lib/sentinel/walletAuth';
import { StripeAccountMismatchError } from '../../../../lib/stripe/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress, email } = req.body as { walletAddress?: string; email?: string };
  if (!walletAddress || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Valid walletAddress required' });
  }

  const authCheck = await requireWalletOwnership(req, walletAddress);
  if (!authCheck.ok) {
    return res.status(authCheck.status).json({ error: authCheck.error });
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
  } catch (err: unknown) {
    if (err instanceof LegacyStripeAccountError || err instanceof StripeAccountMismatchError) {
      return res.status(409).json({ error: 'stripe_account_mismatch', message: (err as Error).message });
    }
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[sentinel/subscription/checkout]', err);
    return res.status(500).json({ error: message });
  }
}
