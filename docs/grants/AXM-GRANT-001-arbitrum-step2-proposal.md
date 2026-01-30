# Arbitrum STEP 2.0 Grant Proposal: AXUSD RWA Lending Markets

**Document ID:** AXM-GRANT-001  
**Version:** 1.1  
**Date:** 2026-01-29  
**Updated:** 2026-01-30  
**Status:** Ready for Submission

---

## Executive Summary

**Project:** AXUSD Lending Markets on Morpho & Euler  
**Requested Amount:** $50,000 - $150,000 (ARB equivalent)  
**Category:** Real World Assets (RWA) Infrastructure  
**Timeline:** 6 months

AXUSD is a RWA-backed stablecoin deploying permissionless lending markets on Arbitrum's leading protocols (Morpho, Euler). We enable DeFi users to borrow AXUSD using yield-bearing collateral (USDY, USTBL) that continues earning US Treasury yields while deposited.

---

## Project Overview

### What We're Building

| Component | Description | Status |
|-----------|-------------|--------|
| **AXUSD/USDY Market** | Morpho lending market, 90% LLTV, ~8% APY | Ready to deploy |
| **AXUSD/USDC Market** | Morpho lending market, 92% LLTV, ~6% APY | Ready to deploy |
| **AXUSD/USTBL Market** | Morpho lending market, 90% LLTV, ~7% APY | Ready to deploy |
| **AXUSD Lending Vault** | Euler multi-collateral vault (USDC/USDT/WETH/ARB collateral) | **LIVE** |
| **AXUSD Conservative Vault** | Euler ungoverned vault | Ready to deploy |

### Euler V2 Integration: Already Deployed

We have already deployed and configured our first institutional lending market on Euler V2:

| Contract | Address | Status |
|----------|---------|--------|
| **AXUSD Lending Vault** | `0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429` | LIVE |
| **Vault Governor** | `0xE742Ee9b946043ecc75bFc71B47216C1f8248316` | LIVE |
| **Fee Recipient** | `0x39A9Ca593d350450d93aF7F24dC1A682df47F30a` | Configured |

**Collateral Types (Live):**
| Asset | Vault Address | Borrow LTV | Liquidation LTV |
|-------|---------------|------------|-----------------|
| USDC | `0x0a1eCC5Fe8C9be3C809844fcBe615B46A869b899` | 90% | 95% |
| USDT | `0x37512F45B4ba8808910632323b73783Ca938CD51` | 90% | 95% |
| WETH | `0x78E3E051D32157AACD550fBB78458762d8f7edFF` | 80% | 85% |
| ARB | `0x7eD866D2D66c3149FaFE854C30C68a8BA7ceE8B9` | 70% | 75% |

**Governance:** Fee recipient configured via [AXM-GOV-002](https://arbiscan.io/tx/0x2dba6cd2be8d3378974e51086ffb06f507f28df2381aa7265e0f90cf6f4e1a08) - Protocol captures 10% of borrower interest

### The Innovation

Traditional stablecoin collateral sits idle. AXUSD lending markets accept **yield-bearing RWA collateral**:

- **USDY** (Ondo): Earns 5.35% APY from US Treasuries while deposited
- **USTBL** (Spiko): Earns 4.9% APY from European T-Bills while deposited

**Borrowers earn yield on their collateral while borrowing AXUSD.**

---

## Alignment with Arbitrum's STEP 2.0 Goals

### RWA Integration

| STEP 2.0 Priority | AXUSD Contribution |
|-------------------|-------------------|
| Increase RWA TVL on Arbitrum | USDY/USTBL collateral brings new RWA capital |
| Support yield-bearing assets | First lending markets for USDY/USTBL collateral |
| Enable institutional participation | Conservative vault options for risk-averse capital |
| Grow Arbitrum DeFi ecosystem | New stablecoin primitive for Arbitrum DeFi |

### Why Arbitrum?

- **Morpho:** $271M+ TVL on Arbitrum
- **Euler:** $50M+ TVL on Arbitrum
- **USDY:** $4.9M already on Arbitrum (target users)
- **Low gas:** $5-50 deployment cost
- **Timeboost:** MEV protection for liquidations

---

## Technical Architecture

### Smart Contract Infrastructure (Built & Deployed)

```
AXUSD Lending Stack
├── Euler V2 AXUSD Vault        - LIVE with 4 collateral types
│   ├── Fee routing             - 10% to Revenue Router (CONFIGURED)
│   ├── Governance              - AxiomVaultGovernorV2 (LIVE)
│   └── API Endpoint            - /api/euler/vault-stats (LIVE)
├── MorphoMarketService.ts      - 3 proposed markets, deployment ready
├── EulerVaultService.ts        - Conservative vault, deployment ready
├── API Endpoints               - /api/lending/overview, /morpho, /euler
├── Observer Dashboard          - Transparency for LPs and borrowers
└── Treasury Transparency       - Real-time on-chain metrics
```

### Collateral Risk Parameters

| Collateral | Loan-to-Value | Liquidation | Oracle |
|------------|---------------|-------------|--------|
| USDY | 90% | 95% | Chainlink/Ondo |
| USDC | 92% | 95% | Chainlink |
| USTBL | 90% | 95% | Chainlink/Spiko |

### Protocol Integrations

| Protocol | Integration | Purpose |
|----------|-------------|---------|
| **Morpho** | Permissionless markets | Isolated lending pools |
| **Euler** | EVK vaults | Multi-collateral + cross-vault |
| **Chainlink** | Oracle feeds | Price data |
| **Camelot** | DEX liquidity | AXUSD/USDC trading |

---

## Use of Funds

### Budget Breakdown

| Category | Amount | Purpose |
|----------|--------|---------|
| **Seed Liquidity** | 40% | Bootstrap lending markets with initial AXUSD deposits |
| **LP Incentives** | 30% | Rewards for liquidity providers (first 3 months) |
| **Gas Subsidies** | 10% | Cover deployment and initial transaction costs |
| **Security Audit** | 15% | Third-party audit of AXUSD contracts |
| **Marketing** | 5% | DeFi community outreach, documentation |

### Milestone-Based Disbursement

| Milestone | Deliverable | % of Grant | Status |
|-----------|-------------|------------|--------|
| **M1** (Week 1) | Deploy 3 Morpho markets | 20% | Pending |
| **M2** (Week 2) | Deploy Euler vault with fee routing | 20% | **COMPLETE** |
| **M3** (Month 1) | Achieve $100K TVL | 20% | In Progress |
| **M4** (Month 3) | Achieve $500K TVL | 20% | Pending |
| **M5** (Month 6) | Achieve $1M TVL | 20% | Pending |

**Note:** Euler V2 AXUSD Vault (Milestone M2) was deployed and configured prior to grant submission, demonstrating technical capability and commitment.

---

## TVL Growth Strategy

### Phase 1: Launch (Month 1)

- Deploy all 5 markets/vaults
- Seed $10-20K initial liquidity
- Launch LP incentive program (15-25% APY)
- Target USDY holders on Arbitrum ($4.9M existing capital)

### Phase 2: Growth (Month 2-3)

- Partnership with Ondo (USDY) for co-marketing
- DefiLlama listing and TVL tracking
- Coingecko/CMC AXUSD listing
- Expand to 1inch aggregator

### Phase 3: Scale (Month 4-6)

- Institutional vault options
- Cross-chain expansion (Optimism, Base)
- Additional RWA collateral types
- DAO-to-DAO partnerships

### Projected TVL

| Month | Conservative | Target | Optimistic |
|-------|--------------|--------|------------|
| 1 | $50K | $100K | $200K |
| 3 | $200K | $500K | $1M |
| 6 | $500K | $1M | $3M |
| 12 | $1M | $5M | $10M |

---

## Team & Track Record

### Core Team

- **Axiom Protocol Team**: Building decentralized land ownership and DeFi treasury infrastructure
- **Technical Infrastructure**: 23 verified smart contracts on Arbitrum One
- **Transparency**: Public Observer Dashboard for institutional-grade reporting

### Existing Arbitrum Presence

| Component | Status | Contract/Link |
|-----------|--------|---------------|
| AXUSD Stablecoin | Deployed | `0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c` |
| DEX V2 (10 contracts) | Live | Arbitrum One mainnet |
| **Euler V2 AXUSD Vault** | **LIVE** | `0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429` |
| **4 Collateral Vaults** | **LIVE** | USDC/USDT/WETH/ARB |
| **Fee Routing** | **Configured** | 10% to Revenue Router |
| Observer Dashboard | Live | Read-only transparency |
| Treasury Transparency | Live | Real-time on-chain metrics |
| Vault Stats API | Live | `/api/euler/vault-stats` |

---

## Risk Assessment

### Technical Risks

| Risk | Mitigation |
|------|------------|
| Oracle failure | Multi-source oracles, circuit breakers |
| Smart contract bug | Using battle-tested Morpho/Euler infrastructure |
| Liquidation cascades | Conservative LTV ratios, insurance fund |

### Market Risks

| Risk | Mitigation |
|------|------------|
| Low adoption | High APY incentives, target existing USDY holders |
| AXUSD de-peg | PSM with USDC, treasury backing |
| Competition | RWA collateral differentiator |

---

## Success Metrics

| Metric | Target (6 months) |
|--------|-------------------|
| TVL | $1M+ |
| Unique depositors | 100+ |
| Unique borrowers | 50+ |
| Liquidation rate | <1% |
| Average utilization | 50-80% |

---

## Contact & Resources

**Website:** [axiomprotocol.io](https://axiomprotocol.io)  
**Observer Dashboard:** `/observer`  

**Documentation:**
- Executive Summary: `/docs/lending/EXECUTIVE-SUMMARY-euler-v2-axusd-lending.md`
- Technical Specification: `/docs/lending/AXM-LEND-001-axusd-lending-markets.md`
- Governance Proposal: `/docs/governance/AXM-GOV-002-euler-vault-fee-recipient.md`

**Live APIs:**
- Vault Stats: `/api/euler/vault-stats` (real-time TVL, APY, utilization, fee status)
- Lending Overview: `/api/lending/overview`

**Smart Contracts (Arbitrum One - All Verified):**
| Contract | Address |
|----------|---------|
| AXUSD Token | `0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c` |
| AXUSD Lending Vault | `0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429` |
| Vault Governor | `0xE742Ee9b946043ecc75bFc71B47216C1f8248316` |
| Revenue Router | `0x39A9Ca593d350450d93aF7F24dC1A682df47F30a` |
| Axiom Deployer | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` |

**Euler V2 Direct Link:** [View on Euler](https://app.euler.finance/vault/0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429?network=arbitrumone)

**Governance Transaction:** [Arbiscan TX](https://arbiscan.io/tx/0x2dba6cd2be8d3378974e51086ffb06f507f28df2381aa7265e0f90cf6f4e1a08)

---

## Appendix: Comparable Projects

| Project | TVL | Grant Received | Axiom Integration |
|---------|-----|----------------|-------------------|
| Ondo (USDY) | $4.9M on Arbitrum | STEP 1.0 recipient | Collateral support planned |
| Spiko (USTBL) | Listed on Arbitrum | STEP 1.0 recipient | Collateral support planned |
| Morpho | $271M on Arbitrum | Arbitrum ecosystem | Markets ready to deploy |
| Euler | $1B+ total | Arbitrum deployment | **LIVE INTEGRATION** |

AXUSD creates lending markets that connect these protocols, enabling capital-efficient borrowing with yield-bearing RWA collateral.

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-29 | Initial draft |
| 1.1 | 2026-01-30 | Updated with live Euler V2 deployment, added contract addresses, governance TX, milestone progress |
