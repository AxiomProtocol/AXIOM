# Axiom Protocol - Minimum Invariant Set

**Version:** 1.0.0 (Institutional-Grade)  
**Last Updated:** 2026-01-26  
**Status:** All 15 Core Invariants Passing  
**Source:** `/reports/audit-report.json`

---

## Purpose

This document defines the **minimum set of invariants** required for institutional-grade assurance. Each invariant is:
- Testable on-chain or via unit tests
- Mapped to specific contract references
- Critical for one of five security domains

---

## Coverage Domains

| Domain | Invariants | Status |
|--------|------------|--------|
| 1. Authorization Safety | 4 | PASS |
| 2. Treasury Solvency | 3 | PASS |
| 3. Emergency Response | 3 | PASS |
| 4. Parameter Integrity | 3 | PASS |
| 5. Exposure Ceilings | 2 | PASS |
| **TOTAL** | **15** | **ALL PASS** |

---

## Domain 1: Authorization Safety

### INV-1.1: Role-Based Access Enforcement

**Statement:** All protected functions MUST revert when called by addresses without the required role.

**Rationale:** Prevents unauthorized access to admin, operator, and guardian functions.

**Module:** Module 5: Admin Role Separation

**On-Chain Reference:**
- Contract: All AccessControl contracts
- Check: `hasRole(role, msg.sender)` before execution
- Revert: `AccessControlUnauthorizedAccount(account, role)`

**Test File:** `test/invariants/AuthorizationSafety.test.ts`

**Failure Message:** `"INV-1.1 VIOLATED: Function executed without required role"`

---

### INV-1.2: Timelock Delay Enforcement

**Statement:** All timelocked operations MUST wait at least `minDelay` seconds before execution.

**Rationale:** Provides reaction time for stakeholders to review and potentially cancel malicious proposals.

**Module:** Module 4: Governance Parameter Registry

**On-Chain Reference:**
- Contract: `AxiomTimelockController` (`0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899`)
- Function: `execute()` checks `block.timestamp >= getTimestamp(id)`
- Current: `minDelay = 86400` (24 hours)

**Test File:** `test/invariants/TimelockEnforcement.test.ts`

**Failure Message:** `"INV-1.2 VIOLATED: Operation executed before delay elapsed"`

---

### INV-1.3: Direct Admin Call Rejection

**Statement:** Functions registered as TIMELOCKED MUST revert when called directly (not via timelock).

**Rationale:** Ensures all parameter changes go through the governance process.

**Module:** Module 4.2: Timelock Updates

**On-Chain Reference:**
- Contract: `AxiomGovernanceConfig` (`0xa645a0Fcc15dD22Ee44d774F19731Fb0fE70b2CC`)
- Check: `msg.sender == timelockController`
- Revert: `CallerNotTimelock()`

**Test File:** `test/invariants/DirectCallRejection.test.ts`

**Failure Message:** `"INV-1.3 VIOLATED: Admin function executed without timelock"`

---

### INV-1.4: Lock Irreversibility

**Statement:** Once `lockForever()` is called, `configurationLocked` MUST remain `true` permanently.

**Rationale:** Provides irrevocable assurance that governance delays cannot be reduced.

**Module:** Module 4.2: Timelock Updates

**On-Chain Reference:**
- Contract: `AxiomTimelockController`
- State: `configurationLocked` (bool)
- Event: `ConfigurationLocked(locker, timestamp, minimumDelay)`

**Test File:** `test/invariants/LockIrreversibility.test.ts`

**Failure Message:** `"INV-1.4 VIOLATED: Configuration lock was reversed"`

---

## Domain 2: Treasury Solvency

### INV-2.1: Conservation of Funds

**Statement:** Total funds OUT from treasury MUST NOT exceed total funds IN, accounting for authorized burns.

**Rationale:** Prevents unauthorized fund extraction or accounting errors.

**Module:** Module 1: Treasury Core

**On-Chain Reference:**
- Contract: `AxiomTreasuryAndRevenueHub` (`0x3fD63728288546AC41dAe3bf25ca383061c3A929`)
- Events: `RevenueDeposited` (in), `FundsRouted` (out), `EmergencySweep` (out)
- Invariant: `Σ(in) >= Σ(out)`

**Test File:** `test/invariants/FundConservation.test.ts`

**Failure Message:** `"INV-2.1 VIOLATED: Funds out exceed funds in"`

---

### INV-2.2: Allocation Caps (Sum = 100%)

**Statement:** Sum of all bucket allocations MUST equal exactly 10000 basis points (100%).

**Rationale:** Prevents over-allocation or under-allocation of incoming revenue.

**Module:** Module 2: Budget Router

**On-Chain Reference:**
- Contract: `AxiomTreasuryAndRevenueHub`
- State: `allocations[bucket]` (uint256)
- Check: `operating + maintenance + growth + longTerm == 10000`

**Test File:** `test/invariants/AllocationCaps.test.ts`

**Failure Message:** `"INV-2.2 VIOLATED: Allocation sum != 100%"`

---

### INV-2.3: No Negative Accounting

**Statement:** All balance and accounting fields MUST be non-negative (>= 0).

**Rationale:** Prevents underflow attacks or accounting bugs.

**Module:** Module 1: Treasury Core

**On-Chain Reference:**
- All contracts use `uint256` (inherently non-negative)
- Solidity 0.8.x includes overflow/underflow protection

**Test File:** `test/invariants/NonNegativeAccounting.test.ts`

**Failure Message:** `"INV-2.3 VIOLATED: Negative balance detected"`

---

## Domain 3: Emergency Response

### INV-3.1: Immediate Emergency Pause

**Statement:** `pause()` by GUARDIAN MUST take effect immediately (no delay).

**Rationale:** Emergency response cannot wait for timelock.

**Module:** Module 6: Emergency Controls

**On-Chain Reference:**
- Contract: All Pausable contracts
- Function: `pause()` requires `GUARDIAN_ROLE` or `PAUSER_ROLE`
- Effect: Immediate `whenNotPaused` modifier blocks

**Test File:** `test/invariants/ImmediatePause.test.ts`

**Failure Message:** `"INV-3.1 VIOLATED: Pause did not take effect immediately"`

---

### INV-3.2: Immediate Circuit Breaker

**Statement:** `triggerCircuitBreaker()` by CIRCUIT_BREAKER MUST take effect immediately.

**Rationale:** Automated safety mechanisms cannot wait for human approval.

**Module:** Module 6: Emergency Controls

**On-Chain Reference:**
- Contract: `AxiomTimelockController`
- Function: `triggerCircuitBreaker()`
- State: `circuitBreakerActive = true`
- Event: `CircuitBreakerTriggered(triggerer, timestamp)`

**Test File:** `test/invariants/ImmediateCircuitBreaker.test.ts`

**Failure Message:** `"INV-3.2 VIOLATED: Circuit breaker did not activate immediately"`

---

### INV-3.3: Pause Blocks State Changes

**Statement:** When paused, all state-changing functions MUST revert.

**Rationale:** Pause must be effective to be useful.

**Module:** Module 6: Emergency Controls

**On-Chain Reference:**
- Modifier: `whenNotPaused`
- Revert: `EnforcedPause()`

**Test File:** `test/invariants/PauseEffectiveness.test.ts`

**Failure Message:** `"INV-3.3 VIOLATED: State change succeeded while paused"`

---

## Domain 4: Parameter Integrity

### INV-4.1: Delay Cannot Decrease (Post-Lock)

**Statement:** After `lockForever()`, `minDelay` can only INCREASE, never decrease.

**Rationale:** Prevents governance from weakening its own safeguards.

**Module:** Module 4.2: Timelock Updates

**On-Chain Reference:**
- Contract: `AxiomTimelockController`
- Function: `updateDelay()` checks `newDelay >= lockedMinimumDelay`
- Revert: `DelayCannotBeReduced(current, requested)`

**Test File:** `test/invariants/DelayCannotDecrease.test.ts`

**Failure Message:** `"INV-4.1 VIOLATED: Delay decreased after lock"`

---

### INV-4.2: 24-Hour Minimum Floor

**Statement:** `minDelay` MUST always be >= 86400 seconds (24 hours).

**Rationale:** Institutional-grade minimum for stakeholder reaction time.

**Module:** Module 4.2: Timelock Updates

**On-Chain Reference:**
- Contract: `AxiomTimelockController`
- Constant: `MIN_DELAY = 86400`
- Revert: `DelayBelowLockedMinimum(requested, minimum)`

**Test File:** `test/invariants/MinimumDelayFloor.test.ts`

**Failure Message:** `"INV-4.2 VIOLATED: Delay below 24-hour minimum"`

---

### INV-4.3: Parameter Changes Emit Events

**Statement:** All governance parameter changes MUST emit corresponding events.

**Rationale:** Enables off-chain monitoring and audit trail.

**Module:** Module 4: Governance Parameter Registry

**On-Chain Reference:**
- All parameter setters emit events
- Examples: `FeeRatesUpdated`, `AllocationUpdated`, `MaxLTVUpdated`

**Test File:** `test/invariants/ParameterEvents.test.ts`

**Failure Message:** `"INV-4.3 VIOLATED: Parameter change without event"`

---

## Domain 5: Exposure Ceilings

### INV-5.1: Max Exposure Limit

**Statement:** Total lending exposure MUST NOT exceed `maxExposure` limit.

**Rationale:** Prevents over-concentration of risk in lending activities.

**Module:** Module 9: Drawdown Protection

**On-Chain Reference:**
- Contract: `RiskConfig` (`0xD9a53c691B688351283Fecc33D8D9AF964A9a078`)
- State: `maxExposure` (uint256)
- Check: `totalOutstanding <= maxExposure`

**Test File:** `test/invariants/MaxExposure.test.ts`

**Failure Message:** `"INV-5.1 VIOLATED: Total exposure exceeds maximum"`

---

### INV-5.2: Max LTV Enforcement

**Statement:** No loan MUST be originated with LTV exceeding `maxLTV`.

**Rationale:** Prevents under-collateralized lending.

**Module:** Module 9: Drawdown Protection

**On-Chain Reference:**
- Contract: `RiskConfig`
- State: `maxLTV` (uint256, basis points)
- Check: `(loanAmount * 10000) / collateralValue <= maxLTV`

**Test File:** `test/invariants/MaxLTV.test.ts`

**Failure Message:** `"INV-5.2 VIOLATED: Loan LTV exceeds maximum"`

---

## Test Summary

```
Invariant Test Suite
====================
Domain 1: Authorization Safety
  ✓ INV-1.1: Role-Based Access Enforcement
  ✓ INV-1.2: Timelock Delay Enforcement  
  ✓ INV-1.3: Direct Admin Call Rejection
  ✓ INV-1.4: Lock Irreversibility

Domain 2: Treasury Solvency
  ✓ INV-2.1: Conservation of Funds
  ✓ INV-2.2: Allocation Caps
  ✓ INV-2.3: No Negative Accounting

Domain 3: Emergency Response
  ✓ INV-3.1: Immediate Emergency Pause
  ✓ INV-3.2: Immediate Circuit Breaker
  ✓ INV-3.3: Pause Blocks State Changes

Domain 4: Parameter Integrity
  ✓ INV-4.1: Delay Cannot Decrease
  ✓ INV-4.2: 24-Hour Minimum Floor
  ✓ INV-4.3: Parameter Changes Emit Events

Domain 5: Exposure Ceilings
  ✓ INV-5.1: Max Exposure Limit
  ✓ INV-5.2: Max LTV Enforcement

15 passing (0 failing)
```

---

## Continuous Monitoring

These invariants should be monitored continuously via:

1. **On-Chain:** Event listeners for violation indicators
2. **Off-Chain:** Scheduled RPC queries via Observer Dashboard
3. **Alerts:** Automated notifications on any FAIL status

Dashboard location: `/observer/risk` (Red Flags Panel)
