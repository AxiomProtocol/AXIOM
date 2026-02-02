# Node Operator Program - On-Chain Specifications

**Version:** 1.0  
**Created:** February 2, 2026  
**Source:** `archive/contracts-dev/artifacts-capital-bridge/contracts-capital-bridge/`  
**Network:** Arbitrum One (Chain ID: 42161)

---

## Overview

This document specifies the on-chain contracts for Step 2 implementation. Contract specifications are derived from existing artifacts in the archive.

---

## Contract Summary

| Contract | Purpose | Artifact Location |
|----------|---------|-------------------|
| NodeRegistry | Operator registration and credential management | `node-economy/NodeRegistry.sol/` |
| NodeRewards | Rewards distribution and claiming | `node-economy/NodeRewards.sol/` |
| SlashingEngine | Penalty enforcement for violations | `node-economy/SlashingEngine.sol/` |
| CapitalReadinessGate | Readiness verification for operations | `readiness/CapitalReadinessGate.sol/` |

---

## NodeRegistry

Primary contract for operator registration, role management, and credential issuance.

### Events (From ABI)

*Source: `archive/.../NodeRegistry.sol/NodeRegistry.json` lines 54-336*

```solidity
event NodeRegistered(uint256 indexed nodeId, address indexed operator, NodeClass nodeClass);
event NodeActivated(uint256 indexed nodeId, uint256 stakeAmount);
event NodeDeactivated(uint256 indexed nodeId);
event NodeSuspended(uint256 indexed nodeId, string reason);
event NodeDecommissioned(uint256 indexed nodeId);
event MetadataUpdated(uint256 indexed nodeId, bytes32 metadataHash);
event StakeUpdated(uint256 indexed nodeId, uint256 oldAmount, uint256 newAmount);
event StakeRequirementUpdated(NodeClass nodeClass, uint256 minStake, uint256 lockPeriod);
event SlashedFundsTransferred(uint256 indexed nodeId, uint256 amount, address indexed slashingEngine);
event Paused(address account);
event Unpaused(address account);
event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
```

### Node Classes

```solidity
enum NodeClass {
  OBSERVER,   // 0 - Read-only access
  VALIDATOR,  // 1 - Validation capabilities
  ATTESTOR    // 2 - Full attestation authority
}
```

### Core Functions (From ABI)

*Source: `archive/.../NodeRegistry.sol/NodeRegistry.json`*

| Function | Access | Description |
|----------|--------|-------------|
| `activateNode(uint256 nodeId)` | Payable | Activate node with stake payment |
| `deactivateNode(uint256 nodeId)` | Nonpayable | Deactivate node |
| `decommissionNode(uint256 nodeId)` | Nonpayable | Permanently decommission node |
| `getActiveNodeCount(NodeClass)` | View | Get count of active nodes by class |
| `getLockExpiry(uint256 nodeId)` | View | Get stake lock expiry timestamp |
| `getNode(uint256 nodeId)` | View | Get full node details struct |
| `areContractsConfigured()` | View | Check if linked contracts are set |

### Storage

```solidity
struct Node {
  uint256 nodeId;
  address operator;
  NodeClass nodeClass;
  NodeStatus status;
  uint256 stakeAmount;
  bytes32 metadataHash;
  uint256 registeredAt;
  uint256 activatedAt;
}

mapping(uint256 => Node) public nodes;
mapping(address => uint256) public operatorToNode;
uint256 public nextNodeId;
```

### Roles (From ABI)

*Source: `archive/.../NodeRegistry.sol/NodeRegistry.json` lines 339-388*

| Role | Purpose |
|------|---------|
| DEFAULT_ADMIN_ROLE | Full administrative control |
| GUARDIAN_ROLE | Emergency pause capabilities |
| NODE_MANAGER_ROLE | Manage node registrations |
| SLASHER_ROLE | Execute slashing operations |

---

## NodeRewards

Manages rewards distribution, accrual, and claiming.

### Events

```solidity
event RewardsAccrued(uint256 indexed nodeId, uint256 amount, string reason);
event RewardsClaimed(uint256 indexed nodeId, uint256 amount, address recipient);
event RewardsSlashed(uint256 indexed nodeId, uint256 amount, string reason);
event ConversionCompleted(uint256 indexed nodeId, uint256 usdAmount, uint256 tokenAmount);
```

### Core Functions

| Function | Access | Description |
|----------|--------|-------------|
| `accrueRewards(uint256 nodeId, uint256 amount, string reason)` | ORACLE | Add rewards to node |
| `claimRewards(uint256 nodeId)` | Owner | Claim pending rewards |
| `slashRewards(uint256 nodeId, uint256 amount, string reason)` | SLASHER | Reduce rewards |
| `convertToToken(uint256 nodeId, uint256 usdAmount)` | Owner | Convert USD to token |
| `getPendingRewards(uint256 nodeId)` | View | Get pending amount |
| `getTotalEarnings(uint256 nodeId)` | View | Get total earned |

### Storage

```solidity
struct RewardAccount {
  uint256 totalAccrued;
  uint256 totalClaimed;
  uint256 totalSlashed;
  uint256 pendingBalance;
  uint256 conversionBucket;
}

mapping(uint256 => RewardAccount) public accounts;
```

### Roles

| Role | Purpose |
|------|---------|
| DEFAULT_ADMIN_ROLE | Full administrative control |
| ORACLE_ROLE | Post reward accruals |
| SLASHER_ROLE | Slash rewards for violations |

---

## SlashingEngine

Enforces penalties for operator violations.

### Events

```solidity
event SlashingProposed(uint256 indexed slashId, uint256 indexed nodeId, uint256 amount, string reason);
event SlashingExecuted(uint256 indexed slashId, uint256 indexed nodeId, uint256 amount);
event SlashingCancelled(uint256 indexed slashId, string reason);
event SlashingAppealed(uint256 indexed slashId, string evidence);
```

### Slashing Types

```solidity
enum SlashType {
  MINOR,      // Warning + small penalty
  MODERATE,   // Moderate penalty + suspension
  SEVERE,     // Large penalty + deactivation
  CRITICAL    // Full slash + decommission
}
```

### Core Functions

| Function | Access | Description |
|----------|--------|-------------|
| `proposeSlash(uint256 nodeId, SlashType, uint256 amount, string reason)` | SLASHER | Propose penalty |
| `executeSlash(uint256 slashId)` | EXECUTOR | Execute after delay |
| `cancelSlash(uint256 slashId, string reason)` | ADMIN | Cancel proposed slash |
| `appealSlash(uint256 slashId, string evidence)` | Owner | Appeal decision |
| `getSlashProposal(uint256 slashId)` | View | Get proposal details |

### Slash Parameters

| Type | Penalty Range | Suspension | Timelock |
|------|--------------|------------|----------|
| MINOR | 0-5% | None | 24h |
| MODERATE | 5-20% | 7 days | 48h |
| SEVERE | 20-50% | 30 days | 72h |
| CRITICAL | 50-100% | Permanent | 168h (7 days) |

---

## CapitalReadinessGate

Verifies operator readiness for specific operations.

### Events

```solidity
event ReadinessCheckPassed(uint256 indexed nodeId, bytes32 indexed checkType);
event ReadinessCheckFailed(uint256 indexed nodeId, bytes32 indexed checkType, string reason);
event ReadinessRequirementUpdated(bytes32 indexed checkType, uint256 threshold);
```

### Check Types

```solidity
bytes32 constant ATTESTATION_READY = keccak256("ATTESTATION_READY");
bytes32 constant VALIDATION_READY = keccak256("VALIDATION_READY");
bytes32 constant OBSERVATION_READY = keccak256("OBSERVATION_READY");
bytes32 constant CAPITAL_READY = keccak256("CAPITAL_READY");
```

### Core Functions

| Function | Access | Description |
|----------|--------|-------------|
| `checkReadiness(uint256 nodeId, bytes32 checkType)` | View | Check if ready |
| `requireReadiness(uint256 nodeId, bytes32 checkType)` | Modifier | Revert if not ready |
| `updateRequirement(bytes32 checkType, uint256 threshold)` | ADMIN | Update threshold |
| `getReadinessStatus(uint256 nodeId)` | View | Get all readiness flags |

### Readiness Requirements

| Check | Requirement |
|-------|-------------|
| OBSERVATION_READY | Node registered + active |
| VALIDATION_READY | Observation + 30 days tenure |
| ATTESTATION_READY | Validation + passing dry-run + bonded |
| CAPITAL_READY | Attestation + capital threshold met |

---

## Integration with Off-Chain

### Credential Sync Flow

```
Off-Chain (Admin advances to CERTIFIED)
     │
     ▼
Call NodeRegistry.registerNode()
     │
     ▼
Emit NodeRegistered event
     │
     ▼
Off-Chain listener updates status
     │
     ▼
User can now sign on-chain attestations
```

### Rewards Sync Flow

```
Off-Chain (Rewards calculated)
     │
     ▼
Oracle calls NodeRewards.accrueRewards()
     │
     ▼
Emit RewardsAccrued event
     │
     ▼
User views updated balance
     │
     ▼
User calls claimRewards() to withdraw
```

---

## Deployment Plan

### Phase 1: Core Registry

1. Deploy NodeRegistry with admin = Gnosis Safe
2. Configure REGISTRAR_ROLE for off-chain bridge
3. Test registration flow

### Phase 2: Rewards System

1. Deploy NodeRewards linked to NodeRegistry
2. Configure ORACLE_ROLE for rewards oracle
3. Test accrual and claiming

### Phase 3: Slashing

1. Deploy SlashingEngine linked to NodeRegistry + NodeRewards
2. Configure SLASHER_ROLE for compliance team
3. Test slashing flow with appeal

### Phase 4: Readiness Gate

1. Deploy CapitalReadinessGate linked to NodeRegistry
2. Configure thresholds per role
3. Integrate with attestation flow

---

## Roles Matrix (Derived from ABI)

*Source: Contract artifact ABIs in `archive/contracts-dev/artifacts-capital-bridge/`*

| Contract | Role | Planned Holder | Purpose |
|----------|------|----------------|---------|
| NodeRegistry | DEFAULT_ADMIN_ROLE | Gnosis Safe | Full admin |
| NodeRegistry | GUARDIAN_ROLE | Gnosis Safe | Emergency pause |
| NodeRegistry | NODE_MANAGER_ROLE | Off-chain bridge | Manage nodes |
| NodeRegistry | SLASHER_ROLE | SlashingEngine | Execute slashing |
| NodeRewards | DEFAULT_ADMIN_ROLE | Gnosis Safe | Full admin |
| NodeRewards | GUARDIAN_ROLE | Gnosis Safe | Emergency pause |
| SlashingEngine | DEFAULT_ADMIN_ROLE | Gnosis Safe | Full admin |
| SlashingEngine | GUARDIAN_ROLE | Gnosis Safe | Emergency pause |
| CapitalReadinessGate | DEFAULT_ADMIN_ROLE | Gnosis Safe | Update requirements |

*Note: Exact role names must be verified from each contract's ABI. Roles shown are from NodeRegistry ABI inspection.*

---

## Acceptance Criteria for Step 2

1. [ ] NodeRegistry deployed and verified on Arbiscan
2. [ ] NodeRewards deployed and linked to registry
3. [ ] SlashingEngine deployed with timelock integration
4. [ ] CapitalReadinessGate deployed with initial thresholds
5. [ ] All roles assigned per matrix above
6. [ ] Off-chain bridge can register nodes on-chain
7. [ ] Test transaction executed on mainnet
8. [ ] Events indexed and visible in off-chain system

---

## Related Documents

- [architecture.md](./architecture.md) - System architecture
- [workflow.md](./workflow.md) - State machine
- [data-model.md](./data-model.md) - Database schema
- [deployments.md](../deployments.md) - Deployed contracts
- [contract-registry.md](../contract-registry.md) - Contract classification
