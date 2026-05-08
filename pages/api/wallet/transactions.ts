import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey } from '@/src/config/adminRoles';
import { listTransactions, ensureBalance } from '@/lib/wallet/service';

const FOUNDER_USER_ID = 'operator_founder';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    await ensureBalance(FOUNDER_USER_ID);
    const limit  = Math.min(Number(req.query.limit  ?? 50), 200);
    const offset = Number(req.query.offset ?? 0);
    const txns   = await listTransactions({ userId: FOUNDER_USER_ID, limit, offset });
    return res.status(200).json({ success: true, data: txns });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Transaction fetch failed';
    return res.status(500).json({ success: false, error: msg });
  }
}
