import type { NextApiRequest, NextApiResponse } from 'next';
import { runFullCycle } from '../../../server/services/ops/operations';

function isAuthorized(req: NextApiRequest): boolean {
  const scanKey = process.env.MIRDT_SCAN_KEY;
  if (!scanKey) return process.env.NODE_ENV === 'development';
  return req.headers['x-scan-key'] === scanKey;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const scanType = req.body?.scanType || 'all';
  const customSteps = req.body?.steps;

  try {
    const result = await runFullCycle(scanType, customSteps);
    return res.status(result.success ? 200 : 207).json(result);
  } catch (err: any) {
    console.error('[run-cycle] Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
