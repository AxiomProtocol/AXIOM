import type { NextApiRequest, NextApiResponse } from 'next';
import { getNodeEconomyService, ReadinessStatus } from '../../../lib/contracts/node-economy';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReadinessStatus | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const service = getNodeEconomyService();
    const readinessStatus = await service.getReadinessStatus();
    
    return res.status(200).json(readinessStatus);
  } catch (error) {
    console.error('Error fetching readiness status:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
