import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const ARBITRUM_RPC = process.env.ALCHEMY_RPC_URL || 'https://arb1.arbitrum.io/rpc';

const VAULT_ADDRESS = process.env.FIXFLIP_VAULT_ADDRESS;
const MANAGER_ADDRESS = process.env.FIXFLIP_MANAGER_ADDRESS;

const VAULT_ABI = [
  'function totalAssets() view returns (uint256)',
  'function availableLiquidity() view returns (uint256)',
  'function lockedLiquidity() view returns (uint256)',
  'function totalYieldAccumulated() view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
  'function totalSupply() view returns (uint256)'
];

const MANAGER_ABI = [
  'function getStats() view returns (uint256 totalOriginated, uint256 totalRepaid, uint256 activeLoans, uint256 availableLiquidity)'
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!VAULT_ADDRESS || !MANAGER_ADDRESS) {
      return res.status(200).json({
        totalAssets: '0',
        availableLiquidity: '0',
        lockedInLoans: '0',
        totalYield: '0',
        activeLoans: 0,
        totalOriginated: '0',
        totalRepaid: '0',
        apy: '10-14%',
        sharePrice: '1.00',
        message: 'Contracts not deployed yet'
      });
    }

    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, provider);
    const manager = new ethers.Contract(MANAGER_ADDRESS, MANAGER_ABI, provider);

    const [
      totalAssets,
      availableLiquidity,
      lockedLiquidity,
      totalYield,
      totalSupply,
      stats
    ] = await Promise.all([
      vault.totalAssets(),
      vault.availableLiquidity(),
      vault.lockedLiquidity(),
      vault.totalYieldAccumulated(),
      vault.totalSupply(),
      manager.getStats()
    ]);

    let sharePrice = '1.00';
    if (totalSupply > 0n) {
      const priceWei = await vault.convertToAssets(ethers.parseEther('1'));
      sharePrice = ethers.formatEther(priceWei);
    }

    const currentRate = 12;
    const estimatedApy = `${currentRate}-${currentRate + 2}%`;

    return res.status(200).json({
      totalAssets: ethers.formatEther(totalAssets),
      availableLiquidity: ethers.formatEther(availableLiquidity),
      lockedInLoans: ethers.formatEther(lockedLiquidity),
      totalYield: ethers.formatEther(totalYield),
      activeLoans: Number(stats.activeLoans),
      totalOriginated: ethers.formatEther(stats.totalOriginated),
      totalRepaid: ethers.formatEther(stats.totalRepaid),
      apy: estimatedApy,
      sharePrice
    });
  } catch (error: any) {
    console.error('Error fetching fund stats:', error);

    return res.status(200).json({
      totalAssets: '0',
      availableLiquidity: '0',
      lockedInLoans: '0',
      totalYield: '0',
      activeLoans: 0,
      totalOriginated: '0',
      totalRepaid: '0',
      apy: '10-14%',
      sharePrice: '1.00',
      error: error.message
    });
  }
}
