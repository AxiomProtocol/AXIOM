import type { NextApiRequest, NextApiResponse } from 'next';
import { getExecutionsByUser, getIntentsByUser } from '../../../server/services/execution/executionService';

function isAuthorized(req: NextApiRequest): boolean {
  const adminKey = process.env.ADMIN_SOLVENCY_KEY;
  if (req.headers['x-admin-key'] === adminKey && adminKey) return true;
  if (!adminKey && process.env.NODE_ENV === 'development') return true;
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const userId = req.query.userId as string;
  const type = (req.query.type as string) || 'executions';
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const status = req.query.status as string | undefined;

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter is required' });
  }

  try {
    if (type === 'intents') {
      const result = await getIntentsByUser(userId, page, limit, status);
      return res.status(200).json(result);
    } else {
      const result = await getExecutionsByUser(userId, page, limit, status);
      return res.status(200).json(result);
    }
  } catch (err: any) {
    console.error('[execution/history] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
