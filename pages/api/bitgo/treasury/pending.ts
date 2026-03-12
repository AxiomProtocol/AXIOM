import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../../lib/middleware/siweAuth';
import { bitGoCustodyService } from '../../../../lib/services/BitGoCustodyService';
import { rateLimitDefault } from '../../../../lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!rateLimitDefault(req, res)) return;

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  const result = await bitGoCustodyService.getPendingApprovals(session.address);

  return res.status(200).json({
    pendingApprovals: result.approvals ?? [],
    count: result.approvals?.length ?? 0,
  });
}
