import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { CORE_CONTRACTS, NETWORK_CONFIG } from '../../../shared/contracts';

const AXM_TOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)"
];

const STAKING_ABI = [
  "function stakedBalance(address account) external view returns (uint256)"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet } = req.query;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    
    const axmContract = new ethers.Contract(
      CORE_CONTRACTS.AXM_TOKEN,
      AXM_TOKEN_ABI,
      provider
    );
    
    const stakingContract = new ethers.Contract(
      CORE_CONTRACTS.STAKING_EMISSIONS,
      STAKING_ABI,
      provider
    );

    const [axmBalance, stakedBalance] = await Promise.all([
      axmContract.balanceOf(wallet).catch(() => BigInt(0)),
      stakingContract.stakedBalance(wallet).catch(() => BigInt(0))
    ]);

    const totalBalance = axmBalance + stakedBalance;
    const votingPower = ethers.formatEther(totalBalance);

    res.status(200).json({
      success: true,
      wallet,
      votingPower,
      breakdown: {
        axmBalance: ethers.formatEther(axmBalance),
        stakedBalance: ethers.formatEther(stakedBalance)
      },
      note: 'Voting power is calculated as AXM balance + staked AXM. Delegated voting power will be added after governance module upgrade.'
    });
  } catch (error) {
    console.error('Voting power API error:', error);
    res.status(200).json({
      success: false,
      votingPower: '0',
      error: 'Failed to fetch voting power'
    });
  }
}
