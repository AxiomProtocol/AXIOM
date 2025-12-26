import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const analytics = {
      overallScore: 87,
      trend: 'up',
      trendValue: 3,
      metrics: [
        {
          label: 'Payment Consistency',
          score: 94,
          icon: '💳',
          description: 'On-time payment rate over last 6 months'
        },
        {
          label: 'Member Participation',
          score: 82,
          icon: '👥',
          description: 'Active engagement in group activities'
        },
        {
          label: 'Communication Score',
          score: 88,
          icon: '💬',
          description: 'Response time and engagement quality'
        },
        {
          label: 'Cycle Completion',
          score: 90,
          icon: '🔄',
          description: 'Successfully completed savings cycles'
        },
        {
          label: 'Dispute Resolution',
          score: 78,
          icon: '🤝',
          description: 'Handling of conflicts and issues'
        }
      ],
      insights: [
        {
          type: 'positive',
          message: 'Payment consistency improved 5% this month'
        },
        {
          type: 'positive',
          message: '3 consecutive cycles completed without issues'
        },
        {
          type: 'warning',
          message: '2 members have reduced participation recently'
        },
        {
          type: 'info',
          message: 'Group is on track for Capital Mode qualification'
        }
      ],
      nextMilestone: 'Complete 5 cycles for Gold Trust Badge',
      history: [
        { month: 'Jul', score: 75 },
        { month: 'Aug', score: 78 },
        { month: 'Sep', score: 82 },
        { month: 'Oct', score: 84 },
        { month: 'Nov', score: 84 },
        { month: 'Dec', score: 87 }
      ]
    };

    return res.status(200).json({
      success: true,
      analytics
    });
  } catch (error: unknown) {
    console.error('Trust analytics error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
