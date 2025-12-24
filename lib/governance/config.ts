/**
 * Governance Configuration
 * 
 * Feature flags and configuration for governance voting.
 * When a GovernanceHub contract is deployed, update GOVERNANCE_CONTRACT_ADDRESS
 * and set USE_ONCHAIN_VOTING to true.
 */

export const GOVERNANCE_CONFIG = {
  USE_ONCHAIN_VOTING: false,
  
  GOVERNANCE_CONTRACT_ADDRESS: null as string | null,
  
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
  return GOVERNANCE_CONFIG.USE_ONCHAIN_VOTING && 
         GOVERNANCE_CONFIG.GOVERNANCE_CONTRACT_ADDRESS !== null;
}

export function getGovernanceContractAddress(): string | null {
  if (!isOnchainVotingEnabled()) return null;
  return GOVERNANCE_CONFIG.GOVERNANCE_CONTRACT_ADDRESS;
}
