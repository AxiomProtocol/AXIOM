import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllPools, getPool } from '../../../lib/web3/landAcquisitionService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { poolId } = req.query;

    if (poolId) {
      const pool = await getPool(Number(poolId));
      if (!pool) {
        return res.status(404).json({ error: 'Pool not found' });
      }
      return res.status(200).json(pool);
    }

    const pools = await getAllPools();
    return res.status(200).json({ pools, count: pools.length });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Failed to fetch pools' });
  }
}
