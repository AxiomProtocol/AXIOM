import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { pool } from '../../../server/db';

const ARBITRUM_RPC = process.env.ALCHEMY_API_KEY 
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const PAIR_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function totalSupply() view returns (uint256)'
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { chainId } = req.query;
  const filterChainId = chainId ? parseInt(chainId as string, 10) : null;

  try {
    let result;
    if (filterChainId) {
      result = await pool.query(
        'SELECT * FROM axusd_trading_pools WHERE chain_id = $1',
        [filterChainId]
      );
    } else {
      result = await pool.query('SELECT * FROM axusd_trading_pools WHERE is_active = true');
    }

    const pools = result.rows;
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);

    const poolsWithData = await Promise.all(
      pools.map(async (poolData: any) => {
        try {
          const pair = new ethers.Contract(poolData.pool_address, PAIR_ABI, provider);
          const [reserves, totalSupply] = await Promise.all([
            pair.getReserves(),
            pair.totalSupply()
          ]);

          const reserve0 = parseFloat(ethers.formatUnits(reserves[0], poolData.token0_decimals));
          const reserve1 = parseFloat(ethers.formatUnits(reserves[1], poolData.token1_decimals));
          
          const isStablePair = ['USDC', 'USDT', 'DAI', 'AXUSD'].includes(poolData.token0_symbol) && 
                              ['USDC', 'USDT', 'DAI', 'AXUSD'].includes(poolData.token1_symbol);
          
          let tvl;
          if (isStablePair) {
            tvl = reserve0 + reserve1;
          } else {
            tvl = reserve1 * 2;
          }

          const price = reserve1 > 0 ? reserve0 / reserve1 : 1;

          return {
            id: poolData.id,
            name: poolData.name,
            poolAddress: poolData.pool_address,
            dex: poolData.dex,
            token0Symbol: poolData.token0_symbol,
            token1Symbol: poolData.token1_symbol,
            feeRate: poolData.fee_rate,
            chainId: poolData.chain_id,
            reserves: {
              token0: reserve0.toFixed(4),
              token1: reserve1.toFixed(4)
            },
            tvl: tvl.toFixed(2),
            totalSupply: parseFloat(ethers.formatEther(totalSupply)).toFixed(6),
            price: price.toFixed(6),
            status: 'active'
          };
        } catch (error) {
          return {
            id: poolData.id,
            name: poolData.name,
            poolAddress: poolData.pool_address,
            dex: poolData.dex,
            token0Symbol: poolData.token0_symbol,
            token1Symbol: poolData.token1_symbol,
            reserves: { token0: '0', token1: '0' },
            tvl: '0',
            totalSupply: '0',
            price: '0',
            status: 'error'
          };
        }
      })
    );

    const totalTvl = poolsWithData.reduce((sum, p) => sum + parseFloat(p.tvl || '0'), 0);

    res.status(200).json({
      success: true,
      data: {
        pools: poolsWithData,
        summary: {
          totalPools: pools.length,
          activePools: poolsWithData.filter(p => p.status === 'active').length,
          totalTvl: totalTvl.toFixed(2),
          chains: [...new Set(pools.map((p: any) => p.chain_id))]
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Pools API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pools',
      details: error.message
    });
  }
}
