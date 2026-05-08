import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey } from '@/src/config/adminRoles';
import { getStripeAccountInfo } from '@/lib/stripe/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const info = await getStripeAccountInfo();
    return res.status(200).json({ success: true, ...info });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: msg });
  }
}
