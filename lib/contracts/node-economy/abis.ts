import { NODE_ECONOMY_CONTRACTS } from '../../../shared/contracts';

export const NODE_REGISTRY_ABI = [
  'function getTotalNodeCount() view returns (uint256)',
  'function getActiveNodeCount(uint8 nodeClass) view returns (uint256)',
  'function getStakeRequirement(uint8 nodeClass) view returns (tuple(uint256 minStake, uint256 lockPeriod, bool active))',
  'function areContractsConfigured() view returns (bool)',
  'function getNode(uint256 nodeId) view returns (tuple(uint256 nodeId, address operator, uint8 nodeClass, uint8 status, uint256 stakeAmount, uint256 registeredAt, uint256 activatedAt, uint256 lastRewardAt, bytes32 metadataHash))',
  'function getNodesByOperator(address operator) view returns (uint256[])',
  'function isNodeActive(uint256 nodeId) view returns (bool)',
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
  'function calculateNodeReward(uint256 nodeId) view returns (uint256)',
  'function paused() view returns (bool)',
  'event EpochCompleted(uint256 indexed epochId, uint256 totalRewards, uint256 nodesRewarded)',
  'event RewardClaimed(uint256 indexed nodeId, address indexed operator, uint256 amount)',
  'event PerformanceUpdated(uint256 indexed nodeId, uint256 uptimeBps, uint256 tasksCompleted, uint256 qualityScore)'
] as const;

export const SLASHING_ENGINE_ABI = [
  'function totalSlashed() view returns (uint256)',
  'function totalEscrowed() view returns (uint256)',
  'function getAvailableForWithdrawal() view returns (uint256)',
  'function getSlashingParams(uint8 nodeClass) view returns (tuple(uint256 slashPercentBps, uint256 cooldownPeriod, uint256 maxSlashesBeforeSuspension, bool active))',
  'function getEscrowedAmount(uint256 slashId) view returns (uint256)',
  'function paused() view returns (bool)',
  'event NodeSlashed(uint256 indexed nodeId, uint256 indexed slashId, uint8 reason, uint256 amount)',
  'event AppealRefunded(uint256 indexed slashId, address indexed operator, uint256 amount)',
  'event FundsReceived(uint256 indexed nodeId, uint256 amount)'
] as const;

export const CAPITAL_READINESS_GATE_ABI = [
  'function checkReadiness() view returns (bool isReady, string failureReason)',
  'function assertReady() view returns (bool ready)',
  'function getObservationDaysElapsed() view returns (uint256)',
  'function getAttestation() view returns (tuple(uint256 uptimeBps, uint256 incidentsCount, uint256 tvlUsd, uint64 lastUpdated, uint64 observationStartTimestamp, bytes32 auditHash))',
  'function getConfig() view returns (tuple(bytes32 requiredAuditHash, uint16 minimumUptimeBps, uint16 minimumObservationDaysElapsed, uint16 maxIncidentsAllowed, uint256 minimumTVLUsd, uint256 freezeWindowSeconds))',
  'function checkFreezeStatus() view returns (bool inFreeze, uint64 unfreezeAt)',
  'function getAttestationFreshness() view returns (uint256 secondsRemaining)',
  'function maxAttestationStaleness() view returns (uint256)',
  'function paused() view returns (bool)',
  'event AttestationPosted(uint256 uptimeBps, uint256 incidentsCount, uint256 tvlUsd, bytes32 auditHash, address indexed postedBy, uint64 timestamp)',
  'event ConfigUpdated(bytes32 requiredAuditHash, uint16 minimumUptimeBps, uint16 minimumObservationDaysElapsed, uint16 maxIncidentsAllowed, uint256 minimumTVLUsd, uint256 freezeWindowSeconds, address indexed updatedBy, uint64 timestamp)'
] as const;

export const ON_CHAIN_NODE_CLASSES = ['STORAGE', 'EXECUTION', 'INDEXING', 'RESEARCH'] as const;
export type OnChainNodeClass = typeof ON_CHAIN_NODE_CLASSES[number];

export const OPERATOR_ROLES = ['OBSERVER', 'VALIDATOR', 'ATTESTOR'] as const;
export type OperatorRole = typeof OPERATOR_ROLES[number];

export const NODE_STATUS = {
  REGISTERED: 0,
  ACTIVE: 1,
  SUSPENDED: 2,
  DECOMMISSIONED: 3
} as const;

export { NODE_ECONOMY_CONTRACTS };
