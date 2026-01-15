import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { db } from '../../../server/db';
import { kycVerifications } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

const CREDIT_LINE_VAULT_ADDRESS = '0xc997416666686A22EBAE8Eb7cc9224c10B08a35c';
const AXM_ADDRESS = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';
const RPC_URL = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';

const CREDIT_LINE_VAULT_ABI = [
  'function totalBorrowed() view returns (uint256)',
  'function totalCollateralValue() view returns (uint256)',
  'function getPositionCount(address user) view returns (uint256)',
  'function getPosition(address user, uint256 positionIndex) view returns (bytes32 collateralId, uint256 collateralAmount, uint256 borrowedAmount, uint256 accruedInterest, bool active)',
  'function getHealthFactor(address user, uint256 positionIndex) view returns (uint256)',
  'function collateralTypes(bytes32 id) view returns (address token, string symbol, uint256 maxLTV, uint256 liquidationThreshold, uint256 interestRateBps, uint256 minCollateral, uint256 priceUsd, bool active)',
  'function getCollateralTypeCount() view returns (uint256)',
  'function collateralIds(uint256 index) view returns (bytes32)'
];

interface CreditLine {
  id: string;
  collateralType: string;
  collateralSymbol: string;
  maxLTV: number;
  interestRate: number;
  liquidationThreshold: number;
  minCollateral: number;
  available: boolean;
  totalBorrowed: string;
  totalCollateral: string;
}

interface UserPosition {
  id: string;
  positionIndex: number;
  collateralType: string;
  collateralAmount: string;
  borrowedAmount: string;
  healthFactor: number;
  interestAccrued: string;
  active: boolean;
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

async function getOnChainData() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CREDIT_LINE_VAULT_ADDRESS, CREDIT_LINE_VAULT_ABI, provider);

    const [totalBorrowed, totalCollateralValue] = await Promise.all([
      contract.totalBorrowed(),
      contract.totalCollateralValue()
    ]);

    const creditLines: CreditLine[] = [
      {
        id: 'axm-credit',
        collateralType: 'AXM Token',
        collateralSymbol: 'AXM',
        maxLTV: 50,
        interestRate: 8.5,
        liquidationThreshold: 65,
        minCollateral: 1000,
        available: true,
        totalBorrowed: ethers.formatEther(totalBorrowed),
        totalCollateral: ethers.formatEther(totalCollateralValue)
      },
      {
        id: 'seed-credit',
        collateralType: 'SEED Locked Position',
        collateralSymbol: 'SEED',
        maxLTV: 60,
        interestRate: 6.5,
        liquidationThreshold: 75,
        minCollateral: 500,
        available: true,
        totalBorrowed: '0',
        totalCollateral: '0'
      },
      {
        id: 'lp-credit',
        collateralType: 'Camelot LP Tokens',
        collateralSymbol: 'AXM-ETH LP',
        maxLTV: 45,
        interestRate: 9.0,
        liquidationThreshold: 60,
        minCollateral: 100,
        available: true,
        totalBorrowed: '0',
        totalCollateral: '0'
      },
      {
        id: 'land-credit',
        collateralType: 'Land Option NFT',
        collateralSymbol: 'LAND-OPT',
        maxLTV: 40,
        interestRate: 10.0,
        liquidationThreshold: 55,
        minCollateral: 1,
        available: true,
        totalBorrowed: '0',
        totalCollateral: '0'
      }
    ];

    return {
      creditLines,
      totalBorrowed: ethers.formatEther(totalBorrowed),
      totalCollateral: ethers.formatEther(totalCollateralValue)
    };
  } catch (error) {
    console.error('Error fetching on-chain data:', error);
    return {
      creditLines: [
        {
          id: 'axm-credit',
          collateralType: 'AXM Token',
          collateralSymbol: 'AXM',
          maxLTV: 50,
          interestRate: 8.5,
          liquidationThreshold: 65,
          minCollateral: 1000,
          available: true,
          totalBorrowed: '0',
          totalCollateral: '0'
        }
      ],
      totalBorrowed: '0',
      totalCollateral: '0'
    };
  }
}

async function getUserPositions(address: string): Promise<UserPosition[]> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CREDIT_LINE_VAULT_ADDRESS, CREDIT_LINE_VAULT_ABI, provider);
    
    const positionCount = await contract.getPositionCount(address);
    const positions: UserPosition[] = [];

    for (let i = 0; i < Number(positionCount); i++) {
      const [collateralId, collateralAmount, borrowedAmount, accruedInterest, active] = 
        await contract.getPosition(address, i);
      
      if (active) {
        const healthFactor = await contract.getHealthFactor(address, i);
        positions.push({
          id: `pos-${i}`,
          positionIndex: i,
          collateralType: 'AXM Token',
          collateralAmount: ethers.formatEther(collateralAmount),
          borrowedAmount: ethers.formatEther(borrowedAmount),
          healthFactor: Number(ethers.formatEther(healthFactor)),
          interestAccrued: ethers.formatEther(accruedInterest),
          active: true
        });
      }
    }

    return positions;
  } catch (error) {
    console.error('Error fetching user positions:', error);
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { address } = req.query;
    
    const onChainData = await getOnChainData();
    let userPositions: UserPosition[] = [];

    if (address && typeof address === 'string') {
      userPositions = await getUserPositions(address);
    }

    const totalValueLocked = parseFloat(onChainData.totalCollateral);
    const totalBorrowed = parseFloat(onChainData.totalBorrowed);
    const avgInterestRate = onChainData.creditLines.reduce((sum, cl) => sum + cl.interestRate, 0) / onChainData.creditLines.length;
    
    return res.status(200).json({
      success: true,
      creditLines: onChainData.creditLines,
      userPositions,
      stats: {
        totalValueLocked: totalValueLocked.toFixed(2),
        totalBorrowed: totalBorrowed.toFixed(2),
        utilizationRate: totalValueLocked > 0 ? ((totalBorrowed / totalValueLocked) * 100).toFixed(1) : '0.0',
        avgInterestRate: avgInterestRate.toFixed(1),
        activePositions: userPositions.length,
        healthyPositions: userPositions.filter(p => p.healthFactor > 1.2).length
      },
      contractAddress: CREDIT_LINE_VAULT_ADDRESS
    });
  }
  
  if (req.method === 'POST') {
    const { action, collateralType, amount, address } = req.body;
    
    if (!action || !collateralType || !amount || !address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const isKYCVerified = await verifyKYC(address);
    if (!isKYCVerified) {
      return res.status(403).json({ 
        error: 'KYC verification required',
        message: 'Please complete KYC verification before using credit lines',
        kycRequired: true
      });
    }
    
    if (action === 'borrow') {
      return res.status(200).json({
        success: true,
        message: 'Borrow request prepared',
        contractAddress: CREDIT_LINE_VAULT_ADDRESS,
        txData: {
          to: CREDIT_LINE_VAULT_ADDRESS,
          method: 'borrow',
          params: [0, ethers.parseEther(amount).toString()],
          estimatedGas: '250000'
        }
      });
    }
    
    if (action === 'repay') {
      return res.status(200).json({
        success: true,
        message: 'Repayment prepared',
        contractAddress: CREDIT_LINE_VAULT_ADDRESS,
        txData: {
          to: CREDIT_LINE_VAULT_ADDRESS,
          method: 'repay',
          params: [0, ethers.parseEther(amount).toString()],
          estimatedGas: '200000'
        }
      });
    }
    
    if (action === 'add-collateral') {
      const collateralId = ethers.keccak256(ethers.toUtf8Bytes('axm-credit'));
      return res.status(200).json({
        success: true,
        message: 'Add collateral prepared',
        contractAddress: CREDIT_LINE_VAULT_ADDRESS,
        requiresApproval: true,
        approvalToken: AXM_ADDRESS,
        txData: {
          to: CREDIT_LINE_VAULT_ADDRESS,
          method: 'depositCollateral',
          params: [collateralId, ethers.parseEther(amount).toString()],
          estimatedGas: '300000'
        }
      });
    }
    
    return res.status(400).json({ error: 'Invalid action' });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
