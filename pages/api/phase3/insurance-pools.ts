import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { db } from '../../../server/db';
import { kycVerifications } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

const INSURANCE_POOL_HUB_ADDRESS = '0x1553b9B1Ebad0Cb52c6D457bEB2Ee6270A3b5d98';
const AXUSD_ADDRESS = '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c';
const RPC_URL = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';

const INSURANCE_POOL_HUB_ABI = [
  'function getStats() view returns (uint256 _totalPremiums, uint256 _totalClaims, uint256 _poolCount, uint256 _policyCount, uint256 _claimCount)',
  'function getPool(bytes32 poolId) view returns (string name, string coverageType, uint256 totalCoverage, uint256 availableCoverage, uint256 premiumRateBps, uint256 reserves, bool active)',
  'function getUserPolicies(address user) view returns (uint256[])',
  'function policies(uint256 policyId) view returns (bytes32 poolId, address holder, uint256 coverageAmount, uint256 premiumPaid, uint256 startTime, uint256 endTime, bool active, bool claimed)',
  'function getPoolCount() view returns (uint256)',
  'function poolIds(uint256 index) view returns (bytes32)'
];

const POOL_IDS = {
  'smart-contract': '0xdb8a720a3881852b2d545d36ee0eeb50b4a4a34f721ac4de01bf29f698034b5b',
  'stablecoin-depeg': '0x29be364babd329fa9caf6b2a0c98815cc6641ef08a75a9de6b1936094f304a44',
  'liquidation-protection': '0x1eac1dbd925203ae58916f074be424615b374cefab8736af064b8d8fc1c3f347',
  'oracle-failure': '0xced751be3e93333db9a74271b0bd1e8062aede74b5068854816308d08c8245c5'
};

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

async function verifyKYC(address: string): Promise<boolean> {
  try {
    const result = await db.select()
      .from(kycVerifications)
      .where(eq(kycVerifications.walletAddress, address.toLowerCase()))
      .limit(1);
    
    if (result.length > 0 && result[0].verificationStatus === 'verified') {
      return true;
    }
    return false;
  } catch (error) {
    console.error('KYC verification error:', error);
    return false;
  }
}

async function getOnChainPoolData(): Promise<{ pools: InsurancePool[], stats: any }> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(INSURANCE_POOL_HUB_ADDRESS, INSURANCE_POOL_HUB_ABI, provider);

    const stats = await contract.getStats();
    const [totalPremiums, totalClaims, poolCount, policyCount, claimCount] = stats;

    const poolDescriptions: Record<string, { description: string, minCoverage: number, maxCoverage: number }> = {
      'smart-contract': {
        description: 'Protection against smart contract exploits, bugs, and vulnerabilities in Axiom protocol contracts',
        minCoverage: 1000,
        maxCoverage: 500000
      },
      'stablecoin-depeg': {
        description: 'Coverage for losses if AXUSD deviates more than 5% from $1 peg for over 24 hours',
        minCoverage: 500,
        maxCoverage: 1000000
      },
      'liquidation-protection': {
        description: 'Partial coverage for unexpected liquidations due to extreme market volatility',
        minCoverage: 500,
        maxCoverage: 100000
      },
      'oracle-failure': {
        description: 'Protection against losses from oracle manipulation or failure affecting protocol operations',
        minCoverage: 1000,
        maxCoverage: 250000
      }
    };

    const pools: InsurancePool[] = [];
    
    for (const [poolKey, poolIdHex] of Object.entries(POOL_IDS)) {
      try {
        const poolData = await contract.getPool(poolIdHex);
        const [name, coverageType, totalCoverage, availableCoverage, premiumRateBps, reserves, active] = poolData;
        
        if (active) {
          pools.push({
            id: poolKey,
            name,
            coverageType,
            description: poolDescriptions[poolKey]?.description || '',
            totalCoverage: ethers.formatEther(totalCoverage),
            availableCoverage: ethers.formatEther(availableCoverage),
            premiumRate: Number(premiumRateBps) / 100,
            minCoverage: poolDescriptions[poolKey]?.minCoverage || 1000,
            maxCoverage: poolDescriptions[poolKey]?.maxCoverage || 500000,
            activePolicies: Math.floor(Number(policyCount) / Number(poolCount)),
            totalPremiumsPaid: ethers.formatEther(totalPremiums),
            claimsPaid: ethers.formatEther(totalClaims),
            reserves: ethers.formatEther(reserves)
          });
        }
      } catch (e) {
        console.error(`Error fetching pool ${poolKey}:`, e);
      }
    }

    return {
      pools,
      stats: {
        totalPremiums: ethers.formatEther(totalPremiums),
        totalClaims: ethers.formatEther(totalClaims),
        poolCount: Number(poolCount),
        policyCount: Number(policyCount),
        claimCount: Number(claimCount)
      }
    };
  } catch (error) {
    console.error('Error fetching on-chain pool data:', error);
    return {
      pools: [
        {
          id: 'smart-contract',
          name: 'Smart Contract Coverage',
          coverageType: 'Technical Risk',
          description: 'Protection against smart contract exploits',
          totalCoverage: '5000000',
          availableCoverage: '5000000',
          premiumRate: 2.5,
          minCoverage: 1000,
          maxCoverage: 500000,
          activePolicies: 0,
          totalPremiumsPaid: '0',
          claimsPaid: '0',
          reserves: '0'
        }
      ],
      stats: {
        totalPremiums: '0',
        totalClaims: '0',
        poolCount: 4,
        policyCount: 0,
        claimCount: 0
      }
    };
  }
}

async function getUserPolicies(address: string): Promise<UserPolicy[]> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(INSURANCE_POOL_HUB_ADDRESS, INSURANCE_POOL_HUB_ABI, provider);
    
    const policyIds = await contract.getUserPolicies(address);
    const policies: UserPolicy[] = [];

    for (const policyId of policyIds) {
      const policy = await contract.policies(policyId);
      const [poolId, holder, coverageAmount, premiumPaid, startTime, endTime, active, claimed] = policy;
      
      if (active && !claimed) {
        policies.push({
          id: `policy-${policyId}`,
          poolId: Object.entries(POOL_IDS).find(([_, id]) => id === poolId)?.[0] || 'unknown',
          coverageAmount: ethers.formatEther(coverageAmount),
          premiumPaid: ethers.formatEther(premiumPaid),
          expiryDate: new Date(Number(endTime) * 1000).toISOString().split('T')[0],
          status: 'Active'
        });
      }
    }

    return policies;
  } catch (error) {
    console.error('Error fetching user policies:', error);
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { address } = req.query;
    
    const onChainData = await getOnChainPoolData();
    let userPolicies: UserPolicy[] = [];

    if (address && typeof address === 'string') {
      userPolicies = await getUserPolicies(address);
    }

    const totalCoverage = onChainData.pools.reduce((sum, p) => sum + parseFloat(p.totalCoverage), 0);
    const totalReserves = onChainData.pools.reduce((sum, p) => sum + parseFloat(p.reserves), 0);
    const totalPremiums = parseFloat(onChainData.stats.totalPremiums);
    const totalClaims = parseFloat(onChainData.stats.totalClaims);
    
    return res.status(200).json({
      success: true,
      pools: onChainData.pools,
      userPolicies,
      stats: {
        totalCoverage: totalCoverage.toFixed(2),
        totalReserves: totalReserves.toFixed(2),
        totalPremiumsCollected: totalPremiums.toFixed(2),
        totalClaimsPaid: totalClaims.toFixed(2),
        activePolicies: onChainData.stats.policyCount,
        claimRatio: totalPremiums > 0 ? ((totalClaims / totalPremiums) * 100).toFixed(1) : '0.0',
        reserveRatio: totalCoverage > 0 ? ((totalReserves / totalCoverage) * 100).toFixed(1) : '0.0'
      },
      contractAddress: INSURANCE_POOL_HUB_ADDRESS
    });
  }
  
  if (req.method === 'POST') {
    const { action, poolId, coverageAmount, durationMonths, address } = req.body;
    
    if (!action || !poolId || !address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const isKYCVerified = await verifyKYC(address);
    if (!isKYCVerified) {
      return res.status(403).json({ 
        error: 'KYC verification required',
        message: 'Please complete KYC verification before purchasing insurance',
        kycRequired: true
      });
    }
    
    const poolIdHex = POOL_IDS[poolId as keyof typeof POOL_IDS];
    if (!poolIdHex) {
      return res.status(404).json({ error: 'Insurance pool not found' });
    }
    
    if (action === 'purchase') {
      if (!coverageAmount) {
        return res.status(400).json({ error: 'Coverage amount required' });
      }
      
      const months = durationMonths || 12;
      
      return res.status(200).json({
        success: true,
        message: 'Insurance policy purchase prepared',
        contractAddress: INSURANCE_POOL_HUB_ADDRESS,
        requiresApproval: true,
        approvalToken: AXUSD_ADDRESS,
        txData: {
          to: INSURANCE_POOL_HUB_ADDRESS,
          method: 'purchaseCoverage',
          params: [poolIdHex, ethers.parseEther(coverageAmount).toString(), months],
          estimatedGas: '300000'
        }
      });
    }
    
    if (action === 'claim') {
      const { policyId, claimAmount, reason } = req.body;
      if (!policyId || !claimAmount || !reason) {
        return res.status(400).json({ error: 'Policy ID, claim amount, and reason required' });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Claim submission prepared',
        contractAddress: INSURANCE_POOL_HUB_ADDRESS,
        txData: {
          to: INSURANCE_POOL_HUB_ADDRESS,
          method: 'submitClaim',
          params: [policyId, ethers.parseEther(claimAmount).toString(), reason],
          estimatedGas: '200000'
        }
      });
    }
    
    return res.status(400).json({ error: 'Invalid action' });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
