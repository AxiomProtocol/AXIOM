import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const EXCHANGE_HUB_ADDRESS = '0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D';
const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';

const EXCHANGE_ABI = [
  "function totalPools() external view returns (uint256)",
  "function totalSwaps() external view returns (uint256)",
  "function swapFee() external view returns (uint256)",
  "function getPool(uint256 poolId) external view returns (tuple(uint256 poolId, address tokenA, address tokenB, uint256 reserveA, uint256 reserveB, uint256 totalLiquidity, uint256 lockedLiquidity, bool isActive, uint256 createdAt, uint256 totalVolume, uint256 totalFees))"
];

const TOKEN_INFO: { [key: string]: { symbol: string; name: string; decimals: number } } = {
  '0x864f9c6f50dc5bd244f5002f1b0873cd80e2539d': { symbol: 'AXM', name: 'Axiom Protocol Token', decimals: 18 },
  '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
  '0x912ce59144191c1204e64559fe8253a0e49e6548': { symbol: 'ARB', name: 'Arbitrum', decimals: 18 },
};

interface PoolData {
  poolId: number;
  name: string;
  tokenA: { symbol: string; name: string; address: string; decimals: number };
  tokenB: { symbol: string; name: string; address: string; decimals: number };
  reserveA: string;
  reserveB: string;
  reserveAFormatted: string;
  reserveBFormatted: string;
  totalLiquidity: string;
  totalVolume: string;
  totalFees: string;
  tvl: string;
  isActive: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const contract = new ethers.Contract(EXCHANGE_HUB_ADDRESS, EXCHANGE_ABI, provider);

    const [totalPools, totalSwaps, swapFee] = await Promise.all([
      contract.totalPools(),
      contract.totalSwaps(),
      contract.swapFee()
    ]);

    const poolCount = Number(totalPools);
    const pools: PoolData[] = [];
    let totalTVL = BigInt(0);
    let totalVolumeAll = BigInt(0);
    let totalFeesAll = BigInt(0);

    for (let i = 1; i <= poolCount; i++) {
      try {
        const pool = await contract.getPool(i);
        
        if (pool.isActive) {
          const tokenAAddress = pool.tokenA.toLowerCase();
          const tokenBAddress = pool.tokenB.toLowerCase();
          
          const tokenAInfo = TOKEN_INFO[tokenAAddress] || { symbol: 'Unknown', name: 'Unknown Token', decimals: 18 };
          const tokenBInfo = TOKEN_INFO[tokenBAddress] || { symbol: 'Unknown', name: 'Unknown Token', decimals: 18 };

          const reserveAFormatted = ethers.formatUnits(pool.reserveA, tokenAInfo.decimals);
          const reserveBFormatted = ethers.formatUnits(pool.reserveB, tokenBInfo.decimals);

          pools.push({
            poolId: Number(pool.poolId),
            name: `${tokenAInfo.symbol} / ${tokenBInfo.symbol}`,
            tokenA: { 
              symbol: tokenAInfo.symbol, 
              name: tokenAInfo.name,
              address: pool.tokenA, 
              decimals: tokenAInfo.decimals 
            },
            tokenB: { 
              symbol: tokenBInfo.symbol, 
              name: tokenBInfo.name,
              address: pool.tokenB, 
              decimals: tokenBInfo.decimals 
            },
            reserveA: pool.reserveA.toString(),
            reserveB: pool.reserveB.toString(),
            reserveAFormatted,
            reserveBFormatted,
            totalLiquidity: pool.totalLiquidity.toString(),
            totalVolume: pool.totalVolume.toString(),
            totalFees: pool.totalFees.toString(),
            tvl: '0',
            isActive: pool.isActive
          });

          totalVolumeAll += pool.totalVolume;
          totalFeesAll += pool.totalFees;
        }
      } catch (e) {
        console.error(`Failed to fetch pool ${i}:`, e);
      }
    }

    const stats = {
      success: true,
      totalPools: poolCount,
      activePools: pools.length,
      totalSwaps: Number(totalSwaps),
      swapFee: Number(swapFee),
      tvl: ethers.formatEther(totalTVL),
      totalVolume: ethers.formatEther(totalVolumeAll),
      totalFees: ethers.formatEther(totalFeesAll),
      exchangeAddress: EXCHANGE_HUB_ADDRESS,
      network: 'Arbitrum One',
      chainId: 42161,
      pools,
      lastUpdated: new Date().toISOString()
    };

    res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
    res.status(200).json(stats);
  } catch (error: any) {
    console.error('DEX stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch DEX stats from blockchain',
      message: error.message,
      totalPools: 0,
      totalSwaps: 0,
      swapFee: 30,
      pools: []
    });
  }
}
