import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const metrics = {
      overview: [
        { icon: '👥', label: 'Total Members', value: 2847, trend: 12 },
        { icon: '🔄', label: 'Active Groups', value: 156, trend: 8 },
        { icon: '💰', label: 'Total Saved', value: 1250000, trend: 15 },
        { icon: '🎓', label: 'Graduations', value: 24, trend: 25 }
      ],
      engagement: [
        { label: 'Daily Active Users', value: 68 },
        { label: 'Weekly Retention', value: 82 },
        { label: 'Payment Completion Rate', value: 94 },
        { label: 'Group Participation', value: 76 }
      ],
      financial: [
        { label: 'TVL', value: '$2.1M', subtext: 'Total Value Locked' },
        { label: 'Monthly Volume', value: '$450K', subtext: 'Transaction volume' },
        { label: 'Avg Contribution', value: '$125', subtext: 'Per member per cycle' },
        { label: 'Yield Generated', value: '$89K', subtext: 'This month' }
      ],
      susu: [
        { label: 'Active Circles', value: '156' },
        { label: 'Personal Vault Groups', value: '42' },
        { label: 'Community Pool Groups', value: '114' },
        { label: 'Avg Members/Group', value: '8.2' },
        { label: 'Cycles Completed', value: '1,247' },
        { label: 'On-time Payment Rate', value: '94.2%' }
      ],
      graduation: [
        { label: 'Total Graduated', value: '24' },
        { label: 'Ready to Graduate', value: '12' },
        { label: 'Capital Mode Groups', value: '36' },
        { label: 'Avg Time to Graduate', value: '8.3 months' },
        { label: 'Graduation Rate', value: '67%' },
        { label: 'Post-Graduation Retention', value: '92%' }
      ],
      investments: [
        { label: 'Active Opportunities', value: '6' },
        { label: 'Total Invested', value: '$890K' },
        { label: 'Participating Groups', value: '28' },
        { label: 'Avg Investment Size', value: '$2,400' },
        { label: 'Return Generated', value: '$78K' },
        { label: 'Real Estate Pools', value: '3' }
      ],
      systemHealth: [
        { label: 'API Uptime', value: '99.9%', status: 'healthy' },
        { label: 'Avg Response', value: '142ms', status: 'healthy' },
        { label: 'Smart Contract', value: 'Active', status: 'healthy' },
        { label: 'Node Status', value: '24/24', status: 'healthy' }
      ],
      lastUpdated: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      metrics
    });
  } catch (error: unknown) {
    console.error('Platform metrics error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
