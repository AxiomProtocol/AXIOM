# AXIOM Protocol → Universe L3 Strategic Roadmap

**Version:** 1.0
**Date:** February 2, 2026
**Classification:** Internal/Confidential

---

## Executive Summary

This document outlines the staged strategy to evolve AXIOM Protocol from its current Arbitrum One (L2) deployment to a full Treasury Infrastructure layer, culminating in the launch of Universe Blockchain as an Arbitrum Orbit L3 chain.

**Core Principles:**
1. Never break L2 production
2. Size-aware deployments (modular, staged)
3. Internal revenue generation before public launch
4. Reversible steps at every stage

---

## Current State (Genesis Snapshot)

### Deployed Infrastructure (Arbitrum One)

| Category | Count | Status |
|----------|-------|--------|
| Core Protocol Contracts | 29+ | Verified |
| DEX V2 Ecosystem | 10 | Verified |
| AXUSD System | 6 | Verified |
| Governance Infrastructure | 6 | Verified |

### Key Contract Addresses (Genesis)

| Contract | Address | Purpose |
|----------|---------|---------|
| GovernanceHub | `0x52Dc85fd653a75323b5307f4D2629ab9A070530E` | Timelock governance |
| ProductRegistry | `0x31AD75DB98F142069ff30D6C7C206Ca4b5a10e5d` | Loan product registration |
| RiskConfig | `0xD9a53c691B688351283Fecc33D8D9AF964A9a078` | Fix & Flip parameters |
| DSCRRiskConfig | `0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26` | DSCR loan parameters |
| FixFlipManager | `0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958` | Bridge loan origination |
| DSCRLoanManager | `0x105117F1AD1B65a5d0C7F0E9A870683A06738E16` | Rental loan origination |
| ExchangeHubV2 | `0x31eF3DCB076ba97229113F4e58Cc9315cb8Dcd28` | DEX trading router |
| OracleAdapter | `0xe0074F15EFe0E39fdc39c8e13f752DDC63AB35c7` | Chainlink price feeds |

---

## Phase 0: Stabilization (2-4 weeks)

**Goal:** Lock down current state, create upgrade foundation

### Tasks

- [ ] 0.1: Document all deployed contract addresses and ABIs
- [ ] 0.2: Create Genesis snapshot with version tags
- [ ] 0.3: Identify contracts requiring upgrade proxies
- [ ] 0.4: Separate "core" vs "product" contract classification
- [ ] 0.5: Establish testnet fork for safe experimentation
- [ ] 0.6: Create deployment size audit (identify contracts near limit)

### Deliverables

- `docs/GENESIS_SNAPSHOT.md` - Complete contract registry
- `docs/UPGRADE_PROXY_PLAN.md` - Proxy migration strategy
- `scripts/fork-mainnet.sh` - Local fork testing script

---

## Phase 1: Treasury Integration Layer (2-3 months)

**Goal:** Position AXIOM as treasury infrastructure on Arbitrum One

### Stage 1A: Treasury Adapter Contracts

**Objective:** Lightweight adapters that wrap existing infrastructure

| Contract | Purpose | Size Estimate |
|----------|---------|---------------|
| TreasuryVaultAdapter | Interface for external treasuries | ~8 KB |
| ReportingOracle | On-chain yield/performance metrics | ~6 KB |
| AllocationRouter | Capital routing logic | ~10 KB |

**Deployment Strategy:**
- Deploy to testnet first
- Internal testing for 2 weeks
- Mainnet deploy with owner = deployer (not DAO yet)

### Stage 1B: Internal Treasury Operations

**Objective:** Use own treasury as first customer

- Route internal capital through adapters
- Generate 3-6 month track record
- Document all yields, risk events, governance actions
- Build internal dashboards for monitoring

**Success Metrics:**
- Zero security incidents
- Accurate yield reporting
- All governance actions logged on-chain

### Stage 1C: External Pilot (Gated)

**Objective:** Invite 1-2 partner treasuries

- Whitelist partner addresses
- Capped allocations (e.g., $100K-$500K per partner)
- Manual onboarding with legal agreements
- Build case studies for Arbitrum Foundation

**Target Partners:**
- Small DAOs with active treasuries
- Crypto funds seeking RWA exposure
- Community land trusts with capital

---

## Phase 2: Modular Contract Architecture (1-2 months)

**Goal:** Refactor for chain portability and size constraints

### Stage 2A: Contract Modularization

**Problem:** Some contracts are near deployment size limit (~24 KB)

**Solution:** Split into smaller, composable modules

| Current Contract | Split Into |
|-----------------|------------|
| GovernanceHub | GovernanceCore + RoleManager + TimelockExecutor |
| ProductRegistry | ProductCore + ProductValidation + ProductEvents |
| FixFlipManager | LoanCore + CollateralManager + RepaymentEngine |

**Deployment Order:**
1. Deploy new modular contracts to testnet
2. Integration testing
3. Deploy to mainnet alongside existing contracts
4. Migrate state via governance proposal
5. Deprecate old contracts

### Stage 2B: Cross-Chain Message Interface

**Objective:** Prepare for L2↔L3 communication

```solidity
interface IMessageBridge {
    function sendMessage(uint256 targetChain, bytes calldata data) external;
    function receiveMessage(uint256 sourceChain, bytes calldata data) external;
}
```

**Implementation:**
- Abstract interface deployed now
- Initially routes locally (L2 only)
- Later connects to Arbitrum native bridge (L3)

### Stage 2C: State Migration Tools

**Objective:** Build export/import scripts for chain migration

**Data to Migrate:**
- User positions (loans, deposits, stakes)
- Governance state (proposals, votes, roles)
- Product configurations
- Oracle subscriptions

**Tools:**
- `scripts/export-state.ts` - Snapshot current state
- `scripts/import-state.ts` - Deploy state to new chain
- `scripts/verify-migration.ts` - Compare source/destination

---

## Phase 3: Universe L3 Testnet (1-2 months)

**Goal:** Private L3 for internal testing

### Stage 3A: Orbit Chain Setup

**Requirements:**
- Apply for Arbitrum Orbit license (if required)
- Select chain parameters:
  - Block time: 250ms (fast) or 1s (standard)
  - Gas token: AXUSD or ETH
  - Data availability: Rollup (high security) or AnyTrust (low cost)
  - Sequencer: Conduit, Caldera, or self-hosted

**Configuration:**

```json
{
  "chainId": 421614,
  "chainName": "Universe Testnet",
  "nativeCurrency": {
    "name": "AXUSD",
    "symbol": "AXUSD",
    "decimals": 18
  },
  "parentChain": "arbitrum-one",
  "dataAvailability": "anytrust",
  "sequencer": "self-hosted"
}
```

### Stage 3B: Contract Deployment (Testnet)

**Deployment Order:**
1. Core infrastructure (GovernanceCore, RoleManager)
2. Settlement layer (AXUSD bridge receiver)
3. Lending products (modularized versions)
4. DEX (if needed on L3)

**Testing:**
- Internal team transactions only
- Stress test throughput
- Validate gas costs
- Test finality times

### Stage 3C: Bridge Configuration

**L2 → L3 Bridge:**
- AXUSD deposits (lock on L2, mint on L3)
- AXM governance token bridging
- Native ETH bridging (if needed)

**L3 → L2 Bridge:**
- AXUSD withdrawals (burn on L3, unlock on L2)
- Yield distribution routing
- Governance message passing

---

## Phase 4: Universe L3 Private Mainnet (3-6 months)

**Goal:** Live L3 with real revenue, invite-only

### Stage 4A: Genesis Launch (Private)

**Whitelist:**
- Internal team wallets
- Early partner treasuries
- Steward Corps operators

**Operations:**
- Lending products (Fix & Flip, DSCR)
- Treasury management
- Institutional settlements

**NOT included in private launch:**
- Public DEX
- Community crowdfunding
- Open governance voting

### Stage 4B: Revenue Operations

**Revenue Streams:**
- All L3 gas fees (in AXUSD or AXM)
- Lending origination fees
- Treasury management fees
- Settlement fees

**Treasury Accumulation Target:**
- 12+ months operational runway
- Estimated: $500K-$2M depending on volume

**Tracking:**
- Daily revenue dashboard
- Weekly treasury reports
- Monthly governance reviews

### Stage 4C: Dual-Mode Operation

**L2 (Arbitrum One):**
- Public products remain accessible
- DEX trading
- Community-facing operations
- Governance voting

**L3 (Universe - Private):**
- Institutional operations
- High-volume settlements
- Treasury management
- Internal lending

**Bridge:**
- Seamless AXUSD movement
- Consolidated reporting
- Single governance authority (GovernanceHub on L2 controls both)

---

## Phase 5: Public Universe L3 Launch

**Goal:** Open L3 to public when self-funded

### Launch Criteria

| Requirement | Target | Status |
|-------------|--------|--------|
| Treasury reserves | 12+ months runway | [ ] |
| Internal operations | 3+ months stable | [ ] |
| Security audit | L3 contracts audited | [ ] |
| Arbitrum alignment | Foundation coordination | [ ] |
| Legal review | Jurisdiction assessment | [ ] |

### Launch Sequence

1. **T-30 days:** Announce Universe Blockchain publicly
2. **T-14 days:** Open bridge for early adopters (limited)
3. **T-7 days:** Enable permissionless product deployment
4. **T-0:** Full public launch
5. **T+30 days:** Governance handoff (community control)

### Positioning

> **Universe Blockchain: The Financial Settlement Layer for Community Capital**
>
> Built on Arbitrum Orbit, powered by AXUSD, governed by the Steward Corps.

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Deployment size limits | High | Modularization (Phase 2A) |
| L3 sequencer downtime | Medium | Redundant sequencer setup |
| Bridge security | Critical | Formal verification, bug bounty |
| Regulatory uncertainty | High | Legal review, jurisdiction selection |
| Insufficient revenue | High | Conservative launch criteria |
| Community backlash | Medium | Transparent communication |

---

## Success Metrics

### Phase 1 (Treasury Integration)
- [ ] Internal treasury deployed and operational
- [ ] 3+ months of auditable track record
- [ ] 1+ external pilot partner onboarded

### Phase 2 (Modularization)
- [ ] All contracts under 20 KB
- [ ] Cross-chain interface deployed
- [ ] State migration tools tested

### Phase 3 (L3 Testnet)
- [ ] Chain running for 30+ days
- [ ] 1000+ test transactions processed
- [ ] Bridge tested bidirectionally

### Phase 4 (L3 Private Mainnet)
- [ ] $100K+ revenue generated
- [ ] Zero security incidents
- [ ] 90%+ uptime

### Phase 5 (Public Launch)
- [ ] 12+ months runway in treasury
- [ ] Audit complete
- [ ] Community announcement

---

## Appendix A: Contract Size Audit

*To be completed in Phase 0*

| Contract | Current Size | Target Size | Action |
|----------|--------------|-------------|--------|
| GovernanceHub | TBD | <20 KB | TBD |
| ProductRegistry | TBD | <20 KB | TBD |
| FixFlipManager | TBD | <20 KB | TBD |
| ... | ... | ... | ... |

---

## Appendix B: Revenue Projections

*To be refined during Phase 4*

| Source | Monthly Estimate | Assumptions |
|--------|------------------|-------------|
| L3 Gas Fees | $10K-$50K | 10K-50K transactions/day |
| Lending Fees | $20K-$100K | $5M-$25M loan volume |
| Treasury Management | $5K-$25K | $10M-$50M AUM |
| Settlement Fees | $5K-$20K | Institutional volume |

**Conservative Total:** $40K-$200K/month

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | AXIOM Team | Initial roadmap |

