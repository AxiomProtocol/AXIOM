import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { getArbitrumRpcUrl } from '../../../lib/config';
import { NODE_ECONOMY_CONTRACTS } from '../../../shared/contracts';

const NODE_REGISTRY_ABI = [
  'function getTotalNodeCount() view returns (uint256)',
  'function getActiveNodeCount(uint8 nodeClass) view returns (uint256)',
  'function getStakeRequirement(uint8 nodeClass) view returns (tuple(uint256 minStake, uint256 lockPeriod, bool active))',
  'function areContractsConfigured() view returns (bool)',
];

const NODE_REWARDS_ABI = [
  'function getCurrentEpoch() view returns (uint256)',
  'function epochStartTime() view returns (uint256)',
  'function globalEpochDuration() view returns (uint256)',
  'function maxRewardsPerEpoch() view returns (uint256)',
  'function getTimeUntilNextEpoch() view returns (uint256)',
  'function getEpochReward(uint256 epochId) view returns (tuple(uint256 epochId, uint256 totalRewards, uint256 nodesRewarded, uint256 timestamp))',
];

const SLASHING_ENGINE_ABI = [
  'function totalSlashed() view returns (uint256)',
  'function totalEscrowed() view returns (uint256)',
  'function getAvailableForWithdrawal() view returns (uint256)',
  'function getSlashingParams(uint8 nodeClass) view returns (tuple(uint256 slashPercentBps, uint256 cooldownPeriod, uint256 maxSlashesBeforeSuspension, bool active))',
];

const NODE_CLASSES = ['Storage', 'Execution', 'Indexing', 'Research'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rpcUrl = getArbitrumRpcUrl();
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const nodeRegistry = new ethers.Contract(NODE_ECONOMY_CONTRACTS.NODE_REGISTRY, NODE_REGISTRY_ABI, provider);
    const nodeRewards = new ethers.Contract(NODE_ECONOMY_CONTRACTS.NODE_REWARDS, NODE_REWARDS_ABI, provider);
    const slashingEngine = new ethers.Contract(NODE_ECONOMY_CONTRACTS.SLASHING_ENGINE, SLASHING_ENGINE_ABI, provider);

    const [
      totalNodes,
      storageActive,
      executionActive,
      indexingActive,
      researchActive,
      currentEpoch,
      epochStartTime,
      epochDuration,
      maxRewards,
      timeUntilNextEpoch,
      totalSlashed,
      totalEscrowed,
      availableWithdrawal,
      configured,
    ] = await Promise.all([
      nodeRegistry.getTotalNodeCount().catch(() => 0n),
      nodeRegistry.getActiveNodeCount(0).catch(() => 0n),
      nodeRegistry.getActiveNodeCount(1).catch(() => 0n),
      nodeRegistry.getActiveNodeCount(2).catch(() => 0n),
      nodeRegistry.getActiveNodeCount(3).catch(() => 0n),
      nodeRewards.getCurrentEpoch().catch(() => 1n),
      nodeRewards.epochStartTime().catch(() => 0n),
      nodeRewards.globalEpochDuration().catch(() => 604800n),
      nodeRewards.maxRewardsPerEpoch().catch(() => 0n),
      nodeRewards.getTimeUntilNextEpoch().catch(() => 0n),
      slashingEngine.totalSlashed().catch(() => 0n),
      slashingEngine.totalEscrowed().catch(() => 0n),
      slashingEngine.getAvailableForWithdrawal().catch(() => 0n),
      nodeRegistry.areContractsConfigured().catch(() => false),
    ]);

    const stakeRequirements = await Promise.all(
      [0, 1, 2, 3].map(async (i) => {
        try {
          const req = await nodeRegistry.getStakeRequirement(i);
          return {
            nodeClass: NODE_CLASSES[i],
            minStake: ethers.formatEther(req.minStake || req[0] || 0n),
            lockPeriodDays: Number(req.lockPeriod || req[1] || 0n) / 86400,
            active: req.active ?? req[2] ?? true,
          };
        } catch {
          return { nodeClass: NODE_CLASSES[i], minStake: '0', lockPeriodDays: 0, active: false };
        }
      })
    );

    const slashingParams = await Promise.all(
      [0, 1, 2, 3].map(async (i) => {
        try {
          const params = await slashingEngine.getSlashingParams(i);
          return {
            nodeClass: NODE_CLASSES[i],
            slashPercent: Number(params.slashPercentBps || params[0] || 0n) / 100,
            cooldownHours: Number(params.cooldownPeriod || params[1] || 0n) / 3600,
            maxSlashes: Number(params.maxSlashesBeforeSuspension || params[2] || 0n),
            active: params.active ?? params[3] ?? true,
          };
        } catch {
          return { nodeClass: NODE_CLASSES[i], slashPercent: 0, cooldownHours: 0, maxSlashes: 0, active: false };
        }
      })
    );

    const totalActiveNodes = Number(storageActive) + Number(executionActive) + Number(indexingActive) + Number(researchActive);

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      systemStatus: configured ? 'OPERATIONAL' : 'UNCONFIGURED',
      nodes: {
        total: Number(totalNodes),
        active: totalActiveNodes,
        byClass: {
          storage: Number(storageActive),
          execution: Number(executionActive),
          indexing: Number(indexingActive),
          research: Number(researchActive),
        },
      },
      rewards: {
        currentEpoch: Number(currentEpoch),
        epochStartTime: Number(epochStartTime) > 0 ? new Date(Number(epochStartTime) * 1000).toISOString() : null,
        epochDurationDays: Number(epochDuration) / 86400,
        maxRewardsPerEpoch: ethers.formatEther(maxRewards),
        timeUntilNextEpochHours: Number(timeUntilNextEpoch) / 3600,
      },
      slashing: {
        totalSlashed: ethers.formatEther(totalSlashed),
        totalEscrowed: ethers.formatEther(totalEscrowed),
        availableForWithdrawal: ethers.formatEther(availableWithdrawal),
      },
      stakeRequirements,
      slashingParams,
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
