import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { AXUSD_GENIUS_CONTRACTS } from '../../../shared/contracts';

const ARBITRUM_RPC = process.env.ALCHEMY_API_KEY 
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const MARKET_OPS_ABI = [
  'function getCurrentPrice() view returns (uint256)',
  'function isPegDefenseNeeded() view returns (bool)',
  'function lowerPegBound() view returns (uint256)',
  'function upperPegBound() view returns (uint256)',
  'function dailyBuyLimit() view returns (uint256)',
  'function dailySellLimit() view returns (uint256)',
  'function dailyBuyUsed() view returns (uint256)',
  'function dailySellUsed() view returns (uint256)'
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const marketOps = new ethers.Contract(
      AXUSD_GENIUS_CONTRACTS.MARKET_OPERATIONS,
      MARKET_OPS_ABI,
      provider
    );

    const [
      currentPrice,
      pegDefenseNeeded,
      lowerBound,
      upperBound,
      dailyBuyLimit,
      dailySellLimit,
      dailyBuyUsed,
      dailySellUsed
    ] = await Promise.all([
      marketOps.getCurrentPrice(),
      marketOps.isPegDefenseNeeded(),
      marketOps.lowerPegBound(),
      marketOps.upperPegBound(),
      marketOps.dailyBuyLimit(),
      marketOps.dailySellLimit(),
      marketOps.dailyBuyUsed(),
      marketOps.dailySellUsed()
    ]);

    const priceFormatted = ethers.formatEther(currentPrice);
    const priceUsd = parseFloat(priceFormatted);

    res.status(200).json({
      success: true,
      data: {
        currentPrice: priceFormatted,
        priceUsd: priceUsd.toFixed(4),
        lowerBound: ethers.formatEther(lowerBound),
        upperBound: ethers.formatEther(upperBound),
        pegDefenseNeeded,
        pegStatus: priceUsd >= 0.995 && priceUsd <= 1.005 ? 'stable' : 
                   priceUsd < 0.995 ? 'below_peg' : 'above_peg',
        dailyLimits: {
          buyLimit: ethers.formatEther(dailyBuyLimit),
          sellLimit: ethers.formatEther(dailySellLimit),
          buyUsed: ethers.formatEther(dailyBuyUsed),
          sellUsed: ethers.formatEther(dailySellUsed)
        },
        contracts: {
          marketOperations: AXUSD_GENIUS_CONTRACTS.MARKET_OPERATIONS,
          lpPool: AXUSD_GENIUS_CONTRACTS.LP_POOL_CAMELOT
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Peg status API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch peg status',
      details: error.message
    });
  }
}
