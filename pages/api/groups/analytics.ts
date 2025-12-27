import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const groups = [
      {
        id: '1',
        name: 'Prosperity Circle',
        members: 12,
        completionRate: 98,
        avgPaymentTime: '2 days early',
        totalCycles: 6,
        currentCycle: 4,
        status: 'active' as const,
        trustScore: 92
      },
      {
        id: '2',
        name: 'Wealth Builders United',
        members: 8,
        completionRate: 95,
        avgPaymentTime: '1 day early',
        totalCycles: 4,
        currentCycle: 3,
        status: 'active' as const,
        trustScore: 88
      },
      {
        id: '3',
        name: 'Financial Freedom Group',
        members: 10,
        completionRate: 92,
        avgPaymentTime: 'On time',
        totalCycles: 12,
        currentCycle: 12,
        status: 'graduated' as const,
        trustScore: 95
      },
      {
        id: '4',
        name: 'New Horizons',
        members: 6,
        completionRate: 88,
        avgPaymentTime: '3 days early',
        totalCycles: 6,
        currentCycle: 2,
        status: 'active' as const,
        trustScore: 75
      },
      {
        id: '5',
        name: 'Community Savers',
        members: 15,
        completionRate: 85,
        avgPaymentTime: 'On time',
        totalCycles: 8,
        currentCycle: 5,
        status: 'active' as const,
        trustScore: 80
      },
      {
        id: '6',
        name: 'Rising Stars',
        members: 4,
        completionRate: 0,
        avgPaymentTime: 'N/A',
        totalCycles: 6,
        currentCycle: 0,
        status: 'forming' as const,
        trustScore: 50
      }
    ];

    return res.status(200).json({
      success: true,
      groups,
      totalGroups: groups.length,
      activeGroups: groups.filter(g => g.status === 'active').length
    });
  } catch (error: any) {
    console.error('Group analytics error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch group analytics'
    });
  }
}
