import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const stats = {
      success: true,
      activeNodes: 0,
      totalNodes: 0,
      totalRewardsDistributed: '0',
      totalStaked: '0',
      apyRange: {
        min: 8,
        max: 45,
        display: '8-45%'
      },
      nodeTypes: {
        lite: { count: 0, name: 'Lite Nodes' },
        standard: { count: 0, name: 'Standard Nodes' },
        pro: { count: 0, name: 'Pro Operators' }
      },
      network: 'Arbitrum One',
      chainId: 42161,
      lastUpdated: new Date().toISOString()
    };

    res.status(200).json(stats);
  } catch (error: any) {
    console.error('DePIN stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch stats',
      activeNodes: 0,
      totalRewardsDistributed: '0',
      apyRange: { display: '8-45%' }
    });
  }
}
