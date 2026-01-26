# Axiom Protocol - Module Definitions

**Version:** 2.0.0 (Institutional-Grade)  
**Last Updated:** 2026-01-26  
**Network:** Arbitrum One (42161)  
**Classification:** Audit-Ready

---

## Document Purpose

This document provides unambiguous, audit-friendly definitions for each Axiom Protocol module. Each module specifies:
- **Purpose**: What the module does
- **Inputs/Outputs**: Data flow
- **Control Surfaces**: Who can do what
- **Failure Modes**: What can go wrong
- **On-Chain Observability**: Events and state for monitoring

All claims cite specific contracts with Arbiscan links for verification. Cross-reference with `/docs/module-to-contract-map.md` for function selectors and full mapping.

---

## Module 1: Treasury Core

### Purpose
Central treasury management for protocol revenue collection, storage, and controlled distribution across operational buckets.

### Contracts
| Contract | Address | Reference |
|----------|---------|-----------|
| AxiomTreasuryAndRevenueHub | `0x3fD63728288546AC41dAe3bf25ca383061c3A929` | module-to-contract-map.md#Module-1 |

### Inputs
| Input | Source | Validation |
|-------|--------|------------|
| Revenue deposits | External protocols, DEX fees, lending interest | None (permissionless deposit) |
| Routing instructions | OPERATOR role | Role check |
| Allocation changes | DEFAULT_ADMIN via Timelock | 24h delay |

### Outputs
| Output | Destination | Authorization |
|--------|-------------|---------------|
| Routed funds | Bucket vaults | OPERATOR |
| Emergency sweep | Admin wallet | GUARDIAN |

### Control Surfaces
| Actor | Capability | Delay | Contract Reference |
|-------|------------|-------|-------------------|
| Anyone | `depositRevenue()` | None | [Arbiscan](https://arbiscan.io/address/0x3fD63728288546AC41dAe3bf25ca383061c3A929#readContract) |
| OPERATOR | `routeToVault()` | None | [Arbiscan](https://arbiscan.io/address/0x3fD63728288546AC41dAe3bf25ca383061c3A929#writeContract) |
| DEFAULT_ADMIN | `setAllocation()` | 24h | Via Timelock → [GovernanceHub](https://arbiscan.io/address/0x52Dc85fd653a75323b5307f4D2629ab9A070530E) |
| GUARDIAN | `emergencySweep()` | None | [Arbiscan](https://arbiscan.io/address/0x3fD63728288546AC41dAe3bf25ca383061c3A929#writeContract) |
| GUARDIAN | `pause()` | None | [Arbiscan](https://arbiscan.io/address/0x3fD63728288546AC41dAe3bf25ca383061c3A929#writeContract) |

### Failure Modes
| Failure | Impact | Detection | Recovery |
|---------|--------|-----------|----------|
| Allocation sum > 100% | Routing fails | Contract revert | Fix allocation via timelock |
| Vault address zero | Routing fails | Contract revert | Update vault address |
| Pause activated | All ops blocked | `Paused` event | `unpause()` by admin |

### On-Chain Observability
| Event | Parameters | Use Case |
|-------|------------|----------|
| `RevenueDeposited` | source, amount, timestamp | Inflow tracking |
| `FundsRouted` | bucket, amount, timestamp | Outflow tracking |
| `AllocationUpdated` | bucket, oldPercent, newPercent | Parameter audit |
| `EmergencySweep` | token, amount, recipient | Security alert |
| `Paused` / `Unpaused` | account | Status monitoring |

---

## Module 2: Budget Router (Draw Schedules)

### Purpose
Configurable draw schedules for systematic fund distribution from treasury buckets to operational recipients.

### Contracts
| Contract | Address | Reference |
|----------|---------|-----------|
| AxiomTreasuryAndRevenueHub | `0x3fD63728288546AC41dAe3bf25ca383061c3A929` | module-to-contract-map.md#Module-2 |

### Control Surfaces
| Actor | Capability | Delay | Contract Reference |
|-------|------------|-------|-------------------|
| DEFAULT_ADMIN | `setDrawSchedule()` | 24h | TreasuryHub:L180-195 |
| DEFAULT_ADMIN | `setEnvelopes()` | 24h | TreasuryHub:L200-220 |
| OPERATOR | `executeWeeklyDraw()` | None | TreasuryHub:L225-250 |

### Failure Modes
| Failure | Impact | Detection | Recovery |
|---------|--------|-----------|----------|
| Insufficient bucket balance | Draw fails | Contract revert | Wait for inflows |
| Invalid recipient | Draw fails | Contract revert | Update recipient |

### On-Chain Observability
| Event | Parameters | Use Case |
|-------|------------|----------|
| `DrawScheduled` | scheduleId, amount, nextExecutionTime | Schedule tracking |
| `DrawExecuted` | scheduleId, recipient, amount | Execution audit |

---

## Module 3: Reserve Buckets

### Purpose
Segregated reserve pools for different operational purposes: Operating, Maintenance, Growth, Long-Term.

### Bucket Allocation (Default)
| Bucket | Allocation | Min Reserve | Priority |
|--------|------------|-------------|----------|
| Operating | 40% | $100,000 | 1 |
| Maintenance | 20% | $50,000 | 2 |
| Growth | 25% | $0 | 3 |
| Long-Term | 15% | $0 | 4 |

### Control Surfaces
| Actor | Capability | Delay | Contract Reference |
|-------|------------|-------|-------------------|
| DEFAULT_ADMIN | `setBucketAllocation()` | 24h | TreasuryHub:L112-130 |
| DEFAULT_ADMIN | `setMinReserve()` | 24h | TreasuryHub:L135-145 |
| GUARDIAN | `emergencyWithdraw()` | None | TreasuryHub:L145-168 |

### On-Chain Observability
| Event | Parameters | Use Case |
|-------|------------|----------|
| `BucketDeposit` | bucket, amount | Inflow tracking |
| `BucketWithdraw` | bucket, amount, recipient | Outflow tracking |

---

## Module 4: Governance Parameter Registry

### Purpose
Central registry and timelock enforcement for all governance-controlled parameters across the protocol.

### Contracts
| Contract | Address | Reference |
|----------|---------|-----------|
| GovernanceHub | `0x52Dc85fd653a75323b5307f4D2629ab9A070530E` | module-to-contract-map.md#Module-4 |
| AxiomTimelockController | `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899` | module-to-contract-map.md#Timelock |
| AxiomGovernanceConfig | `0xa645a0Fcc15dD22Ee44d774F19731Fb0fE70b2CC` | module-to-contract-map.md#Timelock |

### Control Surfaces
| Actor | Capability | Delay | Contract Reference |
|-------|------------|-------|-------------------|
| RISK_COMMITTEE | `proposeAction()` | Queue only | GovernanceHub:L85-110 |
| Anyone | `executeAction()` | After 24h+ | GovernanceHub:L115-140 |
| GUARDIAN | `cancelAction()` | None | GovernanceHub:L145-160 |
| DEFAULT_ADMIN | `setMinimumDelay()` | 24h | TimelockController:L95-115 |
| DEFAULT_ADMIN | `lockForever()` | 24h | TimelockController:L120-145 |

### On-Chain Observability
| Event | Parameters | Use Case |
|-------|------------|----------|
| `CallScheduled` | id, target, value, data, delay | Proposal tracking |
| `CallExecuted` | id, target, value, data | Execution audit |
| `Cancelled` | id | Cancellation tracking |
| `MinDelayChange` | oldDuration, newDuration | Delay changes |
| `ConfigurationLocked` | locker, timestamp, minimumDelay | Lock Forever event |

---

## Module 5: Admin Role Separation

### Purpose
Role-based access control with hierarchical permissions and timelock enforcement for role changes.

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

### Role Assignments
| Role | Holder | Type |
|------|--------|------|
| DEFAULT_ADMIN_ROLE | `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` | Gnosis Safe |
| GUARDIAN_ROLE | `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` | Gnosis Safe |
| OPERATOR_ROLE | `0xDFf9e47eb007bF02e47477d577De9ffA99791528` | EOA |

### Control Surfaces
| Actor | Capability | Delay | Contract Reference |
|-------|------------|-------|-------------------|
| DEFAULT_ADMIN | `grantRole()` | 24h | AccessControl:L45-65 |
| DEFAULT_ADMIN | `revokeRole()` | 24h | AccessControl:L70-90 |
| Role Holder | `renounceRole()` | None | AccessControl:L95-105 |

### On-Chain Observability
| Event | Parameters | Use Case |
|-------|------------|----------|
| `RoleGranted` | role, account, sender | Role assignment audit |
| `RoleRevoked` | role, account, sender | Role removal audit |

---

## Module 6: Emergency Controls

### Purpose
Immediate-execution safety mechanisms for halting protocol operations during emergencies.

### Emergency Functions (NO TIMELOCK)
| Contract | Function | Required Role | Effect |
|----------|----------|---------------|--------|
| All Pausable | `pause()` | GUARDIAN | Halt all state-changing ops |
| All Pausable | `unpause()` | DEFAULT_ADMIN | Resume operations |
| TimelockController | `emergencyPause()` | GUARDIAN | System-wide pause |
| TimelockController | `triggerCircuitBreaker()` | CIRCUIT_BREAKER | Automated halt |
| GovernanceHub | `pauseLending()` | GUARDIAN | Halt lending only |
| TreasuryHub | `emergencySweep()` | GUARDIAN | Extract funds |

### On-Chain Observability
| Event | Parameters | Use Case |
|-------|------------|----------|
| `Paused` | account | Immediate alert |
| `Unpaused` | account | Recovery confirmation |
| `EmergencyPauseTriggered` | guardian, timestamp | Security audit |
| `CircuitBreakerTriggered` | triggerer, timestamp | Automated alert |

---

## Module 7: Liquidity Deployment

### Purpose
DEX liquidity management including pool creation, LP staking, and fee distribution.

### Contracts
| Contract | Address | Reference |
|----------|---------|-----------|
| AxiomExchangeHubV2 | DEX Deployed | module-to-contract-map.md#Module-7 |
| LPStaking | DEX Deployed | module-to-contract-map.md#Module-7 |

### Control Surfaces
| Actor | Capability | Delay |
|-------|------------|-------|
| Anyone | `addLiquidity()` | None |
| LP Owner | `removeLiquidity()` | None |
| DEFAULT_ADMIN | `setPoolParams()` | 24h |
| DEFAULT_ADMIN | `setFees()` | 24h |

---

## Module 8: Token Economics (AXM)

### Purpose
AXM token management including transfers, fee routing, and vote escrow staking.

### Contracts
| Contract | Address | Reference |
|----------|---------|-----------|
| AxiomV2 | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` | module-to-contract-map.md#Module-8 |
| veAXM | `0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046` | module-to-contract-map.md#Module-8 |

### Control Surfaces
| Actor | Capability | Delay |
|-------|------------|-------|
| Token Owner | `transfer()` | None |
| DEFAULT_ADMIN | `setFeeRates()` | 24h |
| DEFAULT_ADMIN | `setVaultAddresses()` | 24h |
| GUARDIAN | `pause()` | **IMMEDIATE** |

---

## Module 9: Drawdown Protection

### Purpose
Risk management parameters including LTV limits, exposure caps, and automated circuit breakers.

### Contracts
| Contract | Address | Reference |
|----------|---------|-----------|
| RiskConfig | `0xD9a53c691B688351283Fecc33D8D9AF964A9a078` | module-to-contract-map.md#Module-9 |
| DSCRRiskConfig | `0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26` | module-to-contract-map.md#Module-9 |

### Control Surfaces
| Actor | Capability | Delay |
|-------|------------|-------|
| RISK_COMMITTEE | `setMaxLTV()` | 24h |
| RISK_COMMITTEE | `setLiquidationBonus()` | 24h |
| RISK_COMMITTEE | `setExposureLimits()` | 24h |
| CIRCUIT_BREAKER | `triggerCircuitBreaker()` | **IMMEDIATE** |

### On-Chain Observability
| Event | Parameters | Use Case |
|-------|------------|----------|
| `MaxLTVUpdated` | oldValue, newValue | Risk param tracking |
| `ExposureLimitUpdated` | asset, oldLimit, newLimit | Exposure tracking |
| `CircuitBreakerTriggered` | reason, timestamp | Emergency alert |

---

## Module 10: Asset Registry

### Purpose
On-chain registration and tracking of real-world assets, credentials, and credit scores.

### Contracts
| Contract | Address | Reference |
|----------|---------|-----------|
| AxiomScoreSBT | `0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008` | module-to-contract-map.md#Module-10 |

### Control Surfaces
| Actor | Capability | Delay |
|-------|------------|-------|
| REGISTRAR | `registerAsset()` | 24h |
| OPERATOR | `updateScore()` | None |
| MINTER | `mint()` | None |

---

## Module 11: Revenue Attribution

### Purpose
Track and distribute revenue across protocol participants and treasury buckets.

### Control Surfaces
| Actor | Capability | Delay |
|-------|------------|-------|
| DEFAULT_ADMIN | `setAttribution()` | 24h |
| DEFAULT_ADMIN | `redirectRevenue()` | 24h |
| Recipient | `claimRevenue()` | None |

---

## Module 12: Lending (Fix & Flip, DSCR)

### Purpose
Real estate lending with fix-and-flip bridge loans and DSCR rental property financing.

### Contracts
| Contract | Address | Reference |
|----------|---------|-----------|
| FixFlipManager | `0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958` | module-to-contract-map.md#Module-12 |
| DSCRLoanManager | `0x105117F1AD1B65a5d0C7F0E9A870683A06738E16` | module-to-contract-map.md#Module-12 |

### Control Surfaces
| Actor | Capability | Delay |
|-------|------------|-------|
| Anyone | `requestLoan()` | None |
| OPERATOR | `approveLoan()` | None |
| RISK_COMMITTEE | `setInterestRate()` | 24h |
| RISK_COMMITTEE | `setMaxLoanAmount()` | 24h |
| GUARDIAN | `pauseLending()` | **IMMEDIATE** |

### On-Chain Observability
| Event | Parameters | Use Case |
|-------|------------|----------|
| `LoanOriginated` | loanId, borrower, amount, rate | Loan tracking |
| `LoanRepaid` | loanId, amount, interest | Revenue tracking |
| `LoanDefaulted` | loanId, outstandingAmount | Risk monitoring |

---

## Classification Legend

| Type | Description |
|------|-------------|
| **On-Chain** | Fully implemented in deployed smart contracts |
| **Ops-Only** | Operational procedures without on-chain enforcement |
| **UI-Only** | Frontend functionality with backend validation |

All modules in this document are **On-Chain** unless explicitly marked otherwise.

---

## Cross-References

- Contract addresses: `/docs/deployments.md`
- Function selectors: `/docs/module-to-contract-map.md`
- Permission matrix: `/reports/permissions-diff.md`
- Audit findings: `/reports/audit-report.json`
