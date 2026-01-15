import type { NextApiRequest, NextApiResponse } from 'next';

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
  collateralType: string;
  collateralAmount: string;
  borrowedAmount: string;
  healthFactor: number;
  liquidationPrice: string;
  interestAccrued: string;
}

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
    totalBorrowed: '1250000',
    totalCollateral: '3500000'
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
    totalBorrowed: '850000',
    totalCollateral: '1800000'
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
    totalBorrowed: '420000',
    totalCollateral: '1200000'
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
    totalBorrowed: '180000',
    totalCollateral: '600000'
  }
];

const sampleUserPositions: UserPosition[] = [
  {
    id: 'pos-1',
    collateralType: 'AXM Token',
    collateralAmount: '50000',
    borrowedAmount: '18000',
    healthFactor: 1.85,
    liquidationPrice: '0.58',
    interestAccrued: '127.50'
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { address } = req.query;
    
    const totalValueLocked = creditLines.reduce((sum, cl) => sum + parseFloat(cl.totalCollateral), 0);
    const totalBorrowed = creditLines.reduce((sum, cl) => sum + parseFloat(cl.totalBorrowed), 0);
    const avgInterestRate = creditLines.reduce((sum, cl) => sum + cl.interestRate, 0) / creditLines.length;
    
    return res.status(200).json({
      success: true,
      creditLines,
      userPositions: address ? sampleUserPositions : [],
      stats: {
        totalValueLocked: totalValueLocked.toFixed(2),
        totalBorrowed: totalBorrowed.toFixed(2),
        utilizationRate: ((totalBorrowed / totalValueLocked) * 100).toFixed(1),
        avgInterestRate: avgInterestRate.toFixed(1),
        activePositions: 156,
        healthyPositions: 148
      }
    });
  }
  
  if (req.method === 'POST') {
    const { action, collateralType, amount, address } = req.body;
    
    if (!action || !collateralType || !amount || !address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (action === 'borrow') {
      return res.status(200).json({
        success: true,
        message: 'Borrow request processed',
        txData: {
          to: '0x8616E8EA83f048ab9A5eC513c9412dd2993bcE3F',
          data: '0x',
          value: '0',
          estimatedGas: '150000'
        }
      });
    }
    
    if (action === 'repay') {
      return res.status(200).json({
        success: true,
        message: 'Repayment processed',
        txData: {
          to: '0x8616E8EA83f048ab9A5eC513c9412dd2993bcE3F',
          data: '0x',
          value: '0',
          estimatedGas: '120000'
        }
      });
    }
    
    if (action === 'add-collateral') {
      return res.status(200).json({
        success: true,
        message: 'Collateral added',
        txData: {
          to: '0x8616E8EA83f048ab9A5eC513c9412dd2993bcE3F',
          data: '0x',
          value: '0',
          estimatedGas: '100000'
        }
      });
    }
    
    return res.status(400).json({ error: 'Invalid action' });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
