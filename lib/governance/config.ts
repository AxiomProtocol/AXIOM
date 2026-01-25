/**
 * Lending Governance Configuration
 * 
 * Configuration for the GovernanceHub timelock-based lending governance system.
 * This is separate from protocol-level token voting governance.
 * 
 * GovernanceHub provides:
 * - Role-based access control (RISK_COMMITTEE, SETTLEMENT_AUTHORITY, GUARDIAN)
 * - Timelock enforcement (24h minimum delay)
 * - Emergency pause capability (immediate, no timelock)
 * - Action queue with grace period (14 days)
 */

export const LENDING_GOVERNANCE_CONFIG = {
  ENABLED: true,
  
  GOVERNANCE_HUB_ADDRESS: '0x52Dc85fd653a75323b5307f4D2629ab9A070530E',
  
  TIMELOCK_PARAMS: {
    MINIMUM_DELAY: 24 * 60 * 60, // 24 hours in seconds
    MIN_DELAY_FLOOR: 1 * 60 * 60, // 1 hour in seconds (hardcoded minimum)
    MAX_DELAY_CAP: 30 * 24 * 60 * 60, // 30 days in seconds
    GRACE_PERIOD: 14 * 24 * 60 * 60, // 14 days in seconds
  },
  
  ACTION_TYPES: {
    RISK_PARAM_UPDATE: 0,
    PRODUCT_ACTIVATION: 1,
    PRODUCT_DEACTIVATION: 2,
    PRODUCT_REGISTRATION: 3,
    PRODUCT_DEREGISTRATION: 4,
    MANAGER_UPDATE: 5,
    CONTRACT_CONFIG_UPDATE: 6,
    EMERGENCY_UNPAUSE: 7,
  },
  
  ACTION_STATES: {
    PENDING: 0,
    READY: 1,
    EXECUTED: 2,
    CANCELLED: 3,
    EXPIRED: 4,
  },
  
  ROLE_HASHES: {
    DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
    RISK_COMMITTEE_ROLE: '0x987c9081ae519b0552447fc5dc9a54b464951d56d8df3681057aa783f4362d12',
    SETTLEMENT_AUTHORITY_ROLE: '0xa6bec64779af3db3426e9500ad13a54db1077d89813787e686daf275f0743212',
    GUARDIAN_ROLE: '0x55435dd261a4b9b3364963f7738a7a662ad9c84396d64be3365284bb7f0a5041',
  },
} as const;

export const GOVERNANCE_HUB_ABI = [
  "function proposeAction(uint8 actionType, address target, bytes calldata callData, uint256 eta) external returns (bytes32 actionId)",
  "function cancelAction(bytes32 actionId) external",
  "function executeAction(bytes32 actionId) external returns (bool success, bytes memory result)",
  
  "function pauseLending() external",
  "function unpauseLending() external",
  
  "function setMinimumDelay(uint256 newDelay) external",
  "function setGracePeriod(uint256 newPeriod) external",
  "function authorizeTarget(address target) external",
  "function revokeTarget(address target) external",
  
  "function getAction(bytes32 actionId) external view returns (tuple(bytes32 actionId, uint8 actionType, address target, bytes callData, uint256 eta, address proposer, uint8 state, uint256 proposedAt))",
  "function getActionState(bytes32 actionId) external view returns (uint8)",
  "function getPendingActions() external view returns (bytes32[])",
  "function getAuthorizedTargets() external view returns (address[])",
  "function getPendingActionsCount() external view returns (uint256)",
  
  "function lendingPaused() external view returns (bool)",
  "function minimumDelay() external view returns (uint256)",
  "function gracePeriod() external view returns (uint256)",
  "function actionNonce() external view returns (uint256)",
  "function isAuthorizedTarget(address target) external view returns (bool)",
  
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function getRoleAdmin(bytes32 role) external view returns (bytes32)",
  "function grantRole(bytes32 role, address account) external",
  "function revokeRole(bytes32 role, address account) external",
  "function renounceRole(bytes32 role, address account) external",
  
  "function computeActionId(uint8 actionType, address target, bytes calldata callData, uint256 eta, address proposer, uint256 nonce) external pure returns (bytes32)",
  
  "event ActionProposed(bytes32 indexed actionId, uint8 indexed actionType, address indexed target, bytes callData, uint256 eta, address proposer)",
  "event ActionCancelled(bytes32 indexed actionId, address indexed canceller)",
  "event ActionExecuted(bytes32 indexed actionId, uint8 indexed actionType, address indexed target, address executor, bool success)",
  "event LendingPaused(address indexed guardian)",
  "event LendingUnpaused(address indexed authority)",
  "event MinimumDelayUpdated(uint256 oldDelay, uint256 newDelay)",
  "event GracePeriodUpdated(uint256 oldPeriod, uint256 newPeriod)",
  "event TargetAuthorized(address indexed target)",
  "event TargetRevoked(address indexed target)"
];

export type ActionState = 
  | 'Pending'
  | 'Ready'
  | 'Executed'
  | 'Cancelled'
  | 'Expired';

export const ACTION_STATE_LABELS: Record<number, ActionState> = {
  0: 'Pending',
  1: 'Ready',
  2: 'Executed',
  3: 'Cancelled',
  4: 'Expired',
};

export function getActionStateLabel(stateNum: number): ActionState {
  return ACTION_STATE_LABELS[stateNum] ?? 'Pending';
}

export function isLendingGovernanceEnabled(): boolean {
  return LENDING_GOVERNANCE_CONFIG.ENABLED && 
         LENDING_GOVERNANCE_CONFIG.GOVERNANCE_HUB_ADDRESS !== null;
}

export function getGovernanceHubAddress(): string {
  return LENDING_GOVERNANCE_CONFIG.GOVERNANCE_HUB_ADDRESS;
}

export function calculateEta(delaySeconds: number = LENDING_GOVERNANCE_CONFIG.TIMELOCK_PARAMS.MINIMUM_DELAY): number {
  return Math.floor(Date.now() / 1000) + delaySeconds;
}

export function isActionExpired(eta: number, gracePeriod: number = LENDING_GOVERNANCE_CONFIG.TIMELOCK_PARAMS.GRACE_PERIOD): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now > eta + gracePeriod;
}

export function isActionReady(eta: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now >= eta;
}

/**
 * Legacy compatibility - Protocol-level token voting governance
 * This is for future use when a Governor-style voting contract is deployed
 */
export const PROTOCOL_GOVERNANCE_CONFIG = {
  USE_ONCHAIN_VOTING: false,
  GOVERNANCE_CONTRACT_ADDRESS: null as string | null,
  VE_AXM_CONTRACT_ADDRESS: '0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046',
  
  VOTING_POWER_SOURCES: {
    AXM_BALANCE: true,
    STAKED_AXM: true,
    DEPIN_NODES: true,
    DELEGATED_POWER: true,
  },
  
  PROPOSAL_THRESHOLDS: {
    CREATE_PROPOSAL: '1000',
    QUORUM_PERCENTAGE: 4,
    VOTING_PERIOD_BLOCKS: 40320,
    EXECUTION_DELAY_BLOCKS: 6545,
  },
  
  SUPPORT_VALUES: {
    AGAINST: 0,
    FOR: 1,
    ABSTAIN: 2,
  },
} as const;

export type ProposalState = 
  | 'Pending'
  | 'Active'
  | 'Canceled'
  | 'Defeated'
  | 'Succeeded'
  | 'Queued'
  | 'Expired'
  | 'Executed';

export const PROPOSAL_STATES: Record<number, ProposalState> = {
  0: 'Pending',
  1: 'Active',
  2: 'Canceled',
  3: 'Defeated',
  4: 'Succeeded',
  5: 'Queued',
  6: 'Expired',
  7: 'Executed',
};

export function getProposalState(stateNum: number): ProposalState {
  return PROPOSAL_STATES[stateNum] ?? 'Pending';
}

export function isOnchainVotingEnabled(): boolean {
  return PROTOCOL_GOVERNANCE_CONFIG.USE_ONCHAIN_VOTING && 
         PROTOCOL_GOVERNANCE_CONFIG.GOVERNANCE_CONTRACT_ADDRESS !== null;
}

export function getGovernanceContractAddress(): string | null {
  if (!isOnchainVotingEnabled()) return null;
  return PROTOCOL_GOVERNANCE_CONFIG.GOVERNANCE_CONTRACT_ADDRESS;
}

/**
 * @deprecated Use LENDING_GOVERNANCE_CONFIG for lending governance (GovernanceHub)
 * This config is for PROTOCOL-LEVEL token voting (not yet deployed).
 * The on-chain voting system for protocol governance (propose/castVote) is NOT deployed.
 * Use LENDING_GOVERNANCE_CONFIG for the deployed lending timelock governance.
 */
export const GOVERNANCE_CONFIG = PROTOCOL_GOVERNANCE_CONFIG;

/**
 * @deprecated Use GOVERNANCE_HUB_ABI for lending governance
 * This ABI is for future Governor-style voting contracts (propose/castVote pattern).
 * The deployed GovernanceHub uses proposeAction/executeAction - use GOVERNANCE_HUB_ABI instead.
 */
export const GOVERNANCE_ABI = [
  "function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) external returns (uint256)",
  "function castVote(uint256 proposalId, uint8 support) external returns (uint256)",
  "function castVoteWithReason(uint256 proposalId, uint8 support, string reason) external returns (uint256)",
  "function execute(uint256 proposalId) external payable",
  "function cancel(uint256 proposalId) external",
  "function getVotes(address account, uint256 blockNumber) external view returns (uint256)",
  "function getVotingPower(address account) external view returns (uint256)",
  "function hasVoted(uint256 proposalId, address account) external view returns (bool)",
  "function state(uint256 proposalId) external view returns (uint8)",
  "function proposalDeadline(uint256 proposalId) external view returns (uint256)",
  "function proposalSnapshot(uint256 proposalId) external view returns (uint256)",
  "function quorum(uint256 blockNumber) external view returns (uint256)",
  "function delegate(address delegatee) external",
  "function delegates(address account) external view returns (address)",
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)",
  "event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)",
  "event ProposalExecuted(uint256 proposalId)",
  "event ProposalCanceled(uint256 proposalId)"
];
