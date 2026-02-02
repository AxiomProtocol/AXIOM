import { ethers } from 'ethers';
import { getArbitrumRpcUrl } from '../../config';
import {
  NODE_ECONOMY_CONTRACTS,
  NODE_REGISTRY_ABI,
  NODE_REWARDS_ABI,
  SLASHING_ENGINE_ABI,
  ON_CHAIN_NODE_CLASSES,
  OPERATOR_ROLES,
  NODE_STATUS
} from './abis';

export interface NodeInfo {
  nodeId: number;
  operator: string;
  nodeClass: number;
  nodeClassName: string;
  status: number;
  statusName: string;
  stakeAmount: string;
  registeredAt: Date | null;
  activatedAt: Date | null;
  lastRewardAt: Date | null;
  metadataHash: string;
}

export interface StakeRequirement {
  nodeClass: string;
  minStake: string;
  lockPeriodDays: number;
  active: boolean;
}

export interface SlashingParams {
  nodeClass: string;
  slashPercent: number;
  cooldownHours: number;
  maxSlashes: number;
  active: boolean;
}

export interface RewardsInfo {
  currentEpoch: number;
  epochStartTime: Date | null;
  epochDurationDays: number;
  maxRewardsPerEpoch: string;
  timeUntilNextEpochHours: number;
  totalDistributed: string;
}

export interface NodeEconomyStats {
  systemStatus: 'OPERATIONAL' | 'UNCONFIGURED' | 'PAUSED';
  nodes: {
    total: number;
    active: number;
    byClass: Record<string, number>;
  };
  rewards: RewardsInfo;
  slashing: {
    totalSlashed: string;
    totalEscrowed: string;
    availableForWithdrawal: string;
  };
  stakeRequirements: StakeRequirement[];
  slashingParams: SlashingParams[];
}

class NodeEconomyService {
  private provider: ethers.JsonRpcProvider;
  private nodeRegistry: ethers.Contract;
  private nodeRewards: ethers.Contract;
  private slashingEngine: ethers.Contract;

  constructor() {
    const rpcUrl = getArbitrumRpcUrl();
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.nodeRegistry = new ethers.Contract(NODE_ECONOMY_CONTRACTS.NODE_REGISTRY, NODE_REGISTRY_ABI, this.provider);
    this.nodeRewards = new ethers.Contract(NODE_ECONOMY_CONTRACTS.NODE_REWARDS, NODE_REWARDS_ABI, this.provider);
    this.slashingEngine = new ethers.Contract(NODE_ECONOMY_CONTRACTS.SLASHING_ENGINE, SLASHING_ENGINE_ABI, this.provider);
  }

  async getSystemStats(): Promise<NodeEconomyStats> {
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
      totalDistributed,
      totalSlashed,
      totalEscrowed,
      availableWithdrawal,
      configured,
      registryPaused,
      rewardsPaused
    ] = await Promise.all([
      this.nodeRegistry.getTotalNodeCount().catch(() => 0n),
      this.nodeRegistry.getActiveNodeCount(0).catch(() => 0n),
      this.nodeRegistry.getActiveNodeCount(1).catch(() => 0n),
      this.nodeRegistry.getActiveNodeCount(2).catch(() => 0n),
      this.nodeRegistry.getActiveNodeCount(3).catch(() => 0n),
      this.nodeRewards.getCurrentEpoch().catch(() => 1n),
      this.nodeRewards.epochStartTime().catch(() => 0n),
      this.nodeRewards.globalEpochDuration().catch(() => 604800n),
      this.nodeRewards.maxRewardsPerEpoch().catch(() => 0n),
      this.nodeRewards.getTimeUntilNextEpoch().catch(() => 0n),
      this.nodeRewards.getTotalDistributed().catch(() => 0n),
      this.slashingEngine.totalSlashed().catch(() => 0n),
      this.slashingEngine.totalEscrowed().catch(() => 0n),
      this.slashingEngine.getAvailableForWithdrawal().catch(() => 0n),
      this.nodeRegistry.areContractsConfigured().catch(() => false),
      this.nodeRegistry.paused().catch(() => false),
      this.nodeRewards.paused().catch(() => false)
    ]);

    const stakeRequirements = await this.getStakeRequirements();
    const slashingParams = await this.getSlashingParams();

    let systemStatus: 'OPERATIONAL' | 'UNCONFIGURED' | 'PAUSED' = 'OPERATIONAL';
    if (!configured) systemStatus = 'UNCONFIGURED';
    if (registryPaused || rewardsPaused) systemStatus = 'PAUSED';

    return {
      systemStatus,
      nodes: {
        total: Number(totalNodes),
        active: Number(storageActive) + Number(executionActive) + Number(indexingActive) + Number(researchActive),
        byClass: {
          storage: Number(storageActive),
          execution: Number(executionActive),
          indexing: Number(indexingActive),
          research: Number(researchActive)
        }
      },
      rewards: {
        currentEpoch: Number(currentEpoch),
        epochStartTime: Number(epochStartTime) > 0 ? new Date(Number(epochStartTime) * 1000) : null,
        epochDurationDays: Number(epochDuration) / 86400,
        maxRewardsPerEpoch: ethers.formatEther(maxRewards),
        timeUntilNextEpochHours: Number(timeUntilNextEpoch) / 3600,
        totalDistributed: ethers.formatEther(totalDistributed)
      },
      slashing: {
        totalSlashed: ethers.formatEther(totalSlashed),
        totalEscrowed: ethers.formatEther(totalEscrowed),
        availableForWithdrawal: ethers.formatEther(availableWithdrawal)
      },
      stakeRequirements,
      slashingParams
    };
  }

  async getStakeRequirements(): Promise<StakeRequirement[]> {
    return Promise.all(
      [0, 1, 2, 3].map(async (i) => {
        try {
          const req = await this.nodeRegistry.getStakeRequirement(i);
          return {
            nodeClass: ON_CHAIN_NODE_CLASSES[i],
            minStake: ethers.formatEther(req.minStake || req[0] || 0n),
            lockPeriodDays: Number(req.lockPeriod || req[1] || 0n) / 86400,
            active: req.active ?? req[2] ?? true
          };
        } catch {
          return { nodeClass: ON_CHAIN_NODE_CLASSES[i], minStake: '0', lockPeriodDays: 0, active: false };
        }
      })
    );
  }

  async getSlashingParams(): Promise<SlashingParams[]> {
    return Promise.all(
      [0, 1, 2, 3].map(async (i) => {
        try {
          const params = await this.slashingEngine.getSlashingParams(i);
          return {
            nodeClass: ON_CHAIN_NODE_CLASSES[i],
            slashPercent: Number(params.slashPercentBps || params[0] || 0n) / 100,
            cooldownHours: Number(params.cooldownPeriod || params[1] || 0n) / 3600,
            maxSlashes: Number(params.maxSlashesBeforeSuspension || params[2] || 0n),
            active: params.active ?? params[3] ?? true
          };
        } catch {
          return { nodeClass: ON_CHAIN_NODE_CLASSES[i], slashPercent: 0, cooldownHours: 0, maxSlashes: 0, active: false };
        }
      })
    );
  }

  async getNodeByOperator(operatorAddress: string): Promise<NodeInfo | null> {
    try {
      const nodeId = await this.nodeRegistry.operatorToNode(operatorAddress);
      if (nodeId === 0n) return null;
      return this.getNode(Number(nodeId));
    } catch {
      return null;
    }
  }

  async getNode(nodeId: number): Promise<NodeInfo | null> {
    try {
      const node = await this.nodeRegistry.getNode(nodeId);
      const statusNames = ['REGISTERED', 'ACTIVE', 'SUSPENDED', 'DECOMMISSIONED'];
      return {
        nodeId: Number(node.nodeId),
        operator: node.operator,
        nodeClass: Number(node.nodeClass),
        nodeClassName: ON_CHAIN_NODE_CLASSES[Number(node.nodeClass)] || 'UNKNOWN',
        status: Number(node.status),
        statusName: statusNames[Number(node.status)] || 'UNKNOWN',
        stakeAmount: ethers.formatEther(node.stakeAmount),
        registeredAt: Number(node.registeredAt) > 0 ? new Date(Number(node.registeredAt) * 1000) : null,
        activatedAt: Number(node.activatedAt) > 0 ? new Date(Number(node.activatedAt) * 1000) : null,
        lastRewardAt: Number(node.lastRewardAt) > 0 ? new Date(Number(node.lastRewardAt) * 1000) : null,
        metadataHash: node.metadataHash
      };
    } catch {
      return null;
    }
  }

  async getNodeRewards(nodeId: number): Promise<{ pending: string; claimed: string }> {
    try {
      const [pending, claimed] = await Promise.all([
        this.nodeRewards.getPendingRewards(nodeId).catch(() => 0n),
        this.nodeRewards.getClaimedRewards(nodeId).catch(() => 0n)
      ]);
      return {
        pending: ethers.formatEther(pending),
        claimed: ethers.formatEther(claimed)
      };
    } catch {
      return { pending: '0', claimed: '0' };
    }
  }

  async getNodeSlashCount(nodeId: number): Promise<number> {
    try {
      return Number(await this.slashingEngine.getNodeSlashCount(nodeId));
    } catch {
      return 0;
    }
  }

  getContracts() {
    return NODE_ECONOMY_CONTRACTS;
  }

  getBlockscoutLinks() {
    return {
      nodeRegistry: `https://arbitrum.blockscout.com/address/${NODE_ECONOMY_CONTRACTS.NODE_REGISTRY}`,
      nodeRewards: `https://arbitrum.blockscout.com/address/${NODE_ECONOMY_CONTRACTS.NODE_REWARDS}`,
      slashingEngine: `https://arbitrum.blockscout.com/address/${NODE_ECONOMY_CONTRACTS.SLASHING_ENGINE}`
    };
  }
}

let serviceInstance: NodeEconomyService | null = null;

export function getNodeEconomyService(): NodeEconomyService {
  if (!serviceInstance) {
    serviceInstance = new NodeEconomyService();
  }
  return serviceInstance;
}

export { NODE_ECONOMY_CONTRACTS, ON_CHAIN_NODE_CLASSES, OPERATOR_ROLES, NODE_STATUS };
