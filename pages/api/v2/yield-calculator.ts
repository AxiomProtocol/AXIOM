import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { V2_SOVEREIGN_BANKING_CONTRACTS, NETWORK_CONFIG } from '../../../shared/contracts';

const VE_AXM_ABI = [
  "function totalSupply() view returns (uint256)"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { lockAmount, lockYears, monthlyProtocolFees } = req.body;

    if (!lockAmount || !lockYears || monthlyProtocolFees === undefined) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    const veAXM = new ethers.Contract(V2_SOVEREIGN_BANKING_CONTRACTS.VE_AXM, VE_AXM_ABI, provider);

    let totalVeAXMSupply = BigInt(0);
    try {
      totalVeAXMSupply = await veAXM.totalSupply();
    } catch (e) {
      totalVeAXMSupply = ethers.parseEther('1000000');
    }

    const userVotingPower = lockAmount * lockYears;
    const totalSupplyNum = parseFloat(ethers.formatEther(totalVeAXMSupply)) || 1000000;
    const userShare = userVotingPower / (totalSupplyNum + userVotingPower);
    const veAXMShare = 0.5;
    const monthlyRewards = monthlyProtocolFees * veAXMShare * userShare;
    const dailyRewards = monthlyRewards / 30;
    const weeklyRewards = dailyRewards * 7;
    const yearlyRewards = monthlyRewards * 12;
    const apy = lockAmount > 0 ? ((yearlyRewards / lockAmount) * 100) : 0;

    return res.status(200).json({
      success: true,
      estimate: {
        daily: dailyRewards.toFixed(4),
        weekly: weeklyRewards.toFixed(4),
        monthly: monthlyRewards.toFixed(4),
        yearly: yearlyRewards.toFixed(4),
        apy: apy.toFixed(2)
      },
      assumptions: {
        totalVeAXMSupply: totalSupplyNum.toFixed(0),
        userShare: (userShare * 100).toFixed(4) + '%',
        veAXMFeeShare: '50%'
      }
    });
  } catch (error: any) {
    console.error('Yield calculator error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Calculation failed'
    });
  }
}
