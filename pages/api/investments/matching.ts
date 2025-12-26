import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const opportunities = [
      {
        id: 'inv_001',
        name: 'Atlanta Mixed-Use Development',
        type: 'Real Estate Pool',
        category: 'realestate',
        description: 'Fractional investment in a 50-unit mixed-use development in Atlanta Metro area with retail space.',
        minInvestment: 1000,
        expectedReturn: '8-12% APY',
        duration: '24 months',
        riskLevel: 'Medium',
        status: 'open',
        matchScore: 92,
        totalRaised: 450000,
        targetAmount: 750000
      },
      {
        id: 'inv_002',
        name: 'Axiom Node Network - Batch 4',
        type: 'DePIN Infrastructure',
        category: 'depin',
        description: 'Participate in Axiom\'s decentralized physical infrastructure network with validator nodes.',
        minInvestment: 500,
        expectedReturn: '15-20% APY',
        duration: '12 months',
        riskLevel: 'Medium',
        status: 'open',
        matchScore: 88,
        totalRaised: 120000,
        targetAmount: 200000
      },
      {
        id: 'inv_003',
        name: 'Community Treasury Bond',
        type: 'Treasury Yield',
        category: 'treasury',
        description: 'Stable yield from diversified treasury holdings backing the Axiom ecosystem.',
        minInvestment: 250,
        expectedReturn: '5-7% APY',
        duration: '6 months',
        riskLevel: 'Low',
        status: 'open',
        matchScore: 95,
        totalRaised: 890000,
        targetAmount: 1000000
      },
      {
        id: 'inv_004',
        name: 'Houston Rental Portfolio',
        type: 'Real Estate Pool',
        category: 'realestate',
        description: 'Investment in a curated portfolio of single-family rental properties in Houston suburbs.',
        minInvestment: 2500,
        expectedReturn: '10-14% APY',
        duration: '36 months',
        riskLevel: 'Medium',
        status: 'filling',
        matchScore: 78,
        totalRaised: 680000,
        targetAmount: 800000
      },
      {
        id: 'inv_005',
        name: 'Smart City Sensor Network',
        type: 'DePIN Infrastructure',
        category: 'depin',
        description: 'Fund IoT sensors for smart city data collection with revenue sharing from data licensing.',
        minInvestment: 750,
        expectedReturn: '12-18% APY',
        duration: '18 months',
        riskLevel: 'Medium',
        status: 'open',
        matchScore: 85,
        totalRaised: 95000,
        targetAmount: 300000
      },
      {
        id: 'inv_006',
        name: 'Ecosystem Growth Fund',
        type: 'Treasury Yield',
        category: 'treasury',
        description: 'Long-term fund supporting ecosystem development with quarterly distributions.',
        minInvestment: 1000,
        expectedReturn: '6-9% APY',
        duration: '12 months',
        riskLevel: 'Low',
        status: 'open',
        matchScore: 90,
        totalRaised: 520000,
        targetAmount: 750000
      }
    ];

    return res.status(200).json({
      success: true,
      opportunities,
      summary: {
        totalOpportunities: opportunities.length,
        totalInvestable: opportunities.reduce((sum, o) => sum + (o.targetAmount - o.totalRaised), 0),
        categories: {
          realestate: opportunities.filter(o => o.category === 'realestate').length,
          depin: opportunities.filter(o => o.category === 'depin').length,
          treasury: opportunities.filter(o => o.category === 'treasury').length
        }
      }
    });
  } catch (error: unknown) {
    console.error('Investment matching error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
