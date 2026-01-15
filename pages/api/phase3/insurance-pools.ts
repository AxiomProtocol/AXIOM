import type { NextApiRequest, NextApiResponse } from 'next';

interface InsurancePool {
  id: string;
  name: string;
  coverageType: string;
  description: string;
  totalCoverage: string;
  availableCoverage: string;
  premiumRate: number;
  minCoverage: number;
  maxCoverage: number;
  activePolicies: number;
  totalPremiumsPaid: string;
  claimsPaid: string;
  reserves: string;
}

interface UserPolicy {
  id: string;
  poolId: string;
  coverageAmount: string;
  premiumPaid: string;
  expiryDate: string;
  status: string;
}

const insurancePools: InsurancePool[] = [
  {
    id: 'smart-contract',
    name: 'Smart Contract Coverage',
    coverageType: 'Technical Risk',
    description: 'Protection against smart contract exploits, bugs, and vulnerabilities in Axiom protocol contracts',
    totalCoverage: '5000000',
    availableCoverage: '3200000',
    premiumRate: 2.5,
    minCoverage: 1000,
    maxCoverage: 500000,
    activePolicies: 234,
    totalPremiumsPaid: '125000',
    claimsPaid: '0',
    reserves: '1800000'
  },
  {
    id: 'stablecoin-depeg',
    name: 'AXUSD Depeg Protection',
    coverageType: 'Peg Risk',
    description: 'Coverage for losses if AXUSD deviates more than 5% from $1 peg for over 24 hours',
    totalCoverage: '10000000',
    availableCoverage: '7500000',
    premiumRate: 1.8,
    minCoverage: 500,
    maxCoverage: 1000000,
    activePolicies: 412,
    totalPremiumsPaid: '180000',
    claimsPaid: '0',
    reserves: '2500000'
  },
  {
    id: 'liquidation-protection',
    name: 'Liquidation Protection',
    coverageType: 'Position Risk',
    description: 'Partial coverage for unexpected liquidations due to extreme market volatility',
    totalCoverage: '2000000',
    availableCoverage: '1400000',
    premiumRate: 4.0,
    minCoverage: 500,
    maxCoverage: 100000,
    activePolicies: 89,
    totalPremiumsPaid: '56000',
    claimsPaid: '12000',
    reserves: '600000'
  },
  {
    id: 'oracle-failure',
    name: 'Oracle Failure Coverage',
    coverageType: 'Infrastructure Risk',
    description: 'Protection against losses from oracle manipulation or failure affecting protocol operations',
    totalCoverage: '3000000',
    availableCoverage: '2600000',
    premiumRate: 3.0,
    minCoverage: 1000,
    maxCoverage: 250000,
    activePolicies: 156,
    totalPremiumsPaid: '78000',
    claimsPaid: '0',
    reserves: '400000'
  }
];

const sampleUserPolicies: UserPolicy[] = [
  {
    id: 'policy-1',
    poolId: 'smart-contract',
    coverageAmount: '25000',
    premiumPaid: '625',
    expiryDate: '2026-12-31',
    status: 'Active'
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { address } = req.query;
    
    const totalCoverage = insurancePools.reduce((sum, p) => sum + parseFloat(p.totalCoverage), 0);
    const totalReserves = insurancePools.reduce((sum, p) => sum + parseFloat(p.reserves), 0);
    const totalPremiums = insurancePools.reduce((sum, p) => sum + parseFloat(p.totalPremiumsPaid), 0);
    const totalClaims = insurancePools.reduce((sum, p) => sum + parseFloat(p.claimsPaid), 0);
    const totalPolicies = insurancePools.reduce((sum, p) => sum + p.activePolicies, 0);
    
    return res.status(200).json({
      success: true,
      pools: insurancePools,
      userPolicies: address ? sampleUserPolicies : [],
      stats: {
        totalCoverage: totalCoverage.toFixed(2),
        totalReserves: totalReserves.toFixed(2),
        totalPremiumsCollected: totalPremiums.toFixed(2),
        totalClaimsPaid: totalClaims.toFixed(2),
        activePolicies: totalPolicies,
        claimRatio: ((totalClaims / totalPremiums) * 100).toFixed(1),
        reserveRatio: ((totalReserves / totalCoverage) * 100).toFixed(1)
      }
    });
  }
  
  if (req.method === 'POST') {
    const { action, poolId, coverageAmount, address } = req.body;
    
    if (!action || !poolId || !address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const pool = insurancePools.find(p => p.id === poolId);
    if (!pool) {
      return res.status(404).json({ error: 'Insurance pool not found' });
    }
    
    if (action === 'purchase') {
      if (!coverageAmount) {
        return res.status(400).json({ error: 'Coverage amount required' });
      }
      
      const premium = (parseFloat(coverageAmount) * pool.premiumRate / 100).toFixed(2);
      
      return res.status(200).json({
        success: true,
        message: 'Insurance policy purchase initiated',
        premium,
        txData: {
          to: '0x8616E8EA83f048ab9A5eC513c9412dd2993bcE3F',
          data: '0x',
          value: '0',
          estimatedGas: '180000'
        }
      });
    }
    
    if (action === 'claim') {
      return res.status(200).json({
        success: true,
        message: 'Claim submitted for review',
        claimId: `CLM-${Date.now()}`
      });
    }
    
    return res.status(400).json({ error: 'Invalid action' });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
