import type { NextApiRequest, NextApiResponse } from 'next';
import { observerService } from '../../../server/services/observer/ObserverService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await observerService.getReports();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      cached: false,
      proofLinks: []
    });
  }
}
