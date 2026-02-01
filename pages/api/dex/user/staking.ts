import type { NextApiRequest, NextApiResponse } from 'next';
import dexService from '../../../../server/services/dex/DexService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address, poolId } = req.query;

    if (!address || !poolId) {
      return res.status(400).json({ 
        error: 'Missing required parameters: address, poolId' 
      });
    }

    const position = await dexService.getStakingPosition(
      address as string,
      Number(poolId)
    );

    return res.status(200).json({ position });
  } catch (error) {
    console.error('Error fetching staking position:', error);
    return res.status(500).json({ error: 'Failed to fetch staking position' });
  }
}
