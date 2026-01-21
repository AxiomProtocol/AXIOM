import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const EXCHANGE_HUB_ADDRESS = '0x31eF3DCB076ba97229113F4e58Cc9315cb8Dcd28';
const TREASURY_SAFE = '0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d';

const EXCHANGE_HUB_ABI = [
  'function nextPoolId() external view returns (uint256)',
  'function getPoolCore(uint256 pid) external view returns (address tokenA, address tokenB, uint256 reserveA, uint256 reserveB, uint256 totalLiquidity)',
  'function getPoolMeta(uint256 pid) external view returns (uint256 swapFee, bool isActive, uint256 createdAt)',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() external view returns (bytes32)',
  'function owner() external view returns (address)',
];

const TOKEN_SYMBOLS: Record<string, string> = {
  '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c': 'AXUSD',
  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': 'USDC',
  '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1': 'WETH',
  '0x53e79F3a8e60eB0a6bE88B60f3c95Bc7b22C5A54': 'AXM',
  '0x912CE59144191C1204E64559FE8253a0e49E6548': 'ARB',
  '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f': 'WBTC',
};

function getSymbol(address: string): string {
  return TOKEN_SYMBOLS[address] || address.slice(0, 8) + '...';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const RPC_URL = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    const exchangeHub = new ethers.Contract(EXCHANGE_HUB_ADDRESS, EXCHANGE_HUB_ABI, provider);
    
    let nextPoolId = 0n;
    try {
      nextPoolId = await exchangeHub.nextPoolId();
    } catch (e) {
      console.log('nextPoolId not available, trying alternative');
    }
    
    let adminRole = ethers.ZeroHash;
    try {
      adminRole = await exchangeHub.DEFAULT_ADMIN_ROLE();
    } catch (e) {
      console.log('DEFAULT_ADMIN_ROLE not available');
    }
    
    let treasuryIsAdmin = false;
    try {
      treasuryIsAdmin = await exchangeHub.hasRole(adminRole, TREASURY_SAFE);
    } catch (e) {
      console.log('hasRole check failed');
    }
    
    const pools = [];
    for (let i = 0; i < Number(nextPoolId); i++) {
      try {
        const [tokenA, tokenB, reserveA, reserveB, totalLiquidity] = await exchangeHub.getPoolCore(i);
        const [swapFee, isActive, createdAt] = await exchangeHub.getPoolMeta(i);
        
        pools.push({
          id: i,
          tokenA,
          tokenB,
          tokenASymbol: getSymbol(tokenA),
          tokenBSymbol: getSymbol(tokenB),
          reserveA: ethers.formatUnits(reserveA, 18),
          reserveB: ethers.formatUnits(reserveB, 18),
          totalLiquidity: ethers.formatUnits(totalLiquidity, 18),
          swapFee: Number(swapFee),
          isActive,
          createdAt: Number(createdAt)
        });
      } catch (e) {
        console.log(`Pool ${i} error:`, e);
      }
    }
    
    res.status(200).json({
      success: true,
      contractAddress: EXCHANGE_HUB_ADDRESS,
      treasurySafe: TREASURY_SAFE,
      treasuryIsAdmin,
      nextPoolId: Number(nextPoolId),
      poolCount: pools.length,
      pools,
      message: pools.length === 0 
        ? 'No pools exist yet. The Treasury Safe needs to create the first pools.'
        : `Found ${pools.length} existing pool(s).`
    });
  } catch (error: any) {
    console.error('Check pools error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check pools'
    });
  }
}
