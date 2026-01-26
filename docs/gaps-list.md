# Axiom Protocol - Gaps Analysis

This document identifies missing modules, incomplete implementations, and potential unsafe assumptions.

---

## Missing Modules

### 1. Formal Governance Timelock
**Status:** NOT IMPLEMENTED  
**Impact:** HIGH  
**Description:** No on-chain timelock contract for governance parameter changes. Changes can be executed immediately by admin.

**Recommendation:** Deploy OpenZeppelin TimelockController with 24-48 hour delay for critical parameter changes.

---

### 2. Price Oracle Aggregator
**Status:** PARTIAL  
**Impact:** MEDIUM  
**Description:** `AxiomOracleAdapter` exists for DEX but lacks:
- Multi-source price aggregation
- Chainlink fallback integration
- TWAP protection against manipulation

**Recommendation:** Implement Chainlink integration with fallback to Uniswap V3 TWAP.

---

### 3. Circuit Breaker System
**Status:** NOT IMPLEMENTED  
**Impact:** HIGH  
**Description:** No automated circuit breaker for extreme market conditions. Pause requires manual admin intervention.

**Recommendation:** Implement automated pause triggers based on:
- Price deviation thresholds
- Volume anomalies
- Liquidation cascade detection

---

## Incomplete Implementations

### 1. VaultEngine (AXUSD)
**File:** `contracts/stablecoin/core/VaultEngine.sol`  
**Status:** PARTIAL  
**Lines:** 1-450 (incomplete)

**Missing Features:**
- [ ] Multi-collateral CDP management
- [ ] Stability fee accumulator
- [ ] Debt ceiling enforcement
- [ ] Surplus/debt auctions

---

### 2. GovernanceHub
**File:** `contracts/governance/GovernanceHub.sol`  
**Status:** PARTIAL  
**Lines:** 1-280

**Missing Features:**
- [ ] Proposal queue
- [ ] Vote delegation
- [ ] Quorum tracking
- [ ] Execution delay

---

### 3. Land Acquisition System
**File:** `contracts/land-acquisition/`  
**Status:** PARTIAL

**Missing Features:**
- [ ] RegCF compliance verification
- [ ] Investor accreditation on-chain
- [ ] Escrow release automation
- [ ] Title verification integration

---

## Unsafe Assumptions

### 1. Single Admin Safe
**Risk:** CRITICAL  
**Current State:** All contracts use single admin Safe (`0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d`)

**Assumption:** Admin Safe is secure and properly configured with multisig.

**Recommendation:** 
- Implement role separation (Admin vs Operator vs Pauser)
- Use different Safes for different risk levels
- Document Safe signer requirements (3/5 minimum)

---

### 2. Oracle Price Freshness
**Risk:** HIGH  
**Current State:** Oracle adapters may not enforce staleness checks.

**Assumption:** Price feeds are always fresh and accurate.

**Recommendation:**
- Enforce maximum age for price data (e.g., 1 hour)
- Implement heartbeat checks
- Add fallback to secondary oracle

---

### 3. AXUSD Peg Stability
**Risk:** HIGH  
**Current State:** PSM (Peg Stability Module) exists but:
- No automated rebalancing
- No dynamic fee adjustment
- Limited backstop capacity

**Assumption:** Manual intervention will maintain peg.

**Recommendation:**
- Implement Maker-style automated stability mechanisms
- Add dynamic PSM fees based on peg deviation
- Increase backstop vault capacity

---

### 4. Liquidation Bot Dependency
**Risk:** MEDIUM  
**Current State:** Liquidations require external bots to trigger.

**Assumption:** Liquidator bots will always be available and funded.

**Recommendation:**
- Implement keeper network integration (Gelato/Chainlink Automation)
- Add liquidation incentive floor
- Monitor liquidator coverage

---

### 5. Cross-Contract Reentrancy
**Risk:** MEDIUM  
**Current State:** Individual contracts use ReentrancyGuard.

**Assumption:** Cross-contract calls are safe from reentrancy.

**Recommendation:**
- Audit cross-contract call patterns
- Implement global reentrancy lock for critical flows
- Use checks-effects-interactions pattern consistently

---

## Contract-Level Issues

### 1. No Upgrade Mechanism
**Affected Contracts:** All deployed contracts  
**Issue:** Contracts are not upgradeable. Bug fixes require migration.

**Recommendation:** Consider UUPS proxy pattern for future deployments.

---

### 2. Missing Event Indexing
**Affected Contracts:** Several  
**Issue:** Some events lack indexed parameters for efficient querying.

**Recommendation:** Audit all events and add indexed parameters for:
- Address fields
- Token IDs
- Pool/vault identifiers

---

### 3. Hardcoded Addresses
**Affected Contracts:** Several  
**Issue:** Some contracts have hardcoded addresses that limit portability.

**Recommendation:** Use registry pattern or constructor injection.

---

## Security Audit Status

| Contract Group | Internal Review | External Audit |
|---------------|-----------------|----------------|
| Core Infrastructure | ✅ Complete | ⏳ Scheduled Q1 2026 |
| DEX Contracts | ✅ Complete | ⏳ Pending |
| AXUSD System | ✅ Complete | ⏳ Pending |
| Phase 3 Contracts | ✅ Complete | ⏳ Pending |

---

## Priority Remediation

### P0 (Critical)
1. Deploy timelock for governance
2. Implement circuit breaker
3. Add oracle staleness checks

### P1 (High)
1. Complete VaultEngine implementation
2. Implement price aggregation
3. Add automated liquidation keepers

### P2 (Medium)
1. Complete GovernanceHub
2. Add event indexing
3. Document Safe configuration

### P3 (Low)
1. Consider upgrade patterns
2. Add cross-chain support
3. Implement advanced analytics
