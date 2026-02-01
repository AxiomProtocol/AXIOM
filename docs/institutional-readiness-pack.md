# Axiom Protocol - Institutional Readiness Pack

**Version:** 1.0.0  
**Generated:** 2026-01-26  
**Network:** Arbitrum One (42161)  
**Status:** MVP-Ready

---

## Executive Summary

This document consolidates all institutional-grade documentation for the Axiom Protocol governance and treasury system. It is designed for allocators, auditors, and institutional partners evaluating the protocol's operational maturity.

### Key Highlights

| Aspect | Status | Details |
|--------|--------|---------|
| Timelock Deployed | ✓ | 24h minimum delay, Lock Forever available |
| Invariant Tests | ✓ 37/37 | All passing, 15 core invariants |
| Observer Dashboard | ✓ MVP | 7 pages, live RPC data |
| Documentation | ✓ Complete | Module map, events, metrics |

---

## 1. Module Map Summary

**Source:** `/docs/modules.md`, `/docs/module-to-contract-map.md`

### Deployed Modules

| Module | Contracts | Status |
|--------|-----------|--------|
| Treasury Core | AxiomTreasuryAndRevenueHub | Production |
| Budget Router | AxiomTreasuryAndRevenueHub | Production |
| Reserve Buckets | Multiple vaults | Production |
| Governance Registry | GovernanceHub, TimelockController | Production |
| Admin Role Separation | AccessControl (all contracts) | Production |
| Emergency Controls | Pausable (all contracts) | Production |
| Liquidity Deployment | DEX contracts | Production |
| Token Economics | AxiomV2, veAXM | Production |
| Drawdown Protection | RiskConfig, DSCRRiskConfig | Production |
| Asset Registry | AxiomScoreSBT | Production |
| Revenue Attribution | TreasuryHub | Production |
| Lending | FixFlipManager, DSCRLoanManager | Production |

### Key Contract Addresses

| Contract | Address | Verified |
|----------|---------|----------|
| AxiomTimelockController | `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899` | ✓ Blockscout |
| AxiomGovernanceConfig | `0xa645a0Fcc15dD22Ee44d774F19731Fb0fE70b2CC` | ✓ Blockscout |
| GovernanceHub | `0x52Dc85fd653a75323b5307f4D2629ab9A070530E` | ✓ Arbiscan |
| TreasuryHub | `0x3fD63728288546AC41dAe3bf25ca383061c3A929` | ✓ Arbiscan |
| RiskConfig | `0xD9a53c691B688351283Fecc33D8D9AF964A9a078` | ✓ Arbiscan |
| FixFlipManager | `0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958` | ✓ Arbiscan |
| DSCRLoanManager | `0x105117F1AD1B65a5d0C7F0E9A870683A06738E16` | ✓ Arbiscan |

---

## 2. Governance and Control Summary

**Source:** `/reports/permissions-diff.md`

### Role Hierarchy

```
DEFAULT_ADMIN_ROLE (Gnosis Safe: 0x2Bb2c2A7...)
├── RISK_COMMITTEE_ROLE     → Propose risk parameter changes
├── SETTLEMENT_AUTHORITY    → Execute settlements
├── GUARDIAN_ROLE           → Emergency pause (immediate)
├── OPERATOR_ROLE           → Day-to-day operations (EOA)
├── REGISTRAR_ROLE          → Asset registration
└── CIRCUIT_BREAKER_ROLE    → Automated emergency triggers
```

### Control Classification

| Action Type | Execution Path | Delay |
|-------------|----------------|-------|
| Emergency Pause | GUARDIAN → Contract | IMMEDIATE |
| Circuit Breaker | CIRCUIT_BREAKER → Contract | IMMEDIATE |
| Emergency Sweep | GUARDIAN → Contract | IMMEDIATE |
| Role Changes | Safe → Timelock → Contract | 24h+ |
| Fee Changes | Safe → Timelock → Contract | 24h+ |
| Risk Params | Safe → Timelock → Contract | 24h+ |
| Lock Forever | Safe → Timelock → Contract | 24h+ |

### Timelock Configuration

| Parameter | Value | Status |
|-----------|-------|--------|
| Minimum Delay | 86400 seconds (24h) | Configured |
| Maximum Delay | 2592000 seconds (30d) | Configured |
| Configuration Locked | FALSE | **NOT YET ACTIVATED** |

**Note:** `lockForever()` is available but NOT activated. Once activated:
- Delay can only increase, never decrease
- Lock is permanent and irreversible
- Emergency functions remain immediate

**Governance Hardening:** See `/docs/governance-hardening.md` for the 1-6 month observation window criteria and lock readiness checklist.

---

## 3. Minimum Invariants

**Source:** `/docs/minimum-invariants.md`

### Invariant Summary

| Domain | Count | Status |
|--------|-------|--------|
| Authorization Safety | 4 | ✓ PASS |
| Treasury Solvency | 3 | ✓ PASS |
| Emergency Response | 3 | ✓ PASS |
| Parameter Integrity | 3 | ✓ PASS |
| Exposure Ceilings | 2 | ✓ PASS |
| **TOTAL** | **15** | **ALL PASS** |

### Critical Invariants

1. **INV-1.2: Timelock Delay Enforcement**
   - All timelocked operations wait ≥24h
   - Status: PASS

2. **INV-1.4: Lock Irreversibility**
   - Once locked, cannot unlock
   - Status: PASS (mechanism verified, not yet activated)

3. **INV-3.1: Immediate Emergency Pause**
   - GUARDIAN can pause immediately
   - Status: PASS

4. **INV-4.2: 24-Hour Minimum Floor**
   - Delay cannot go below 24h
   - Status: PASS

5. **INV-5.1: Max Exposure Limit**
   - Lending cannot exceed maxExposure
   - Status: PASS

### Failing Invariants

**None.** All 37 invariant tests passing.

---

## 4. Observer Dashboard Overview

**Source:** `/docs/observer-dashboard-spec.md`, `/docs/observer-metrics-v1.md`

### Dashboard Pages

| Page | Path | Purpose |
|------|------|---------|
| Overview | `/observer` | Executive summary |
| Treasury | `/observer/treasury` | Bucket balances, flows |
| Governance | `/observer/governance` | Timelock status, roles |
| Risk | `/observer/risk` | Exposure, red flags |
| Assets | `/observer/assets` | Registry, revenue |
| Controls | `/observer/controls` | Powers matrix |
| Reports | `/observer/reports` | Export, verification |

### Key Metrics (v1)

| Category | Metrics | Source |
|----------|---------|--------|
| Treasury | 6 | TreasuryHub + events |
| Governance | 5 | TimelockController + GovernanceHub |
| Risk | 4 | RiskConfig + FixFlipManager |
| Lending | 4 | Loan managers |
| System | 3 | RPC health |
| **TOTAL** | **22** | - |

### Data Sources

- **Real-time state:** Direct RPC calls (30s cache)
- **Historical events:** RPC queryFilter (10-block limit on free tier)
- **Aggregations:** Cached hourly

### Access Model

| Level | Access | Authentication |
|-------|--------|----------------|
| Public | All pages | None |
| Export | JSON/CSV | None |
| PDF Reports | Planned | Token-gated |

---

## 5. Known Gaps & Remediation

### Gap 1: Timelock Not Locked

**Status:** Lock Forever mechanism deployed but NOT activated.

**Impact:** Governance delays could theoretically be reduced (though still require timelock itself).

**Remediation:** Operational decision to execute `lockForever()` when ready.
- No code change required
- Requires Safe multisig approval
- Irreversible once executed

### Gap 2: Circuit Breaker Role Pending

**Status:** CIRCUIT_BREAKER_ROLE defined but no automated holder assigned.

**Impact:** No automated anomaly-based pause triggers.

**Remediation Options:**
1. Assign role to monitoring bot (ops change)
2. Integrate with Chainlink Automation (code change)
3. Keep manual only (current state)

### Gap 3: Historical Event Aggregation

**Status:** Alchemy free tier limits event queries to 10 blocks.

**Impact:** 7/30/90-day flow metrics show $0 (no historical data).

**Remediation Options:**
1. Upgrade to Alchemy PAYG ($$$)
2. Deploy TheGraph subgraph (V2 roadmap)
3. Use cached off-chain aggregation

### Gap 4: Oracle Staleness

**Status:** No enforced maximum age for price feeds.

**Impact:** Stale prices could affect LTV calculations.

**Remediation:** Add staleness check to RiskConfig (minimal code change).

---

## 6. Readiness Assessment

### MVP-Ready Components

| Component | Readiness | Notes |
|-----------|-----------|-------|
| Timelock Controller | ✓ Ready | Deployed, verified |
| Governance Config | ✓ Ready | Deployed, verified |
| Observer Dashboard | ✓ MVP | 7 pages, live data |
| Invariant Tests | ✓ Complete | 37/37 passing |
| Documentation | ✓ Complete | All specs written |
| Role Separation | ✓ Configured | Safe + EOA |

### Pending for Production

| Item | Effort | Priority |
|------|--------|----------|
| Activate Lock Forever | Ops | P1 (when ready) |
| Assign Circuit Breaker | Ops | P2 |
| Subgraph for history | 1 week | P2 |
| PDF report generation | 1 week | P3 |
| Token-gated access | 2 weeks | P3 |

### Institutional Readiness Score

**8/10** - MVP-ready for institutional review

Deductions:
- -1: Lock Forever not yet activated
- -1: Historical aggregations limited

---

## 7. Verification Checklist

- [x] All 37 invariant tests passing
- [x] No high/critical static analysis findings
- [x] Timelock contracts verified on Blockscout
- [x] Observer dashboard is read-only (no signing)
- [x] No deployment scripts executed in this pack
- [x] Documentation builds cleanly
- [x] All module definitions cite contract references

---

## Appendix: File Inventory

| Document | Path | Purpose |
|----------|------|---------|
| Module Definitions | `/docs/modules.md` | Audit-friendly specs |
| Contract Map | `/docs/module-to-contract-map.md` | Function → Contract |
| Permissions Diff | `/reports/permissions-diff.md` | Role analysis |
| Audit Report | `/reports/audit-report.json` | Test results |
| Dashboard Spec | `/docs/observer-dashboard-spec.md` | IA, pages |
| Event Mapping | `/docs/observer-events.md` | Events → Fields |
| Metrics v1 | `/docs/observer-metrics-v1.md` | Metric definitions |
| Invariants | `/docs/minimum-invariants.md` | Core invariants |
| This Document | `/docs/institutional-readiness-pack.md` | Consolidated |

---

*This document was generated as part of the Institutional Readiness Pack build.*
