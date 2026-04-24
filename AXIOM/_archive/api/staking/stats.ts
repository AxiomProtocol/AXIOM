import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { V2_SOVEREIGN_BANKING_CONTRACTS, NETWORK_CONFIG } from '../../../shared/contracts';

const VE_AXM_ABI = [
  "function balanceOf(address user) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function totalLocked() view returns (uint256)",
  "function totalLockers() view returns (uint256)"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const veAXMAddress = V2_SOVEREIGN_BANKING_CONTRACTS.VE_AXM;
    
    if (!veAXMAddress) {
      return res.status(500).json({ success: false, error: 'Staking contract not configured' });
    }

    const veAXM = new ethers.Contract(veAXMAddress, VE_AXM_ABI, provider);
    
    const [totalSupply, totalLocked, totalLockers] = await Promise.all([
      veAXM.totalSupply(),
      veAXM.totalLocked(),
      veAXM.totalLockers()
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalStaked: ethers.formatEther(totalLocked),
        totalVotingPower: ethers.formatEther(totalSupply),
        totalStakers: Number(totalLockers),
        currentAPY: 12.5,
        minStakeAmount: '100',
        lockPeriods: [30, 90, 180, 365],
        currency: 'AXM'
      }
    });
  } catch (error) {
    console.error('Staking stats error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch staking stats' });
  }
}
