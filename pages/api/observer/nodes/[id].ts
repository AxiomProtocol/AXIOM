import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const NODE_REGISTRY = '0x31bc6268155219B627FC3B2d8434d010F33DCb03';
const NODE_REWARDS = '0x0c1c96F38566d056877cEf4791c701C4F5AEf362';

const REGISTRY_ABI = [
  'function getNodeInfo(uint256 nodeId) view returns (tuple(uint256 nodeId, address operator, uint8 nodeClass, uint8 status, uint256 stakeAmount, uint256 activatedAt, uint256 lastActiveAt, bytes32 metadataHash, uint256 totalRewardsEarned, uint256 slashCount))',
  'function getStakeRequirement(uint8 nodeClass) view returns (tuple(uint256 minStake, uint256 lockPeriod, bool active))',
];

const REWARDS_ABI = [
  'function getNodePendingRewards(uint256 nodeId) view returns (uint256)',
];

const NODE_CLASSES = ['Storage', 'Execution', 'Indexing', 'Research'];
const NODE_STATUSES = ['Inactive', 'Active', 'Suspended'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const nodeId = Number(id);

    if (isNaN(nodeId) || nodeId < 1) {
      return res.status(400).json({ error: 'Invalid node ID' });
    }

    const rpcUrl = process.env.ARBITRUM_RPC_URL || `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    const registry = new ethers.Contract(NODE_REGISTRY, REGISTRY_ABI, provider);
    const rewards = new ethers.Contract(NODE_REWARDS, REWARDS_ABI, provider);

    const nodeInfo = await registry.getNodeInfo(nodeId);
    
    if (nodeInfo.nodeId === 0n) {
      return res.status(404).json({ error: 'Node not found' });
    }

    const stakeReq = await registry.getStakeRequirement(nodeInfo.nodeClass);
    let pendingRewards = 0n;
    try {
      pendingRewards = await rewards.getNodePendingRewards(nodeId);
    } catch {
      // Rewards might not be available
    }

    const activeDuration = nodeInfo.activatedAt > 0n 
      ? Math.floor((Date.now() / 1000) - Number(nodeInfo.activatedAt))
      : 0;

    return res.status(200).json({
      success: true,
      node: {
        nodeId: Number(nodeInfo.nodeId),
        operator: nodeInfo.operator,
        nodeClass: NODE_CLASSES[nodeInfo.nodeClass] || 'Unknown',
        nodeClassCode: nodeInfo.nodeClass,
        status: NODE_STATUSES[nodeInfo.status] || 'Unknown',
        statusCode: nodeInfo.status,
        stakeAmount: ethers.formatEther(nodeInfo.stakeAmount),
        minStakeRequired: ethers.formatEther(stakeReq.minStake),
        lockPeriodDays: Number(stakeReq.lockPeriod) / 86400,
        activatedAt: Number(nodeInfo.activatedAt) > 0 ? new Date(Number(nodeInfo.activatedAt) * 1000).toISOString() : null,
        lastActiveAt: Number(nodeInfo.lastActiveAt) > 0 ? new Date(Number(nodeInfo.lastActiveAt) * 1000).toISOString() : null,
        activeDurationDays: (activeDuration / 86400).toFixed(2),
        metadataHash: nodeInfo.metadataHash,
        totalRewardsEarned: ethers.formatEther(nodeInfo.totalRewardsEarned),
        pendingRewards: ethers.formatEther(pendingRewards),
        slashCount: Number(nodeInfo.slashCount),
      },
      contracts: {
        registry: NODE_REGISTRY,
        rewards: NODE_REWARDS,
      },
      proofLinks: [
        { label: 'NodeRegistry', url: `https://arbitrum.blockscout.com/address/${NODE_REGISTRY}` },
        { label: 'NodeRewards', url: `https://arbitrum.blockscout.com/address/${NODE_REWARDS}` },
      ],
    });
  } catch (error) {
    console.error('Node details API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
