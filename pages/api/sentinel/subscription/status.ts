import type { NextApiRequest, NextApiResponse } from 'next';
import { sentinelBilling } from '../../../../lib/sentinel/billing';
import { requireWalletOwnership } from '../../../../lib/sentinel/walletAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const walletAddress = typeof req.query.wallet === 'string' ? req.query.wallet : undefined;
  if (!walletAddress || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Valid wallet query param required' });
  }

  const authCheck = await requireWalletOwnership(req, walletAddress);
  if (!authCheck.ok) {
    return res.status(authCheck.status).json({ error: authCheck.error });
  }

  try {
    const info = await sentinelBilling.getSubscriptionInfo(walletAddress);
    return res.status(200).json(info);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[sentinel/subscription/status]', err);
    return res.status(500).json({ error: message });
  }
}
