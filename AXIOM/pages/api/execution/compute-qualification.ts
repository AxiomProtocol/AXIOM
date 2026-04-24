import type { NextApiRequest, NextApiResponse } from 'next';
import { computeQualification } from '../../../server/services/execution/qualificationEngine';

function isAuthorized(req: NextApiRequest): boolean {
  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  if (req.headers['x-admin-key'] === adminKey && adminKey) return true;
  if (!adminKey && process.env.NODE_ENV === 'development') return true;
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { userId, walletAddress } = req.body;
  if (!userId || !walletAddress) {
    return res.status(400).json({ error: 'userId and walletAddress are required' });
  }

  try {
    const result = await computeQualification({ userId, walletAddress });
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[execution/compute-qualification] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
