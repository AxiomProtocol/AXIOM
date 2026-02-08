import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { db } from '../../../server/db';
import { kycVerifications, users } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

const TREASURY_NOTE_TOKEN_ADDRESS = '0x712640Fde009a7FB0c3668e9eFb9AD5Bf67bEAbd';
const AXUSD_ADDRESS = '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c';
const RPC_URL = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';

const TREASURY_NOTE_TOKEN_ABI = [
  'function getStats() view returns (uint256 _totalOutstanding, uint256 _totalInvested, uint256 _totalCouponsPaid, uint256 _seriesCount)',
  'function getSeries(uint256 seriesId) view returns (string name, string seriesCode, uint256 maturityMonths, uint256 couponRateBps, uint256 totalIssued, uint256 maxIssuance, bool active)',
  'function getSeriesCount() view returns (uint256)',
  'function kycApproved(address) view returns (bool)',
  'function accreditedInvestor(address) view returns (bool)',
  'function getHoldingCount(address investor) view returns (uint256)',
  'function getHolding(address investor, uint256 holdingIndex) view returns (uint256 seriesId, uint256 principal, uint256 purchaseTime, uint256 maturityTime, uint256 pendingCoupon)'
];

interface TreasuryNote {
  id: string;
  name: string;
  series: string;
  maturityMonths: number;
  couponRate: number;
  minInvestment: number;
  maxInvestment: number;
  totalIssued: string;
  totalOutstanding: string;
  nextCouponDate: string;
  status: string;
  riskRating: string;
  backingAssets: string[];
}

interface UserHolding {
  id: string;
  seriesId: number;
  noteId: string;
  principal: string;
  purchaseDate: string;
  maturityDate: string;
  pendingCoupon: string;
  status: string;
}

async function verifyKYCAndAccreditation(address: string): Promise<{ kyc: boolean, accredited: boolean }> {
  try {
    const user = await db.select()
      .from(users)
      .where(eq(users.walletAddress, address.toLowerCase()))
      .limit(1);

    if (user.length === 0) return { kyc: false, accredited: false };

    const result = await db.select()
      .from(kycVerifications)
      .where(eq(kycVerifications.userId, user[0].id))
      .limit(1);
    
    if (result.length > 0) {
      const verification = result[0];
      return {
        kyc: verification.verificationStatus === 'approved',
        accredited: verification.riskLevel === 'low'
      };
    }
    return { kyc: false, accredited: false };
  } catch (error) {
    console.error('KYC verification error:', error);
    return { kyc: false, accredited: false };
  }
}

async function checkOnChainKYC(address: string): Promise<{ kyc: boolean, accredited: boolean }> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(TREASURY_NOTE_TOKEN_ADDRESS, TREASURY_NOTE_TOKEN_ABI, provider);
    
    const [kycApproved, accreditedInvestor] = await Promise.all([
      contract.kycApproved(address),
      contract.accreditedInvestor(address)
    ]);
    
    return { kyc: kycApproved, accredited: accreditedInvestor };
  } catch (error) {
    console.error('On-chain KYC check error:', error);
    return { kyc: false, accredited: false };
  }
}

const NOTE_CONFIGS: Record<number, { id: string, minInvestment: number, maxInvestment: number, riskRating: string, backingAssets: string[] }> = {
  1: {
    id: 'axn-6m-a',
    minInvestment: 1000,
    maxInvestment: 100000,
    riskRating: 'A',
    backingAssets: ['AXUSD Reserves', 'Mortgage Note Pool', 'Treasury Operations']
  },
  2: {
    id: 'axn-12m-a',
    minInvestment: 2500,
    maxInvestment: 250000,
    riskRating: 'A',
    backingAssets: ['AXUSD Reserves', 'Real Estate Portfolio', 'Protocol Revenue']
  },
  3: {
    id: 'axn-24m-a',
    minInvestment: 5000,
    maxInvestment: 500000,
    riskRating: 'A-',
    backingAssets: ['AXUSD Reserves', 'Land Portfolio', 'Infrastructure Revenue', 'Protocol Treasury']
  },
  4: {
    id: 'axn-36m-institutional',
    minInvestment: 50000,
    maxInvestment: 2000000,
    riskRating: 'A-',
    backingAssets: ['Full Protocol Treasury', 'Real Asset Portfolio', 'Revenue Streams', 'Insurance Reserves']
  }
};

async function getOnChainNoteData(): Promise<{ notes: TreasuryNote[], stats: Record<string, string | number> }> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(TREASURY_NOTE_TOKEN_ADDRESS, TREASURY_NOTE_TOKEN_ABI, provider);

    const stats = await contract.getStats();
    const [totalOutstanding, totalInvested, totalCouponsPaid, seriesCount] = stats;

    const notes: TreasuryNote[] = [];
    const now = new Date();
    const nextQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3 + 1) * 3, 1);

    for (let i = 1; i <= Number(seriesCount); i++) {
      try {
        const series = await contract.getSeries(i);
        const [name, seriesCode, maturityMonths, couponRateBps, totalIssued, maxIssuance, active] = series;
        
        if (active) {
          const config = NOTE_CONFIGS[i] || NOTE_CONFIGS[1];
          notes.push({
            id: config.id,
            name,
            series: seriesCode,
            maturityMonths: Number(maturityMonths),
            couponRate: Number(couponRateBps) / 100,
            minInvestment: config.minInvestment,
            maxInvestment: config.maxInvestment,
            totalIssued: ethers.formatEther(totalIssued),
            totalOutstanding: ethers.formatEther(totalIssued),
            nextCouponDate: nextQuarter.toISOString().split('T')[0],
            status: 'Open',
            riskRating: config.riskRating,
            backingAssets: config.backingAssets
          });
        }
      } catch (e) {
        console.error(`Error fetching series ${i}:`, e);
      }
    }

    return {
      notes,
      stats: {
        totalOutstanding: ethers.formatEther(totalOutstanding),
        totalInvested: ethers.formatEther(totalInvested),
        totalCouponsPaid: ethers.formatEther(totalCouponsPaid),
        seriesCount: Number(seriesCount)
      }
    };
  } catch (error) {
    console.error('Error fetching on-chain note data:', error);
    return {
      notes: [
        {
          id: 'axn-6m-a',
          name: 'Axiom 6-Month Note Series A',
          series: 'AXN-6M-A',
          maturityMonths: 6,
          couponRate: 6.0,
          minInvestment: 1000,
          maxInvestment: 100000,
          totalIssued: '0',
          totalOutstanding: '0',
          nextCouponDate: '2026-04-01',
          status: 'Open',
          riskRating: 'A',
          backingAssets: ['AXUSD Reserves', 'Mortgage Note Pool', 'Treasury Operations']
        }
      ],
      stats: {
        totalOutstanding: '0',
        totalInvested: '0',
        totalCouponsPaid: '0',
        seriesCount: 4
      }
    };
  }
}

async function getUserHoldings(address: string): Promise<UserHolding[]> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(TREASURY_NOTE_TOKEN_ADDRESS, TREASURY_NOTE_TOKEN_ABI, provider);
    
    const holdingCount = await contract.getHoldingCount(address);
    const holdings: UserHolding[] = [];

    for (let i = 0; i < Number(holdingCount); i++) {
      const holding = await contract.getHolding(address, i);
      const [seriesId, principal, purchaseTime, maturityTime, pendingCoupon] = holding;
      
      if (Number(principal) > 0) {
        const config = NOTE_CONFIGS[Number(seriesId)] || NOTE_CONFIGS[1];
        holdings.push({
          id: `hold-${i}`,
          seriesId: Number(seriesId),
          noteId: config.id,
          principal: ethers.formatEther(principal),
          purchaseDate: new Date(Number(purchaseTime) * 1000).toISOString().split('T')[0],
          maturityDate: new Date(Number(maturityTime) * 1000).toISOString().split('T')[0],
          pendingCoupon: ethers.formatEther(pendingCoupon),
          status: Number(maturityTime) * 1000 > Date.now() ? 'Active' : 'Matured'
        });
      }
    }

    return holdings;
  } catch (error) {
    console.error('Error fetching user holdings:', error);
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { address } = req.query;
    
    const onChainData = await getOnChainNoteData();
    let userHoldings: UserHolding[] = [];
    let investorStatus = { kyc: false, accredited: false };

    if (address && typeof address === 'string') {
      userHoldings = await getUserHoldings(address);
      investorStatus = await verifyKYCAndAccreditation(address);
      
      if (!investorStatus.kyc) {
        const onChainStatus = await checkOnChainKYC(address);
        investorStatus = onChainStatus;
      }
    }

    const totalOutstanding = parseFloat(String(onChainData.stats.totalOutstanding));
    const totalInvested = parseFloat(String(onChainData.stats.totalInvested));
    const avgCouponRate = onChainData.notes.length > 0 
      ? onChainData.notes.reduce((sum, n) => sum + n.couponRate, 0) / onChainData.notes.length 
      : 0;

    const now = new Date();
    const nextQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3 + 1) * 3, 1);
    
    return res.status(200).json({
      success: true,
      notes: onChainData.notes,
      userHoldings,
      investorStatus,
      stats: {
        totalOutstanding: totalOutstanding.toFixed(2),
        totalIssued: totalInvested.toFixed(2),
        avgCouponRate: avgCouponRate.toFixed(1),
        totalInvestors: userHoldings.length > 0 ? 1 : 0,
        nextDistribution: nextQuarter.toISOString().split('T')[0],
        quarterlyDistributions: onChainData.stats.totalCouponsPaid
      },
      contractAddress: TREASURY_NOTE_TOKEN_ADDRESS
    });
  }
  
  if (req.method === 'POST') {
    const { action, noteId, seriesId, amount, address } = req.body;
    
    if (!action || !address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const investorStatus = await verifyKYCAndAccreditation(address);
    
    if (!investorStatus.kyc) {
      return res.status(403).json({ 
        error: 'KYC verification required',
        message: 'Treasury Notes are SEC Reg D 506(c) securities requiring KYC verification',
        kycRequired: true
      });
    }

    if (!investorStatus.accredited) {
      return res.status(403).json({ 
        error: 'Accredited investor status required',
        message: 'Treasury Notes are only available to accredited investors under SEC Reg D 506(c)',
        accreditationRequired: true
      });
    }

    const seriesIdNum = seriesId || (noteId === 'axn-6m-a' ? 1 : noteId === 'axn-12m-a' ? 2 : noteId === 'axn-24m-a' ? 3 : 4);
    const config = NOTE_CONFIGS[seriesIdNum];
    
    if (!config) {
      return res.status(404).json({ error: 'Treasury note series not found' });
    }
    
    if (action === 'purchase') {
      if (!amount) {
        return res.status(400).json({ error: 'Investment amount required' });
      }
      
      const investmentAmount = parseFloat(amount);
      if (investmentAmount < config.minInvestment) {
        return res.status(400).json({ 
          error: `Minimum investment is $${config.minInvestment.toLocaleString()}`
        });
      }
      
      if (investmentAmount > config.maxInvestment) {
        return res.status(400).json({ 
          error: `Maximum investment is $${config.maxInvestment.toLocaleString()}`
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Treasury note purchase prepared',
        contractAddress: TREASURY_NOTE_TOKEN_ADDRESS,
        requiresApproval: true,
        approvalToken: AXUSD_ADDRESS,
        txData: {
          to: TREASURY_NOTE_TOKEN_ADDRESS,
          method: 'purchaseNotes',
          params: [seriesIdNum, ethers.parseEther(amount).toString()],
          estimatedGas: '350000'
        }
      });
    }
    
    if (action === 'claim-coupon') {
      const { holdingIndex } = req.body;
      if (holdingIndex === undefined) {
        return res.status(400).json({ error: 'Holding index required' });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Coupon claim prepared',
        contractAddress: TREASURY_NOTE_TOKEN_ADDRESS,
        txData: {
          to: TREASURY_NOTE_TOKEN_ADDRESS,
          method: 'claimCoupon',
          params: [holdingIndex],
          estimatedGas: '200000'
        }
      });
    }
    
    if (action === 'redeem') {
      const { holdingIndex } = req.body;
      if (holdingIndex === undefined) {
        return res.status(400).json({ error: 'Holding index required' });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Redemption prepared',
        contractAddress: TREASURY_NOTE_TOKEN_ADDRESS,
        txData: {
          to: TREASURY_NOTE_TOKEN_ADDRESS,
          method: 'redeemAtMaturity',
          params: [holdingIndex],
          estimatedGas: '250000'
        }
      });
    }
    
    return res.status(400).json({ error: 'Invalid action' });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
