import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const EXCHANGE_HUB_ADDRESS = '0x31eF3DCB076ba97229113F4e58Cc9315cb8Dcd28';

const EXCHANGE_HUB_ABI = [
  'function createPool(address tokenA, address tokenB, uint256 swapFee) external returns (uint256)',
  'function nextPoolId() external view returns (uint256)',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() external view returns (bytes32)',
];

const SUPPORTED_TOKENS: Record<string, { address: string; decimals: number }> = {
  'AXUSD': { address: '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c', decimals: 18 },
  'USDC': { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
  'WETH': { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
  'AXM': { address: '0x53e79F3a8e60eB0a6bE88B60f3c95Bc7b22C5A54', decimals: 18 },
  'ARB': { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18 },
  'WBTC': { address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8 },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tokenA, tokenB, swapFee } = req.body;

  if (!tokenA || !tokenB || swapFee === undefined) {
    return res.status(400).json({ error: 'Missing required fields: tokenA, tokenB, swapFee' });
  }

  const tokenAInfo = SUPPORTED_TOKENS[tokenA.toUpperCase()];
  const tokenBInfo = SUPPORTED_TOKENS[tokenB.toUpperCase()];

  if (!tokenAInfo) {
    return res.status(400).json({ error: `Unsupported token: ${tokenA}` });
  }
  if (!tokenBInfo) {
    return res.status(400).json({ error: `Unsupported token: ${tokenB}` });
  }

  if (tokenAInfo.address === tokenBInfo.address) {
    return res.status(400).json({ error: 'Token A and Token B must be different' });
  }

  const deployerPk = process.env.DEPLOYER_PK;
  if (!deployerPk) {
    return res.status(500).json({ error: 'Deployer private key not configured' });
  }

  try {
    const RPC_URL = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(deployerPk, provider);
    
    const exchangeHub = new ethers.Contract(EXCHANGE_HUB_ADDRESS, EXCHANGE_HUB_ABI, wallet);
    
    const adminRole = await exchangeHub.DEFAULT_ADMIN_ROLE();
    const isAdmin = await exchangeHub.hasRole(adminRole, wallet.address);
    
    if (!isAdmin) {
      return res.status(403).json({ 
        error: 'Deployer wallet does not have admin role on ExchangeHub',
        deployerAddress: wallet.address 
      });
    }
    
    const poolIdBefore = await exchangeHub.nextPoolId();
    
    console.log(`Creating pool: ${tokenA}/${tokenB} with fee ${swapFee} bps`);
    console.log(`Token A: ${tokenAInfo.address}`);
    console.log(`Token B: ${tokenBInfo.address}`);
    console.log(`Deployer: ${wallet.address}`);
    
    const tx = await exchangeHub.createPool(
      tokenAInfo.address,
      tokenBInfo.address,
      swapFee
    );
    
    console.log(`Transaction submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    
    const poolIdAfter = await exchangeHub.nextPoolId();
    const newPoolId = Number(poolIdAfter) - 1;
    
    res.status(200).json({
      success: true,
      message: `Pool ${tokenA}/${tokenB} created successfully!`,
      poolId: newPoolId,
      transactionHash: receipt.hash,
      tokenA: { symbol: tokenA, address: tokenAInfo.address },
      tokenB: { symbol: tokenB, address: tokenBInfo.address },
      swapFee: swapFee
    });
  } catch (error: any) {
    console.error('Create pool error:', error);
    
    let errorMessage = 'Failed to create pool';
    if (error.code === 'CALL_EXCEPTION') {
      errorMessage = 'Transaction reverted. Pool may already exist or contract is paused.';
    } else if (error.reason) {
      errorMessage = error.reason;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      success: false,
      error: errorMessage 
    });
  }
}
