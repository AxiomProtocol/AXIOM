# GovernanceHub Contract Specification

## Overview
The GovernanceHub contract provides on-chain governance voting for the Axiom Smart City ecosystem. It follows the OpenZeppelin Governor pattern with extensions for multi-source voting power (AXM tokens, staked AXM, DePIN nodes).

## Contract Details

| Property | Value |
|----------|-------|
| Name | AxiomGovernanceHub |
| Standard | OpenZeppelin Governor (ERC-5805 compatible) |
| Network | Arbitrum One |
| Dependencies | AccessControl, ReentrancyGuard, Pausable |

## Core Functions

### Voting Power

```solidity
function getVotingPower(address account) external view returns (uint256)
```
Returns total voting power from all sources:
- AXM token balance
- Staked AXM balance
- DePIN node ownership bonus
- Delegated voting power

### Proposal Creation

```solidity
function propose(
    address[] memory targets,
    uint256[] memory values,
    bytes[] memory calldatas,
    string memory description
) external returns (uint256 proposalId)
```
Requirements:
- Proposer must hold minimum 1,000 AXM voting power
- Description must follow format: "AIP-XXX: Title\n\nDescription"

### Vote Casting

```solidity
function castVote(uint256 proposalId, uint8 support) external returns (uint256 weight)
function castVoteWithReason(uint256 proposalId, uint8 support, string reason) external returns (uint256 weight)
```
Support values:
- 0 = Against
- 1 = For
- 2 = Abstain

### Delegation

```solidity
function delegate(address delegatee) external
function delegates(address account) external view returns (address)
```

### Proposal Lifecycle

```solidity
function state(uint256 proposalId) external view returns (ProposalState)
function execute(uint256 proposalId) external payable
function cancel(uint256 proposalId) external
```

## State Variables

```solidity
// Proposal threshold (minimum voting power to propose)
uint256 public proposalThreshold = 1000 * 10**18; // 1,000 AXM

// Quorum (minimum participation for valid vote)
uint256 public quorumNumerator = 4; // 4% of total supply

// Voting period
uint256 public votingPeriod = 40320; // ~1 week on Arbitrum

// Execution delay (timelock)
uint256 public executionDelay = 6545; // ~1 day on Arbitrum

// Contract references
address public axmToken;
address public stakingContract;
address public depinNodeContract;
```

## Events

```solidity
event ProposalCreated(
    uint256 indexed proposalId,
    address indexed proposer,
    address[] targets,
    uint256[] values,
    string[] signatures,
    bytes[] calldatas,
    uint256 startBlock,
    uint256 endBlock,
    string description
);

event VoteCast(
    address indexed voter,
    uint256 indexed proposalId,
    uint8 support,
    uint256 weight,
    string reason
);

event ProposalExecuted(uint256 indexed proposalId);
event ProposalCanceled(uint256 indexed proposalId);
event QuorumUpdated(uint256 oldQuorum, uint256 newQuorum);
event VotingPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);
```

## Voting Power Calculation

```solidity
function _getVotes(address account, uint256 blockNumber) internal view returns (uint256) {
    uint256 axmBalance = IAxiomToken(axmToken).getPastVotes(account, blockNumber);
    uint256 stakedBalance = IStakingHub(stakingContract).getStakedAt(account, blockNumber);
    uint256 nodePower = IDepinNodes(depinNodeContract).getNodeVotingPower(account);
    uint256 delegatedPower = _getDelegatedPower(account, blockNumber);
    
    return axmBalance + stakedBalance + nodePower + delegatedPower;
}
```

### Voting Power Multipliers

| Source | Multiplier | Notes |
|--------|------------|-------|
| AXM Balance | 1x | Base voting power |
| Staked AXM | 1.2x | Bonus for staking commitment |
| DePIN Node (Lite) | +100 AXM | Per node owned |
| DePIN Node (Standard) | +500 AXM | Per node owned |
| DePIN Node (Pro) | +2,000 AXM | Per node owned |
| DePIN Node (Enterprise) | +10,000 AXM | Per node owned |

## Security Features

1. **ReentrancyGuard**: Prevents reentrancy attacks on vote casting
2. **Pausable**: Emergency pause functionality for admin
3. **AccessControl**: Role-based permissions for admin functions
4. **Snapshot Voting**: Uses block-based snapshots to prevent flash loan attacks
5. **Timelock**: Execution delay allows users to exit before execution

## Roles

```solidity
bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
bytes32 public constant CANCELLER_ROLE = keccak256("CANCELLER_ROLE");
```

## Integration Points

| Contract | Purpose |
|----------|---------|
| AxiomV2 (AXM Token) | Read token balances for voting power |
| AxiomStakingAndEmissionsHub | Read staked balances |
| DePINNodeSuite | Read node ownership for bonus power |
| AxiomTreasuryAndRevenueHub | Execute treasury-related proposals |

## Proposal Categories

1. **Treasury**: Fund allocation, grants, buybacks
2. **Protocol**: Parameter changes, upgrades
3. **Community**: Social features, events, partnerships
4. **Emergency**: Pause contracts, security responses

## Constructor Parameters

```solidity
constructor(
    address _axmToken,           // 0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D
    address _stakingContract,    // 0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885
    address _depinNodeContract,  // 0x223dF824B320beD4A8Fd0648b242621e4d01aAEF
    address _treasury,           // 0x3fD63728288546AC41dAe3bf25ca383061c3A929
    uint256 _votingDelay,        // 1 block
    uint256 _votingPeriod,       // 40320 blocks (~1 week)
    uint256 _proposalThreshold   // 1000 * 10**18
)
```

## Deployment Checklist

- [ ] Deploy GovernanceHub contract
- [ ] Verify on Blockscout
- [ ] Grant ADMIN_ROLE to deployer
- [ ] Grant EXECUTOR_ROLE to timelock/multisig
- [ ] Update shared/contracts.ts with address
- [ ] Set GOVERNANCE_CONFIG.USE_ONCHAIN_VOTING = true
- [ ] Set GOVERNANCE_CONFIG.GOVERNANCE_CONTRACT_ADDRESS
- [ ] Test proposal creation and voting

## Gas Estimates

| Function | Estimated Gas |
|----------|--------------|
| propose() | ~300,000 |
| castVote() | ~80,000 |
| castVoteWithReason() | ~100,000 |
| execute() | ~150,000+ (depends on actions) |
| delegate() | ~50,000 |

## Sample Deployment Script

```javascript
const { ethers, upgrades } = require("hardhat");

async function main() {
  const GovernanceHub = await ethers.getContractFactory("AxiomGovernanceHub");
  
  const governance = await GovernanceHub.deploy(
    "0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D", // AXM Token
    "0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885", // Staking
    "0x223dF824B320beD4A8Fd0648b242621e4d01aAEF", // DePIN Nodes
    "0x3fD63728288546AC41dAe3bf25ca383061c3A929", // Treasury
    1,      // voting delay (1 block)
    40320,  // voting period (~1 week)
    ethers.parseEther("1000") // proposal threshold
  );
  
  await governance.waitForDeployment();
  console.log("GovernanceHub deployed to:", await governance.getAddress());
}

main().catch(console.error);
```
