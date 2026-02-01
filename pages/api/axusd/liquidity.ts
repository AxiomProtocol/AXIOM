import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { AXUSD_GENIUS_CONTRACTS, STABLECOINS, CAMELOT_DEX } from '../../../shared/contracts';

const ARBITRUM_RPC = process.env.ALCHEMY_API_KEY 
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const PAIR_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function totalSupply() view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)'
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

    const [reserves, token0, token1, totalSupply] = await Promise.all([
      pair.getReserves(),
      pair.token0(),
      pair.token1(),
      pair.totalSupply()
    ]);

    const axusdIsToken0 = token0.toLowerCase() === AXUSD_GENIUS_CONTRACTS.AXUSD.toLowerCase();
    
    const axusdReserve = axusdIsToken0 ? reserves[0] : reserves[1];
    const usdcReserve = axusdIsToken0 ? reserves[1] : reserves[0];

    const axusdReserveFormatted = ethers.formatEther(axusdReserve);
    const usdcReserveFormatted = ethers.formatUnits(usdcReserve, 6);
    const totalLiquidityFormatted = ethers.formatEther(totalSupply);

    const totalValueUsd = parseFloat(usdcReserveFormatted) * 2;

    res.status(200).json({
      success: true,
      data: {
        axusdReserve: axusdReserveFormatted,
        usdcReserve: usdcReserveFormatted,
        totalLiquidity: totalLiquidityFormatted,
        totalValueUsd: totalValueUsd.toFixed(2),
        tokens: {
          token0: token0,
          token1: token1,
          axusdIsToken0
        },
        contracts: {
          pair: AXUSD_GENIUS_CONTRACTS.LP_POOL_CAMELOT,
          router: CAMELOT_DEX.ROUTER,
          axusd: AXUSD_GENIUS_CONTRACTS.AXUSD,
          usdc: STABLECOINS.USDC
        },
        dex: 'Camelot',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Liquidity API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch liquidity data',
      details: error.message
    });
  }
}
