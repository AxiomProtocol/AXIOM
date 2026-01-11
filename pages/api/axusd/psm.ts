import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { AXUSD_GENIUS_CONTRACTS, STABLECOINS } from '../../../shared/contracts';

const ARBITRUM_RPC = process.env.ALCHEMY_API_KEY 
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const PSM_ABI = [
  'function mintFee() view returns (uint256)',
  'function redeemFee() view returns (uint256)',
  'function debtCeiling() view returns (uint256)',
  'function debtOutstanding() view returns (uint256)'
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const usdcContract = new ethers.Contract(STABLECOINS.USDC, ERC20_ABI, provider);
    const psmContract = new ethers.Contract(AXUSD_GENIUS_CONTRACTS.PSM, PSM_ABI, provider);
    
    const [usdcBalanceRaw, mintFee, redeemFee, debtCeiling, debtOutstanding] = await Promise.all([
      usdcContract.balanceOf(AXUSD_GENIUS_CONTRACTS.PSM).catch(() => BigInt(0)),
      psmContract.mintFee().catch(() => BigInt(10)),
      psmContract.redeemFee().catch(() => BigInt(10)),
      psmContract.debtCeiling().catch(() => BigInt(0)),
      psmContract.debtOutstanding().catch(() => BigInt(0))
    ]);

    const usdcBalance = parseFloat(ethers.formatUnits(usdcBalanceRaw, 6));
    const mintFeePercent = Number(mintFee) / 100;
    const redeemFeePercent = Number(redeemFee) / 100;

    res.json({
      success: true,
      data: {
        usdcReserve: usdcBalance.toFixed(2),
        feePercent: mintFeePercent.toFixed(2),
        mintFee: mintFeePercent.toFixed(2),
        redeemFee: redeemFeePercent.toFixed(2),
        debtCeiling: ethers.formatEther(debtCeiling),
        debtOutstanding: ethers.formatEther(debtOutstanding),
        contractAddress: AXUSD_GENIUS_CONTRACTS.PSM,
        geniusCompliant: true,
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
