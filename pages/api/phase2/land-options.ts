import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllLandOptions, getLandOption, getPlatformStats, testContractConnectivity } from '../../../lib/web3/landAcquisitionService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { optionId, test } = req.query;

    if (test === 'connectivity') {
      const connectivity = await testContractConnectivity();
      return res.status(200).json({ connectivity });
    }

    if (optionId) {
      const option = await getLandOption(Number(optionId));
      if (!option) {
        return res.status(404).json({ error: 'Land option not found' });
      }
      return res.status(200).json(option);
    }

    const [options, stats] = await Promise.all([
      getAllLandOptions(),
      getPlatformStats()
    ]);

    return res.status(200).json({ 
      options, 
      stats,
      count: options.length 
    });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Failed to fetch land options' });
  }
}
