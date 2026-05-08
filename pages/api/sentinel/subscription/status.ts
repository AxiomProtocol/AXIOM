import type { NextApiRequest, NextApiResponse } from 'next';
import { sentinelBilling } from '../../../../lib/sentinel/billing';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const walletAddress = req.query.wallet as string | undefined;
  if (!walletAddress || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Valid wallet query param required' });
  }

  try {
    const info = await sentinelBilling.getSubscriptionInfo(walletAddress);
    return res.status(200).json(info);
  } catch (err: any) {
    console.error('[sentinel/subscription/status]', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
