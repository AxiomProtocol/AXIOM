import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sampleGroups = [
      {
        id: 'grp_001',
        name: 'Atlanta Builders Circle',
        memberCount: 12,
        completedCycles: 4,
        totalContributed: 4800,
        graduationProgress: 100,
        stage: 'capital',
        trustScore: 95,
        paymentRate: 98
      },
      {
        id: 'grp_002',
        name: 'Tech Sisters Network',
        memberCount: 8,
        completedCycles: 3,
        totalContributed: 2400,
        graduationProgress: 85,
        stage: 'community',
        trustScore: 88,
        paymentRate: 94
      },
      {
        id: 'grp_003',
        name: 'Brooklyn Wealth Hub',
        memberCount: 15,
        completedCycles: 2,
        totalContributed: 3000,
        graduationProgress: 65,
        stage: 'community',
        trustScore: 75,
        paymentRate: 90
      },
      {
        id: 'grp_004',
        name: 'Houston Entrepreneurs',
        memberCount: 10,
        completedCycles: 5,
        totalContributed: 5000,
        graduationProgress: 100,
        stage: 'graduated',
        trustScore: 98,
        paymentRate: 99
      },
      {
        id: 'grp_005',
        name: 'Chicago Collective',
        memberCount: 6,
        completedCycles: 1,
        totalContributed: 600,
        graduationProgress: 35,
        stage: 'community',
        trustScore: 65,
        paymentRate: 85
      },
      {
        id: 'grp_006',
        name: 'LA Dreams Team',
        memberCount: 20,
        completedCycles: 3,
        totalContributed: 6000,
        graduationProgress: 78,
        stage: 'community',
        trustScore: 82,
        paymentRate: 92
      }
    ];

    return res.status(200).json({
      success: true,
      groups: sampleGroups,
      summary: {
        totalGroups: sampleGroups.length,
        totalMembers: sampleGroups.reduce((sum, g) => sum + g.memberCount, 0),
        totalSaved: sampleGroups.reduce((sum, g) => sum + g.totalContributed, 0),
        averageProgress: Math.round(sampleGroups.reduce((sum, g) => sum + g.graduationProgress, 0) / sampleGroups.length)
      }
    });
  } catch (error: unknown) {
    console.error('Graduation overview error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
