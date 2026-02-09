import type { NextApiRequest, NextApiResponse } from 'next';
import camelotPoolService from '../../../lib/services/CamelotPoolService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userAddress = req.query.userAddress as string | undefined;
    
    const poolData = await camelotPoolService.getAllPools(userAddress);
    
    const pools = poolData.map((pool, index) => ({
      id: index,
      tokenA: pool.token0Address,
      tokenB: pool.token1Address,
      tokenASymbol: pool.token0,
      tokenBSymbol: pool.token1,
      reserveA: pool.reserve0,
      reserveB: pool.reserve1,
      totalLiquidity: pool.totalSupply,
      swapFee: Math.round(pool.feePercent * 100),
      isActive: true,
      tvl: pool.tvl,
      volume24h: pool.volume24h,
      fees24h: pool.fees24h,
      apr: pool.apr,
      pairAddress: pool.pairAddress,
      yourLiquidity: pool.yourLiquidity || 0,
      yourShare: pool.yourShare || 0,
      swapCount24h: pool.swapCount24h || 0
    }));
    
    return res.status(200).json({ 
      pools, 
      count: pools.length,
      source: 'camelot',
      message: `Found ${pools.length} pool(s) on Camelot DEX`
    });
  } catch (error) {
    console.error('Error fetching pools:', error);
    return res.status(500).json({ error: 'Failed to fetch pools' });
  }
}
