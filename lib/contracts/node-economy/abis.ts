import { NODE_ECONOMY_CONTRACTS } from '../../../shared/contracts';

export const NODE_REGISTRY_ABI = [
  'function getTotalNodeCount() view returns (uint256)',
  'function getActiveNodeCount(uint8 nodeClass) view returns (uint256)',
  'function getStakeRequirement(uint8 nodeClass) view returns (tuple(uint256 minStake, uint256 lockPeriod, bool active))',
  'function areContractsConfigured() view returns (bool)',
  'function getNode(uint256 nodeId) view returns (tuple(uint256 nodeId, address operator, uint8 nodeClass, uint8 status, uint256 stakeAmount, uint256 registeredAt, uint256 activatedAt, uint256 lastRewardAt, bytes32 metadataHash))',
  'function operatorToNode(address operator) view returns (uint256)',
  'function nextNodeId() view returns (uint256)',
  'function paused() view returns (bool)',
  'event NodeRegistered(uint256 indexed nodeId, address indexed operator, uint8 nodeClass)',
  'event NodeActivated(uint256 indexed nodeId, uint256 stakeAmount)',
  'event NodeDeactivated(uint256 indexed nodeId)',
  'event NodeSuspended(uint256 indexed nodeId, string reason)',
  'event NodeDecommissioned(uint256 indexed nodeId)',
  'event StakeUpdated(uint256 indexed nodeId, uint256 oldAmount, uint256 newAmount)',
  'event MetadataUpdated(uint256 indexed nodeId, bytes32 metadataHash)'
] as const;

export const NODE_REWARDS_ABI = [
  'function getCurrentEpoch() view returns (uint256)',
  'function epochStartTime() view returns (uint256)',
  'function globalEpochDuration() view returns (uint256)',
  'function maxRewardsPerEpoch() view returns (uint256)',
  'function getTimeUntilNextEpoch() view returns (uint256)',
  'function getEpochReward(uint256 epochId) view returns (tuple(uint256 epochId, uint256 totalRewards, uint256 nodesRewarded, uint256 timestamp))',
  'function getPendingRewards(uint256 nodeId) view returns (uint256)',
  'function getClaimedRewards(uint256 nodeId) view returns (uint256)',
  'function getTotalDistributed() view returns (uint256)',
  'function paused() view returns (bool)',
  'event RewardsDistributed(uint256 indexed epochId, uint256 totalAmount, uint256 nodesRewarded)',
  'event RewardsClaimed(uint256 indexed nodeId, address indexed operator, uint256 amount)',
  'event EpochAdvanced(uint256 indexed newEpochId, uint256 timestamp)'
] as const;

export const SLASHING_ENGINE_ABI = [
  'function totalSlashed() view returns (uint256)',
  'function totalEscrowed() view returns (uint256)',
  'function getAvailableForWithdrawal() view returns (uint256)',
  'function getSlashingParams(uint8 nodeClass) view returns (tuple(uint256 slashPercentBps, uint256 cooldownPeriod, uint256 maxSlashesBeforeSuspension, bool active))',
  'function getNodeSlashCount(uint256 nodeId) view returns (uint256)',
  'function getSlashProposal(uint256 proposalId) view returns (tuple(uint256 proposalId, uint256 nodeId, uint256 amount, uint8 status, address proposer, uint256 proposedAt, string reason))',
  'function paused() view returns (bool)',
  'event SlashProposed(uint256 indexed proposalId, uint256 indexed nodeId, uint256 amount, address indexed proposer)',
  'event SlashExecuted(uint256 indexed proposalId, uint256 indexed nodeId, uint256 amount)',
  'event SlashCancelled(uint256 indexed proposalId, string reason)',
  'event FundsRecovered(address indexed recipient, uint256 amount)'
] as const;

export const NODE_CLASSES = ['OBSERVER', 'VALIDATOR', 'ATTESTOR'] as const;
export type NodeClass = typeof NODE_CLASSES[number];

export const NODE_STATUS = {
  REGISTERED: 0,
  ACTIVE: 1,
  SUSPENDED: 2,
  DECOMMISSIONED: 3
} as const;

export { NODE_ECONOMY_CONTRACTS };
