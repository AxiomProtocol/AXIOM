import type { NextApiRequest, NextApiResponse } from 'next';
import { COMMUNITY_SAVINGS_CONTRACTS, CORE_CONTRACTS } from '../../../shared/contracts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      token,
      targetMembers,
      contributionPerCycle,
      cycleDuration,
      startTime
    } = req.body;

    const tokenAddress = token || CORE_CONTRACTS.AXM_TOKEN;

    if (!targetMembers || !contributionPerCycle || !cycleDuration) {
      return res.status(400).json({ 
        error: 'Missing required fields: targetMembers, contributionPerCycle, cycleDuration' 
      });
    }

    if (targetMembers < 2 || targetMembers > 20) {
      return res.status(400).json({ error: 'Member count must be between 2 and 20 for Solo SUSU' });
    }

    const cycleDurationSeconds = parseInt(cycleDuration);
    if (cycleDurationSeconds < 86400 || cycleDurationSeconds > 7776000) {
      return res.status(400).json({ error: 'Cycle duration must be between 1 and 90 days' });
    }

    const defaultStartTime = Math.floor(Date.now() / 1000) + (7 * 86400);

    const txData = {
      token: tokenAddress,
      targetMembers: parseInt(targetMembers),
      contributionPerCycle: contributionPerCycle.toString(),
      cycleDuration: cycleDurationSeconds,
      startTime: startTime ? parseInt(startTime) : defaultStartTime
    };

    const totalCommitment = BigInt(txData.contributionPerCycle) * BigInt(txData.targetMembers);

    res.status(200).json({
      success: true,
      message: 'Solo SUSU circle creation data prepared. Sign the transaction in your wallet.',
      mode: 'solo',
      custodyType: 'smart-contract',
      txData,
      totalCommitmentRequired: totalCommitment.toString(),
      totalCommitmentFormatted: (Number(totalCommitment) / 1e18).toFixed(2),
      contractAddress: COMMUNITY_SAVINGS_CONTRACTS.SUSU_PERSONAL_VAULT,
      functionName: 'createCircle',
      abi: [
        "function createCircle(address token, uint256 targetMembers, uint256 contributionPerCycle, uint256 cycleDuration, uint256 startTime) external returns (uint256)"
      ],
      explorerUrl: `https://arbitrum.blockscout.com/address/${COMMUNITY_SAVINGS_CONTRACTS.SUSU_PERSONAL_VAULT}`,
      keyDifferences: {
        upfrontCommitment: 'You must lock your FULL commitment (contribution × members) when joining',
        fundsSegregated: 'Your funds stay in YOUR personal vault until payout',
        earlyExitPenalty: '10% penalty if you exit before completion',
        protectionFromDefaults: 'Other members cannot affect your locked funds'
      }
    });
  } catch (error: any) {
    console.error('Error preparing Solo SUSU circle creation:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to prepare Solo SUSU circle creation'
    });
  }
}
