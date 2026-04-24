import type { NextApiRequest, NextApiResponse } from 'next';
import { getSIWESession } from '../../../lib/middleware/siweAuth';
import { isAuthorizedReviewer } from '../../../lib/reviewerAuth';
import { runBenchmarkCalibration } from '../../../server/services/cost-intelligence/calibrator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  if (!isAuthorizedReviewer(session.address)) {
    return res.status(403).json({ error: 'Calibration requires reviewer authorization.', code: 'REVIEWER_NOT_AUTHORIZED' });
  }

  const { dryRun = false } = req.body || {};

  try {
    const result = await runBenchmarkCalibration({ dryRun: Boolean(dryRun) });
    return res.status(200).json({ success: true, dryRun: Boolean(dryRun), ...result });
  } catch (err: any) {
    console.error('Calibration error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
