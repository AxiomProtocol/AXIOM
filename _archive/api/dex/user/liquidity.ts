import type { NextApiRequest, NextApiResponse } from 'next';
import camelotPoolService from '../../../../lib/services/CamelotPoolService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Missing wallet address' });
    }

    const pools = await camelotPoolService.getAllPools(address as string);
    
    const positions = pools
      .filter(pool => pool.yourLiquidity > 0)
      .map((pool, index) => ({
        poolId: index,
        pairAddress: pool.pairAddress,
        tokenA: pool.token0Address,
        tokenB: pool.token1Address,
        tokenASymbol: pool.token0,
        tokenBSymbol: pool.token1,
        liquidity: pool.yourLiquidity.toString(),
        lpTokenBalance: pool.yourLpTokenBalance,
        sharePercent: pool.yourShare,
        tvl: pool.tvl
      }));
    
    return res.status(200).json({ 
      positions,
      source: 'camelot',
      message: `Found ${positions.length} position(s) for ${address}`
    });
  } catch (error) {
    console.error('Error fetching user liquidity:', error);
    return res.status(500).json({ error: 'Failed to fetch user liquidity' });
  }
}
