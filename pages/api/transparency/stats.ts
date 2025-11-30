import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const ARBITRUM_RPC = process.env.ALCHEMY_ARBITRUM_URL || 'https://arb1.arbitrum.io/rpc';

const TRACKED_WALLETS = {
  treasury: process.env.TREASURY_ADDRESS || '',
  staking: process.env.STAKING_CONTRACT_ADDRESS || '',
  liquidity: process.env.LP_ADDRESS || '',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let treasuryBalance = '$0';
    let stakingTVL = '$0';
    let liquidityLocked = '$0';
    let totalSecured = '$0';

    if (TRACKED_WALLETS.treasury) {
      try {
        const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
        const balance = await provider.getBalance(TRACKED_WALLETS.treasury);
        const ethBalance = parseFloat(ethers.formatEther(balance));
        const ethPrice = 3500;
        treasuryBalance = `$${(ethBalance * ethPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      } catch (err) {
        console.error('Error fetching treasury balance:', err);
      }
    }

    res.status(200).json({
      success: true,
      treasuryBalance,
      stakingTVL,
      liquidityLocked,
      totalSecured,
      lastUpdated: new Date().toISOString(),
      wallets: {
        treasury: TRACKED_WALLETS.treasury ? `${TRACKED_WALLETS.treasury.slice(0, 6)}...${TRACKED_WALLETS.treasury.slice(-4)}` : 'Not configured',
        staking: TRACKED_WALLETS.staking ? `${TRACKED_WALLETS.staking.slice(0, 6)}...${TRACKED_WALLETS.staking.slice(-4)}` : 'Not configured',
      }
    });
  } catch (error) {
    console.error('Transparency stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transparency stats',
      treasuryBalance: '$0',
      stakingTVL: '$0'
    });
  }
}
