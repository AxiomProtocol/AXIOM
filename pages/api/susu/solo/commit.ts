import type { NextApiRequest, NextApiResponse } from 'next';
import { COMMUNITY_SAVINGS_CONTRACTS, CORE_CONTRACTS } from '../../../../shared/contracts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { circleId, preferredPosition } = req.body;

    if (!circleId) {
      return res.status(400).json({ error: 'Circle ID is required' });
    }

    const position = preferredPosition ? parseInt(preferredPosition) : 0;

    res.status(200).json({
      success: true,
      message: 'Commitment data prepared. You need to: 1) Approve AXM tokens, 2) Commit to your Personal Vault.',
      mode: 'solo',
      custodyType: 'smart-contract',
      steps: [
        {
          step: 1,
          action: 'approve',
          description: 'Approve AXM tokens for the Personal Vault contract',
          contractAddress: CORE_CONTRACTS.AXM_TOKEN,
          spenderAddress: COMMUNITY_SAVINGS_CONTRACTS.SUSU_PERSONAL_VAULT,
          functionName: 'approve',
          abi: ["function approve(address spender, uint256 amount) external returns (bool)"]
        },
        {
          step: 2,
          action: 'commit',
          description: 'Lock your funds in your personal vault',
          contractAddress: COMMUNITY_SAVINGS_CONTRACTS.SUSU_PERSONAL_VAULT,
          functionName: 'commitToVault',
          abi: ["function commitToVault(uint256 circleId, uint256 preferredPosition) external"],
          params: {
            circleId: parseInt(circleId),
            preferredPosition: position
          }
        }
      ],
      viewFunctions: {
        getRequiredCommitment: {
          contractAddress: COMMUNITY_SAVINGS_CONTRACTS.SUSU_PERSONAL_VAULT,
          functionName: 'getRequiredCommitment',
          abi: ["function getRequiredCommitment(uint256 circleId) external view returns (uint256)"]
        },
        getCircle: {
          contractAddress: COMMUNITY_SAVINGS_CONTRACTS.SUSU_PERSONAL_VAULT,
          functionName: 'getCircle',
          abi: ["function getCircle(uint256 circleId) external view returns (tuple(uint256 circleId, address organizer, address token, uint256 targetMembers, uint256 contributionPerCycle, uint256 totalCycles, uint256 cycleDuration, uint256 startTime, uint256 currentCycle, uint16 protocolFeeBps, uint16 earlyExitPenaltyBps, uint8 status, uint256 createdAt, uint256 totalCommitted, uint256 totalPaidOut))"]
        }
      },
      explorerUrl: `https://arbitrum.blockscout.com/address/${COMMUNITY_SAVINGS_CONTRACTS.SUSU_PERSONAL_VAULT}`,
      userInstructions: {
        beforeCommitting: [
          'Make sure you have enough AXM tokens for the full commitment (contribution × number of members)',
          'Review the circle details and ensure you understand the payout schedule',
          'Your funds will be locked until the circle completes or you choose to exit early'
        ],
        afterCommitting: [
          'Your funds are now safely locked in YOUR personal vault',
          'You will automatically receive payout when it\'s your turn',
          'You can track your vault status on the circle page',
          'If you need to exit early, you can do so with a 10% penalty'
        ]
      }
    });
  } catch (error: any) {
    console.error('Error preparing Solo SUSU commitment:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to prepare commitment data'
    });
  }
}
