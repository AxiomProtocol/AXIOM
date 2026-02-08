import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    res.json({
      success: true,
      data: {
        landOptions: {
          total: 0,
          active: 0,
          totalValue: '0.00'
        },
        crowdfunding: {
          total: 0,
          live: 0,
          totalRaised: '0.00',
          investors: 0
        },
        pools: {
          total: 0,
          active: 0,
          totalPooled: '0.00',
          members: 0
        },
        regCF: {
          maxRaise: 5000000,
          maxNonAccredited: 124000,
          complianceStatus: 'active'
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Stats fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      details: error.message
    });
  }
}
