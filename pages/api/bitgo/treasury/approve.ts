import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../../lib/middleware/siweAuth';
import { bitGoCustodyService } from '../../../../lib/services/BitGoCustodyService';
import { rateLimitStrict } from '../../../../lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!rateLimitStrict(req, res)) return;

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  const { pendingApprovalId, action } = req.body ?? {};

  if (!pendingApprovalId) {
    return res.status(400).json({ error: 'pendingApprovalId is required.' });
  }
  if (action !== 'approve' && action !== 'reject') {
    return res.status(400).json({ error: 'Action must be "approve" or "reject".' });
  }

  const result =
    action === 'approve'
      ? await bitGoCustodyService.approveTransaction(String(pendingApprovalId))
      : await bitGoCustodyService.rejectTransaction(String(pendingApprovalId));

  if (!result.success) return res.status(400).json({ error: result.error });

  return res.status(200).json({ success: true, status: result.status });
}
