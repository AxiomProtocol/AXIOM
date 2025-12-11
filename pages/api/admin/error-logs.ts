import type { NextApiRequest, NextApiResponse } from 'next';
import { getRecentErrors, getErrorsByLevel, clearLogs } from '../../../lib/errorLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { level, limit = '50' } = req.query;
    const parsedLimit = parseInt(limit as string, 10) || 50;

    if (level && typeof level === 'string') {
      const logs = getErrorsByLevel(level as 'error' | 'warn' | 'info', parsedLimit);
      return res.status(200).json({ logs, count: logs.length });
    }

    const logs = getRecentErrors(parsedLimit);
    return res.status(200).json({ logs, count: logs.length });
  }

  if (req.method === 'DELETE') {
    clearLogs();
    return res.status(200).json({ message: 'Logs cleared' });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
