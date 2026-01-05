import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { AXUSD_STABLECOIN_CONTRACTS } from '../../../shared/contracts';

const ARBITRUM_RPC = process.env.ALCHEMY_API_KEY 
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    
    const usdcBalanceRaw = await usdcContract.balanceOf(AXUSD_STABLECOIN_CONTRACTS.PSM).catch(() => BigInt(0));
    const usdcBalance = parseFloat(ethers.formatUnits(usdcBalanceRaw, 6));

    res.json({
      success: true,
      data: {
        usdcReserve: usdcBalance.toFixed(2),
        feePercent: '0.10',
        contractAddress: AXUSD_STABLECOIN_CONTRACTS.PSM,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('PSM API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch PSM data',
      details: error.message
    });
  }
}
