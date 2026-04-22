import type { NextApiRequest, NextApiResponse } from 'next';
import { getNodeEconomyService, NODE_ECONOMY_CONTRACTS, ON_CHAIN_NODE_CLASSES } from '../../../lib/contracts/node-economy';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const service = getNodeEconomyService();
    const stats = await service.getSystemStats();

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      systemStatus: stats.systemStatus,
      nodes: stats.nodes,
      rewards: {
        currentEpoch: stats.rewards.currentEpoch,
        epochStartTime: stats.rewards.epochStartTime?.toISOString() || null,
        epochDurationDays: stats.rewards.epochDurationDays,
        maxRewardsPerEpoch: stats.rewards.maxRewardsPerEpoch,
        timeUntilNextEpochHours: stats.rewards.timeUntilNextEpochHours,
      },
      slashing: stats.slashing,
      stakeRequirements: stats.stakeRequirements,
      slashingParams: stats.slashingParams,
      nodeClasses: ON_CHAIN_NODE_CLASSES,
      contracts: NODE_ECONOMY_CONTRACTS,
      proofLinks: [
        { label: 'NodeRegistry', url: `https://arbitrum.blockscout.com/address/${NODE_ECONOMY_CONTRACTS.NODE_REGISTRY}` },
        { label: 'NodeRewards', url: `https://arbitrum.blockscout.com/address/${NODE_ECONOMY_CONTRACTS.NODE_REWARDS}` },
        { label: 'SlashingEngine', url: `https://arbitrum.blockscout.com/address/${NODE_ECONOMY_CONTRACTS.SLASHING_ENGINE}` },
      ],
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error('Node Economy API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
