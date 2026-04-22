import type { NextApiRequest, NextApiResponse } from 'next';
import { executePaper } from '../../../server/services/execution/executionService';

function isAuthorized(req: NextApiRequest): boolean {
  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  if (req.headers['x-admin-key'] === adminKey && adminKey) return true;
  if (!adminKey && process.env.NODE_ENV === 'development') return true;
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { intentId } = req.body;
  if (!intentId) {
    return res.status(400).json({ error: 'intentId is required' });
  }

  try {
    const result = await executePaper(intentId);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (err: any) {
    console.error('[execution/execute-paper] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
