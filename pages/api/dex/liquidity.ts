import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ADVANCED_DEFI_CONTRACTS, CORE_CONTRACTS, NETWORK_CONFIG } from '../../../shared/contracts';

const DEX_ABI = [
  "function getTotalLiquidity() external view returns (uint256)",
  "function getPoolCount() external view returns (uint256)",
  "function getTotalVolume() external view returns (uint256)",
  "function getPool(uint256 poolId) external view returns (address token0, address token1, uint256 reserve0, uint256 reserve1, uint256 fee)",
  "function get24hVolume() external view returns (uint256)",
  "function getAxmPrice() external view returns (uint256)"
];

const TOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    
    const dexContract = new ethers.Contract(
      ADVANCED_DEFI_CONTRACTS.EXCHANGE_HUB_DEX,
      DEX_ABI,
      provider
    );

    const axmContract = new ethers.Contract(
      CORE_CONTRACTS.AXM_TOKEN,
      TOKEN_ABI,
      provider
    );

    const dexAxmBalance = await axmContract.balanceOf(ADVANCED_DEFI_CONTRACTS.EXCHANGE_HUB_DEX).catch(() => BigInt(0));

    let totalLiquidity = BigInt(0);
    let poolCount = 0;
    let totalVolume = BigInt(0);
    let volume24h = BigInt(0);

    try {
      [totalLiquidity, poolCount, totalVolume, volume24h] = await Promise.all([
        dexContract.getTotalLiquidity().catch(() => BigInt(0)),
        dexContract.getPoolCount().catch(() => 0),
        dexContract.getTotalVolume().catch(() => BigInt(0)),
        dexContract.get24hVolume().catch(() => BigInt(0))
      ]);
    } catch (e) {
      console.log('Using AXM balance as liquidity estimate');
      totalLiquidity = dexAxmBalance;
    }

    const pools: Array<{id: number; name: string; token0: string; token1: string; reserve0: string; reserve1: string; fee: string; tvl: string}> = [];
    
    if (dexAxmBalance > 0) {
      pools.push({
        id: 1,
        name: 'AXM Pool',
        token0: 'AXM',
        token1: 'ETH',
        reserve0: ethers.formatEther(dexAxmBalance),
        reserve1: '0',
        fee: '0.30%',
        tvl: ethers.formatEther(dexAxmBalance)
      });
    }

    res.status(200).json({
      success: true,
      dex: {
        totalLiquidity: ethers.formatEther(totalLiquidity || dexAxmBalance),
        poolCount: Number(poolCount) || pools.length,
        totalVolume: ethers.formatEther(totalVolume),
        volume24h: ethers.formatEther(volume24h),
        axmInDex: ethers.formatEther(dexAxmBalance)
      },
      pools,
      contractAddress: ADVANCED_DEFI_CONTRACTS.EXCHANGE_HUB_DEX,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('DEX liquidity error:', error);
    res.status(200).json({
      success: false,
      dex: {
        totalLiquidity: '0',
        poolCount: 0,
        totalVolume: '0',
        volume24h: '0',
        axmInDex: '0'
      },
      pools: [],
      error: 'Failed to fetch live contract data'
    });
  }
}
