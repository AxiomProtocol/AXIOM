import type { NextApiRequest, NextApiResponse } from 'next';
import { sentinelBilling } from '../../../../lib/sentinel/billing';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress } = req.body as { walletAddress?: string };
  if (!walletAddress || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Valid walletAddress required' });
  }

  try {
    const result = await sentinelBilling.cancelSubscription(walletAddress);
    if (!result.ok) {
      const status = result.reason === 'legacy_stripe_account' ? 409 : 400;
      return res.status(status).json({ error: result.reason });
    }
    return res.status(200).json({ ok: true, cancelAtPeriodEnd: true });
  } catch (err: any) {
    console.error('[sentinel/subscription/cancel]', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
