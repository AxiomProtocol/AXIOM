# AXIOM Multi-Chain Strategy & Gold Integration

**Version:** 1.0
**Date:** February 3, 2026
**Classification:** Internal/Strategic
**Status:** Approved Direction

---

## Executive Summary

This document defines AXIOM's multi-chain architecture with Arbitrum One as the primary control plane, and outlines the strategic integration of tokenized gold as a reserve buffer. The approach prioritizes execution simplicity, regulatory clarity, and institutional credibility.

**Core Principle:** AXUSD is risk-governed USD-stable with hard-asset buffers, NOT gold-backed.

---

## 1. Multi-Chain Architecture (Arbitrum-First Control Plane)

### Arbitrum One = Primary Financial Brain

All critical financial logic resides on Arbitrum One:

| Component | Purpose |
|-----------|---------|
| AXUSD Issuance Logic | Stablecoin minting/burning |
| Lending Markets | Euler / Morpho integration |
| Reserve Index Oracle | Real-time reserve reporting |
| Capital Bridge | Acquisition engine |
| Governance | Readiness gates, disclosures |

### Other Chains = Collateral & Liquidity Satellites

| Chain | Role |
|-------|------|
| Ethereum Mainnet | Deep liquidity, gold token sources |
| Polygon/Base | Optional future expansion |

**Key Distinction:**
- Arbitrum = "The balance sheet and settlement layer"
- Other chains = "Sources of collateral and liquidity, not decision makers"

Only risk-translated values are consumed by Arbitrum from other chains.

---

## 2. Tokenized Gold Assessment

### Tier 1 (Institutionally Credible)

These are the only tokens worth touching initially:

#### PAXG (PAX Gold) - PRIMARY

| Attribute | Value |
|-----------|-------|
| Issuer | Paxos |
| Regulation | NYDFS regulated |
| Custody | Clear disclosures |
| Risk Profile | Cleanest compliance optics |
| Recommendation | **START HERE FIRST** |

#### XAUT (Tether Gold) - SECONDARY

| Attribute | Value |
|-----------|-------|
| Issuer | Tether |
| Backing | Physically allocated gold |
| Liquidity | Deep |
| Integration | Widely available |
| Recommendation | Add later as liquidity enhancer |

### Recommendation

**Start with PAXG first, XAUT second.**

Rationale:
- PAXG is easier to justify to LPs and auditors
- XAUT can be added later as a liquidity enhancer
- Do not need both on day one

---

## 3. AXUSD Gold Framing (Critical Distinction)

### AXUSD is NOT Gold-Backed

AXUSD is risk-governed USD-stable, with hard-asset buffers.

### Correct Language

| Approved Statements |
|---------------------|
| "AXUSD uses a layered collateral and reserve model" |
| "Tokenized gold may be used as a reserve buffer or collateral" |
| "No direct redemption promises" |

### Incorrect Language (NEVER USE)

| Prohibited Statements |
|----------------------|
| "AXUSD is backed by gold" |
| "Redeem AXUSD for gold" |
| Any promise of gold redemption |

**This distinction keeps the protocol out of regulatory trouble.**

---

## 4. Gold Placement in Protocol Stack

### Layer Mapping

| Layer | Gold Integration |
|-------|------------------|
| **Layer 3** (Oracle & Metrics) | Gold price feeds, volatility metrics, risk haircuts |
| **Layer 5G** (Securitization) | Gold-collateralized liquidity pools (optional later) |
| **Layer 8** (Capital Deployment) | Gold as liquidity buffer for: note participation, short-term treasury stabilization, acquisition pacing |

---

## 5. Initial Arbitrum One Implementation (Phase 1)

### Collateral-Only Market

| Parameter | Value |
|-----------|-------|
| Asset | PAXG |
| Market Type | Euler or Morpho isolated market |
| LTV | 50-60% |
| Liquidation Threshold | Conservative |
| Borrow Cap | Small at launch |
| Leverage Loops | NOT allowed |

### Purpose

- Prove system works
- Zero redemption risk
- Pure on-chain behavior

### What This Achieves

| Benefit | Description |
|---------|-------------|
| Hard-asset support | Demonstrates protocol seriousness |
| Treasury credibility | Improves institutional perception |
| Optional liquidity | Creates acquisition flexibility |
| Regulatory clarity | No custody or regulatory overhead |

---

## 6. Multi-Chain Expansion (Post-Arbitrum Stability)

### Step A: Add Gold on Other Chains

Expansion order (after Arbitrum stability):
1. Ethereum mainnet (deepest liquidity)
2. Possibly Polygon or Base later

### Step B: Bridge Risk, Not Tokens

**Critical:** Do NOT bridge gold tokens unnecessarily

| Approach | Implementation |
|----------|----------------|
| Price feeds | Use oracles to bring price data |
| Reserve reporting | Aggregate off-chain reserves |
| Non-Arbitrum gold | Treat as "off-balance-sheet reserve" |

### Step C: Publish Reserve Index

The Reserve Index displays:
- On-chain collateral
- Liquid reserves
- Hard-asset exposure
- Caps and risk weights

**This is institutional-grade transparency.**

---

## 7. Node Operator Integration

Node operators benefit in four stacked ways:

### 1. Axiom Coin Compensation

- Earn protocol-native value
- Establish future AXUSD claims

### 2. Staking Yield

- Lock Axiom coin
- Earn fees over defined window

### 3. Infrastructure Rights

Priority roles in:
- Research attestations
- Data validation
- Capital Bridge workflows

### 4. Reserve Growth Exposure

- As gold and real assets enter reserves
- Protocol credibility increases
- Token utility and demand improve

**This aligns labor, infrastructure, and capital.**

---

## 8. Implementation Roadmap

### Immediate (No Capital Required)

| Priority | Task |
|----------|------|
| 1 | Write the Gold Integration Policy (no redemption promises, caps on exposure, conservative risk posture) |
| 2 | Add gold support to Observer dashboard (metrics only) |
| 3 | Add gold to Reserve Index logic |
| 4 | Prepare Euler/Morpho market config (testnet) |

### Short Term (Low Capital)

| Priority | Task |
|----------|------|
| 5 | Launch PAXG collateral market on Arbitrum |
| 6 | Keep borrow caps low |
| 7 | Publish transparent metrics |

### Medium Term (After Observation)

| Priority | Task |
|----------|------|
| 8 | Tie gold liquidity to note participation settlements |
| 9 | Integrate with treasury smoothing |
| 10 | Connect to acquisition pacing |

---

## 9. Strategic Position

### What AXIOM Is Building

This is NOT a stablecoin project.

**AXIOM is a financial operating system that:**
- Uses crypto correctly
- Respects real-world constraints
- Scales credibility before capital
- Makes infrastructure participation valuable

### Gold Integration Value

Adding precious metals this way:
- Strengthens AXUSD without compromising it
- Provides hard-asset buffer credibility
- Maintains regulatory clarity
- Creates institutional-grade transparency

---

## 10. Next Actions (Execution Order)

### Phase 1: Policy & Documentation

- [ ] Draft Gold Integration Policy
- [ ] Define exposure caps and risk weights
- [ ] Document conservative risk posture

### Phase 2: Technical Integration

- [ ] Add gold metrics to Observer dashboard
- [ ] Implement Reserve Index gold logic
- [ ] Configure Euler/Morpho testnet market

### Phase 3: Market Launch

- [ ] Deploy PAXG collateral market on Arbitrum
- [ ] Set conservative borrow caps
- [ ] Publish public metrics dashboard

### Phase 4: Expansion

- [ ] Connect to note participation settlements
- [ ] Integrate treasury smoothing
- [ ] Link to acquisition pacing

---

## Appendix A: Token Addresses

### PAXG (PAX Gold)

| Network | Address |
|---------|---------|
| Ethereum | `0x45804880De22913dAFE09f4980848ECE6EcbAf78` |
| Arbitrum | TBD (bridge or native deployment) |

### XAUT (Tether Gold)

| Network | Address |
|---------|---------|
| Ethereum | `0x68749665FF8D2d112Fa859AA293F07A622782F38` |

---

## Appendix B: Risk Parameters (Proposed)

| Parameter | PAXG | XAUT |
|-----------|------|------|
| LTV | 55% | 50% |
| Liquidation Threshold | 70% | 65% |
| Liquidation Penalty | 5% | 7% |
| Borrow Cap (Initial) | $100K | N/A |
| Supply Cap (Initial) | $500K | N/A |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-03 | AXIOM Team | Initial strategy document |

---

*This document represents approved strategic direction. Implementation requires technical specification and governance approval.*
