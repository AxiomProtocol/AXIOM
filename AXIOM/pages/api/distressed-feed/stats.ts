import type { NextApiRequest, NextApiResponse } from 'next';
import { getFeedStats } from '../../../lib/distressed-feed/ingestion';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const stats = await getFeedStats();
    return res.json({ stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to fetch stats', detail: message });
  }
}
