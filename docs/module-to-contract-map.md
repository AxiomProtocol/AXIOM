# Axiom Protocol - Module to Contract Mapping

**Generated:** 2026-01-26  
**Network:** Arbitrum One (42161)  
**Governance Mode:** Configurable → Lock Forever

---

## Overview

This document maps each Axiom module to its deployed contracts and classifies functions as either:
- **TIMELOCKED**: Must execute through TimelockController with 24h+ delay
- **EMERGENCY**: Immediate execution by Guardian/Admin (no delay)
- **UNRESTRICTED**: No governance restrictions

---

## TimelockController

| Contract | Address | Status |
|----------|---------|--------|
| AxiomTimelockController | `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899` | Configurable (not locked) |
| AxiomGovernanceConfig | `0xa645a0Fcc15dD22Ee44d774F19731Fb0fE70b2CC` | Configurable (not locked) |

---

## Module 1: Treasury Core

### Contracts
| Contract | Address | Description |
|----------|---------|-------------|
| AxiomTreasuryAndRevenueHub | `0x3fD63728288546AC41dAe3bf25ca383061c3A929` | Central treasury management |

### Function Classification

| Function | Selector | Type | Required Role | Notes |
|----------|----------|------|---------------|-------|
| `depositRevenue()` | `0x8340f549` | UNRESTRICTED | - | Any can deposit |
| `routeToVault()` | `0x5c2c4c5a` | UNRESTRICTED | OPERATOR | Routing ops |
| `setAllocation()` | `0x5e5f2e26` | **TIMELOCKED** | DEFAULT_ADMIN | 24h delay |
| `updateAllocation()` | `0x3f4ba83a` | **TIMELOCKED** | DEFAULT_ADMIN | 24h delay |
| `setVaultAddresses()` | `0x7cb2b79c` | **TIMELOCKED** | DEFAULT_ADMIN | 24h delay |
| `emergencySweep()` | `0x7f4ab1dd` | **EMERGENCY** | GUARDIAN | Immediate |
| `pause()` | `0x8456cb59` | **EMERGENCY** | GUARDIAN | Immediate |
| `unpause()` | `0x3f4ba83a` | **EMERGENCY** | DEFAULT_ADMIN | Immediate |

---

## Module 2: Budget Router (Draw Schedules)

### Contracts
| Contract | Address | Description |
|----------|---------|-------------|
| AxiomTreasuryAndRevenueHub | `0x3fD63728288546AC41dAe3bf25ca383061c3A929` | Draw schedule config |

### Function Classification

| Function | Selector | Type | Required Role | Notes |
|----------|----------|------|---------------|-------|
| `setDrawSchedule()` | `0x4b0bddd2` | **TIMELOCKED** | DEFAULT_ADMIN | 24h delay |
| `executeWeeklyDraw()` | `0x7e5cd5c1` | UNRESTRICTED | OPERATOR | Scheduled ops |
| `setEnvelopes()` | `0x5e5f2e26` | **TIMELOCKED** | DEFAULT_ADMIN | 24h delay |

---

## Module 3: Reserve Buckets

### Contracts
| Contract | Address | Description |
|----------|---------|-------------|
| BurnVault | Integrated in AxiomV2 | Token burning |
| StakingVault | veAXM integration | Staking rewards |
| LiquidityVault | DEX integration | LP management |

### Function Classification

| Function | Selector | Type | Required Role | Notes |
|----------|----------|------|---------------|-------|
| `setBucketAllocation()` | - | **TIMELOCKED** | DEFAULT_ADMIN | 24h delay |
| `setMinReserve()` | - | **TIMELOCKED** | DEFAULT_ADMIN | 24h delay |
| `emergencyWithdraw()` | - | **EMERGENCY** | GUARDIAN | Immediate |

---

## Module 4: Governance Parameter Registry

### Contracts
| Contract | Address | Description |
|----------|---------|-------------|
| GovernanceHub | `0x52Dc85fd653a75323b5307f4D2629ab9A070530E` | Central governance |
| AxiomGovernanceConfig | *Pending* | Function registry |

### Function Classification

| Function | Selector | Type | Required Role | Notes |
|----------|----------|------|---------------|-------|
| `proposeAction()` | `0x8b8b9a1b` | UNRESTRICTED | RISK_COMMITTEE | Queue action |
| `executeAction()` | `0x134e7ee8` | UNRESTRICTED | - | After delay |
| `cancelAction()` | `0x7b0472f0` | UNRESTRICTED | GUARDIAN/Proposer | Cancel queued |
| `setMinimumDelay()` | `0x7c10fb96` | **TIMELOCKED** | DEFAULT_ADMIN | 24h+ delay |
| `updateDelay()` | `0x64d62353` | **TIMELOCKED** | DEFAULT_ADMIN | Lock-aware |
| `lockForever()` | `0x9c52a7f1` | **TIMELOCKED** | DEFAULT_ADMIN | One-way lock |

---

## Module 5: Admin Role Separation

### Role Hierarchy

```
DEFAULT_ADMIN_ROLE (0x00)
├── RISK_COMMITTEE_ROLE     → Propose risk parameter changes
├── SETTLEMENT_AUTHORITY    → Execute settlements
├── GUARDIAN_ROLE           → Emergency pause (immediate)
├── OPERATOR_ROLE           → Day-to-day operations
├── REGISTRAR_ROLE          → Asset registration
├── MINTER_ROLE             → Token minting (if enabled)
└── CIRCUIT_BREAKER_ROLE    → Automated emergency triggers
```

### Role Management Functions

| Function | Selector | Type | Required Role | Notes |
|----------|----------|------|---------------|-------|
| `grantRole()` | `0x2f2ff15d` | **TIMELOCKED** | DEFAULT_ADMIN | 24h delay |
| `revokeRole()` | `0xd547741f` | **TIMELOCKED** | DEFAULT_ADMIN | 24h delay |
| `renounceRole()` | `0x36568abe` | UNRESTRICTED | Self | Immediate |

---

## Module 6: Emergency Controls

### Emergency Functions (IMMEDIATE - No Timelock)

| Contract | Function | Selector | Required Role |
|----------|----------|----------|---------------|
| All Pausable | `pause()` | `0x8456cb59` | GUARDIAN |
| All Pausable | `unpause()` | `0x3f4ba83a` | DEFAULT_ADMIN |
| GovernanceHub | `pauseLending()` | `0x4e7a4d6e` | GUARDIAN |
| GovernanceHub | `unpauseLending()` | `0x7e5cd5c1` | SETTLEMENT_AUTHORITY |
| TimelockController | `emergencyPause()` | - | GUARDIAN |
| TimelockController | `triggerCircuitBreaker()` | - | CIRCUIT_BREAKER |
| All | `emergencySweep()` | `0x7f4ab1dd` | GUARDIAN |

---

## Module 7: Liquidity Deployment

### Contracts
| Contract | Address | Description |
|----------|---------|-------------|
| AxiomExchangeHubV2 | DEX Deployed | DEX core |
| LPStaking | DEX Deployed | LP incentives |

### Function Classification

| Function | Selector | Type | Required Role | Notes |
|----------|----------|------|---------------|-------|
| `addLiquidity()` | - | UNRESTRICTED | - | Public |
| `removeLiquidity()` | - | UNRESTRICTED | LP Owner | Public |
| `setPoolParams()` | - | **TIMELOCKED** | DEFAULT_ADMIN | 24h delay |
| `setFees()` | - | **TIMELOCKED** | DEFAULT_ADMIN | 24h delay |

---

## Module 8: Token Economics (AXM)

### Contracts
| Contract | Address | Description |
|----------|---------|-------------|
| AxiomV2 | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` | AXM token |
| veAXM | `0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046` | Vote escrow |

### Function Classification

| Function | Selector | Type | Required Role | Notes |
|----------|----------|------|---------------|-------|
| `transfer()` | `0xa9059cbb` | UNRESTRICTED | Token Owner | Standard |
| `setFeeRates()` | `0x4b0bddd2` | **TIMELOCKED** | DEFAULT_ADMIN | 24h delay |
| `setVaultAddresses()` | `0x7cb2b79c` | **TIMELOCKED** | DEFAULT_ADMIN | 24h delay |
| `pause()` | `0x8456cb59` | **EMERGENCY** | GUARDIAN | Immediate |

---

## Module 9: Drawdown Protection

### Contracts
| Contract | Address | Description |
|----------|---------|-------------|
| RiskConfig | `0xD9a53c691B688351283Fecc33D8D9AF964A9a078` | Risk parameters |
| DSCRRiskConfig | `0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26` | DSCR risk params |

### Function Classification

| Function | Selector | Type | Required Role | Notes |
|----------|----------|------|---------------|-------|
| `setMaxLTV()` | `0x4b8a3529` | **TIMELOCKED** | RISK_COMMITTEE | 24h delay |
| `setLiquidationBonus()` | `0x4e0cd799` | **TIMELOCKED** | RISK_COMMITTEE | 24h delay |
| `setExposureLimits()` | - | **TIMELOCKED** | RISK_COMMITTEE | 24h delay |
| `triggerCircuitBreaker()` | - | **EMERGENCY** | CIRCUIT_BREAKER | Immediate |

---

## Module 10: Asset Registry

### Contracts
| Contract | Address | Description |
|----------|---------|-------------|
| AxiomScoreSBT | `0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008` | Credit scores |
| CitizenCredentialRegistry | *Deployed* | Credentials |

### Function Classification

| Function | Selector | Type | Required Role | Notes |
|----------|----------|------|---------------|-------|
| `registerAsset()` | - | **TIMELOCKED** | REGISTRAR | 24h delay |
| `updateAsset()` | - | **TIMELOCKED** | REGISTRAR | 24h delay |
| `updateScore()` | - | UNRESTRICTED | OPERATOR | Day-to-day |
| `mint()` | - | UNRESTRICTED | MINTER | Controlled |

---

## Module 11: Revenue Attribution

### Function Classification

| Function | Selector | Type | Required Role | Notes |
|----------|----------|------|---------------|-------|
| `setAttribution()` | - | **TIMELOCKED** | DEFAULT_ADMIN | 24h delay |
| `redirectRevenue()` | - | **TIMELOCKED** | DEFAULT_ADMIN | 24h delay |
| `claimRevenue()` | - | UNRESTRICTED | Recipient | Standard |

---

## Module 12: Lending (Fix & Flip, DSCR)

### Contracts
| Contract | Address | Description |
|----------|---------|-------------|
| FixFlipManager | `0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958` | Bridge loans |
| DSCRLoanManager | `0x105117F1AD1B65a5d0C7F0E9A870683A06738E16` | DSCR loans |

### Function Classification

| Function | Selector | Type | Required Role | Notes |
|----------|----------|------|---------------|-------|
| `requestLoan()` | - | UNRESTRICTED | - | Public |
| `approveLoan()` | - | UNRESTRICTED | OPERATOR | Underwriting |
| `setInterestRate()` | - | **TIMELOCKED** | RISK_COMMITTEE | 24h delay |
| `setMaxLoanAmount()` | - | **TIMELOCKED** | RISK_COMMITTEE | 24h delay |
| `pauseLending()` | - | **EMERGENCY** | GUARDIAN | Immediate |

---

## Lock Forever Procedure

### Pre-Lock Checklist

1. [ ] All timelocked functions routed through TimelockController
2. [ ] Emergency functions verified to work immediately
3. [ ] All roles properly assigned
4. [ ] Test timelock execution on testnet
5. [ ] Verify 24h minimum delay is set

### Lock Execution

```solidity
// Step 1: Verify configuration
AxiomTimelockController.getMinDelay() >= 24 hours

// Step 2: Lock timelock (one-way)
AxiomTimelockController.lockForever()

// Step 3: Verify lock
AxiomTimelockController.isLocked() == true

// Step 4: Optionally lock governance config
AxiomGovernanceConfig.lockRegistry()
```

### Post-Lock State

After `lockForever()`:
- Minimum delay can only INCREASE (never decrease)
- Cannot reduce below 24 hours
- Lock is irreversible (`configurationLocked = true`)
- Emergency functions still work immediately
- Circuit breaker still works immediately

---

## Quick Reference

### Timelocked (24h delay)
- Role grants/revokes
- Fee rate changes
- Allocation changes
- Risk parameter updates
- Oracle configuration
- Vault address changes

### Emergency (Immediate)
- `pause()` / `unpause()`
- `emergencySweep()`
- `pauseLending()` / `unpauseLending()`
- `triggerCircuitBreaker()`
- `emergencyPause()`

### Unrestricted
- Token transfers
- User deposits/withdrawals
- LP add/remove
- Loan requests
- Score queries (view)
