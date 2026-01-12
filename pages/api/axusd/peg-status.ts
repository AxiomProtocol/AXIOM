import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { AXUSD_GENIUS_CONTRACTS } from '../../../shared/contracts';

const ARBITRUM_RPC = process.env.ALCHEMY_API_KEY 
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const PAIR_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
  'function token1() view returns (address)'
];

const MARKET_OPS_ABI = [
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
    
    const pair = new ethers.Contract(
      AXUSD_GENIUS_CONTRACTS.LP_POOL_CAMELOT,
      PAIR_ABI,
      provider
    );
    
    const marketOps = new ethers.Contract(
      AXUSD_GENIUS_CONTRACTS.MARKET_OPERATIONS,
      MARKET_OPS_ABI,
      provider
    );

    const [reserves, token0, lowerBound, upperBound, dailyBuyLimit, dailySellLimit, dailyBuyUsed, dailySellUsed] = await Promise.all([
      pair.getReserves(),
      pair.token0(),
      marketOps.lowerPegBound(),
      marketOps.upperPegBound(),
      marketOps.dailyBuyLimit(),
      marketOps.dailySellLimit(),
      marketOps.dailyBuyUsed(),
      marketOps.dailySellUsed()
    ]);

    const reserve0 = reserves[0];
    const reserve1 = reserves[1];
    
    const axusdAddress = AXUSD_GENIUS_CONTRACTS.AXUSD.toLowerCase();
    const usdcAddress = AXUSD_GENIUS_CONTRACTS.USDC.toLowerCase();
    const token0Lower = token0.toLowerCase();
    
    let axusdReserve: bigint;
    let usdcReserve: bigint;
    
    if (token0Lower === axusdAddress) {
      axusdReserve = reserve0;
      usdcReserve = reserve1;
    } else {
      axusdReserve = reserve1;
      usdcReserve = reserve0;
    }
    
    const axusdAmount = parseFloat(ethers.formatEther(axusdReserve));
    const usdcAmount = parseFloat(ethers.formatUnits(usdcReserve, 6));
    
    let priceUsd = 1.0;
    if (axusdAmount > 0) {
      priceUsd = usdcAmount / axusdAmount;
    }
    
    const pegDefenseNeeded = priceUsd < 0.995 || priceUsd > 1.005;

    res.status(200).json({
      success: true,
      data: {
        currentPrice: priceUsd.toFixed(6),
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
        poolReserves: {
          axusd: axusdAmount.toFixed(6),
          usdc: usdcAmount.toFixed(6)
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
