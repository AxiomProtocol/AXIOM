import type { NextApiRequest, NextApiResponse } from 'next';
import { systemStateService } from '../../../lib/services/SystemStateService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_SOLVENCY_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const result = await systemStateService.refreshAll();
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    console.error('[api/treasury/sync]', err?.message);
    return res.status(500).json({ success: false, error: 'Sync failed' });
  }
}
