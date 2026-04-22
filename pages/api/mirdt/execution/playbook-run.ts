import type { NextApiRequest, NextApiResponse } from 'next';
import { runExecutionBatch } from '../../../../server/services/mirdtExecution/engine';

function isAuthorized(req: NextApiRequest): boolean {
  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  if (req.headers['x-admin-key'] === adminKey && adminKey) return true;
  if (!adminKey && process.env.NODE_ENV === 'development') return true;
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized — admin key required' });
  }

  try {
    const result = await runExecutionBatch('ON_DEMAND');
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[execution/playbook-run] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
