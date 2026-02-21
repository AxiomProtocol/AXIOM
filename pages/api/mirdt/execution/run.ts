import type { NextApiRequest, NextApiResponse } from 'next';
import { runExecutionBatch } from '../../../../server/services/mirdtExecution/engine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  if (!adminKey) return res.status(503).json({ error: 'Execution system not configured' });

  const provided = req.headers['x-admin-key'] as string;
  if (provided !== adminKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await runExecutionBatch('ON_DEMAND');
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[execution/run] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
