# AXIOM Protocol Upgrade Proxy Plan

**Version:** 1.0
**Date:** February 2, 2026
**Phase:** 0 - Stabilization

---

## Executive Summary

This document identifies which contracts require upgrade proxy patterns for safe evolution toward Universe L3. The analysis categorizes contracts by state criticality and recommends specific proxy patterns.

---

## Upgrade Pattern Options

### 1. Transparent Proxy (OpenZeppelin)

**Best for:** Token contracts, core state holders
**Pros:** Battle-tested, admin-only upgrades
**Cons:** Gas overhead, complexity

### 2. UUPS Proxy (Universal Upgradeable Proxy Standard)

**Best for:** Governance, registries
**Pros:** Smaller gas footprint, upgrade logic in implementation
**Cons:** Must include upgrade function in every implementation

### 3. Beacon Proxy

**Best for:** Multiple instances of same contract (loan managers)
**Pros:** Single upgrade updates all instances
**Cons:** Additional complexity

### 4. Diamond Pattern (EIP-2535)

**Best for:** Large contracts near size limit
**Pros:** Unlimited contract size via facets
**Cons:** Complex, harder to audit

### 5. No Proxy (Redeploy + Migrate)

**Best for:** Stateless utilities, configuration-only contracts
**Pros:** Simple, no overhead
**Cons:** Requires state migration

---

## Contract Analysis

### Tier 1: Critical State (REQUIRES Proxy)

These contracts hold irreplaceable user funds or critical protocol state.

| Contract | Address | State Type | Recommended Pattern |
|----------|---------|------------|---------------------|
| AxiomV2 (AXM) | `0x864F...39D` | Token balances | Transparent Proxy |
| AXUSD Token | `0x7358...b89C` | Token balances | Transparent Proxy |
| AxiomTreasuryAndRevenueHub | `0x3fD6...A929` | Treasury balances | Transparent Proxy |
| AxiomStakingAndEmissionsHub | `0x8b99...B885` | Staking positions | UUPS Proxy |
| GovernanceHub | `0x52Dc...530E` | Pending actions, roles | UUPS Proxy |

**Migration Strategy:** Deploy proxy in front of existing contract using storage-compatible upgrade.

### Tier 2: Important State (Proxy RECOMMENDED)

These contracts hold significant state but can be migrated if necessary.

| Contract | Address | State Type | Recommended Pattern |
|----------|---------|------------|---------------------|
| ProductRegistry | `0x31AD...0e5d` | Product configs | UUPS Proxy |
| AxiomIdentityComplianceHub | `0xf88b...B3ED` | KYC records | UUPS Proxy |
| CitizenCredentialRegistry | `0x8EF8...C344` | Credentials | UUPS Proxy |
| AxiomLandAndAssetRegistry | `0xaB15...6591` | Land records | UUPS Proxy |
| LeaseAndRentEngine | `0x26a2...5297` | Lease records | Beacon Proxy |
| CapitalPoolsAndFunds | `0xFcCd...a701` | Pool balances | Transparent Proxy |

### Tier 3: Operational State (Migrate or Proxy)

These contracts have state that can be exported and reimported.

| Contract | Address | State Type | Recommended Pattern |
|----------|---------|------------|---------------------|
| FixFlipManager | `0xD6eb...8958` | Loan records | Beacon Proxy |
| DSCRLoanManager | `0x1051...8E16` | Loan records | Beacon Proxy |
| RiskConfig | `0xD9a5...9078` | Parameters | No Proxy (redeploy) |
| DSCRRiskConfig | `0xd9d5...2B26` | Parameters | No Proxy (redeploy) |
| ExchangeHubV2 | `0x31eF...Dcd28` | LP positions | UUPS Proxy |
| LPStaking | `0x0666...00a5` | Staking records | UUPS Proxy |

### Tier 4: Stateless / Low State (No Proxy Needed)

These contracts can be replaced without migration.

| Contract | Address | Notes |
|----------|---------|-------|
| OracleAdapter | `0xe007...35c7` | Configuration only |
| DEXRouter | `0x05c6...0d8` | Routing logic |
| DEXAnalytics | `0x93cD...3E9` | Read-only |
| DEXGovernor | `0x9A86...f96d` | Proposals can expire |
| TradingRewards | `0xb75b...5984` | Can snapshot and migrate |
| FeeDistributor | `0xD981...5ae8` | Can reconfigure |

---

## Recommended Implementation Order

### Phase 0.3a: Prepare Proxy Infrastructure

1. Deploy ProxyAdmin contract
2. Deploy UUPS implementation base
3. Deploy Beacon for loan managers

### Phase 0.3b: Critical Contracts First

1. GovernanceHub → UUPS Proxy
2. ProductRegistry → UUPS Proxy
3. AXM Token → Transparent Proxy (if upgrade needed)

### Phase 0.3c: Operational Contracts

1. FixFlipManager → Beacon Proxy
2. DSCRLoanManager → Beacon Proxy
3. LPStaking → UUPS Proxy

---

## Proxy Implementation Template

### UUPS Proxy Base

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

abstract contract AxiomUpgradeable is UUPSUpgradeable, AccessControlUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    function __AxiomUpgradeable_init() internal onlyInitializing {
        __UUPSUpgradeable_init();
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
```

### Beacon Proxy for Loan Managers

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

contract LoanManagerBeacon is UpgradeableBeacon {
    constructor(address implementation_, address admin_) UpgradeableBeacon(implementation_, admin_) {}
}
```

---

## Storage Layout Considerations

### Critical Rules

1. **Never remove storage variables** - only append
2. **Never reorder storage variables** - keep same slots
3. **Use storage gaps** - reserve space for future variables

### Storage Gap Example

```solidity
contract GovernanceHubV2 is GovernanceHubV1 {
    // New variables go here
    uint256 public newParameter;
    
    // Gap reduced by 1 (was 50, now 49)
    uint256[49] private __gap;
}
```

---

## Migration Checklist

### Pre-Upgrade

- [ ] Audit new implementation
- [ ] Test on fork
- [ ] Verify storage layout compatibility
- [ ] Prepare rollback plan
- [ ] Notify community (timelock provides 24hr window)

### During Upgrade

- [ ] Deploy new implementation
- [ ] Propose upgrade via GovernanceHub
- [ ] Wait for timelock (24 hours)
- [ ] Execute upgrade
- [ ] Verify state integrity

### Post-Upgrade

- [ ] Run verification scripts
- [ ] Check all integrations
- [ ] Monitor for 24 hours
- [ ] Update documentation

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Storage collision | Critical | Use storage gaps, test on fork |
| Upgrade failure | High | Prepare rollback, test extensively |
| Admin key compromise | Critical | Multi-sig, timelock |
| Incompatible upgrade | High | Audit, formal verification |

---

## Timeline

| Task | Duration | Dependencies |
|------|----------|--------------|
| Deploy proxy infrastructure | 1 week | None |
| Critical contract proxies | 2 weeks | Infrastructure |
| Operational contract proxies | 2 weeks | Critical done |
| Testing and verification | 1 week | All proxies |
| **Total** | **6 weeks** | |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | AXIOM Team | Initial plan |
