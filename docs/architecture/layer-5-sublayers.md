# Layer 5 Sublayers Architecture

## Core Protocol Layer Decomposition

**Document Date:** January 31, 2026  
**Status:** Technical Specification  
**Network:** Arbitrum One (Chain ID: 42161)

---

## Overview

Layer 5 (Core Protocol Layer) encompasses all on-chain execution logic for lending, settlement, and capital coordination. This document decomposes Layer 5 into seven sublayers for clearer architectural understanding and modular development.

---

## Sublayer Map

```
┌─────────────────────────────────────────────────────────────────┐
│                     LAYER 5: CORE PROTOCOL                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │    5A        │  │    5B        │  │    5C        │           │
│  │ Settlement & │  │   Credit     │  │    Risk      │           │
│  │ Accounting   │  │ Origination  │  │  Controls    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │    5D        │  │    5E        │  │    5F        │           │
│  │  Revenue     │  │   Capital    │  │ Transparency │           │
│  │  Routing     │  │   Bridge     │  │  & Observer  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │                      5G                           │           │
│  │         Securitization & Note Aggregation         │           │
│  │                    (NEW)                          │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer 5A: Settlement & Accounting

**Purpose:** Handle payment routing, interest calculations, and accounting settlement.

### Existing Contracts

| Contract | Address | Function |
|----------|---------|----------|
| RepaymentRouter | 0x68fe7924c56c7B9D13F21B3a22Fe2B5bc59Ab9D5 | Payment routing |
| DSCRRepaymentRouter | 0xa03e35afeE61c965522D88e778B356A2F2eF9Eab | DSCR payment routing |
| PSM | 0x5db58d9c21369d1532a48Bdd658E4Fe415404922 | Peg stability swaps |

### Settlement Flow

```
Borrower Payment
       │
       ▼
┌─────────────────┐
│ RepaymentRouter │
└────────┬────────┘
         │
    ┌────┴────┬──────────┐
    ▼         ▼          ▼
┌───────┐ ┌───────┐ ┌─────────┐
│Lenders│ │Revenue│ │Backstop │
│  90%  │ │Router │ │  Vault  │
└───────┘ │  10%  │ └─────────┘
          └───────┘
```

### Accounting Events

- `PaymentReceived(loanId, amount, timestamp)`
- `InterestAccrued(loanId, amount, period)`
- `PrincipalRepaid(loanId, amount, remaining)`
- `LoanSettled(loanId, finalAmount, timestamp)`

---

## Layer 5B: Credit Origination Interfaces

**Purpose:** Provide interfaces for loan creation, underwriting, and issuance.

### Existing Contracts

| Contract | Address | Function |
|----------|---------|----------|
| FixFlipManager V3 | 0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958 | Fix & flip loans |
| DSCRLoanManager V3 | 0x105117F1AD1B65a5d0C7F0E9A870683A06738E16 | DSCR loans |
| BuilderFarmerCredit | 0x814A9795bAbEE0DEd433d127dacD03031fB193b4 | Builder/farmer credit |

### Origination Workflow

1. **Application** - Borrower submits loan request
2. **Underwriting** - Risk assessment and approval
3. **Issuance** - Loan NFT minted, funds disbursed
4. **Servicing** - Payment collection and monitoring
5. **Closure** - Payoff or liquidation

### Loan Products

| Product | LTV | APR | Max Term |
|---------|-----|-----|----------|
| Fix & Flip | 65-75% | 10-15% | 24 months |
| DSCR Rental | 65-80% | 8-12% | 30 years |
| Builder Credit | 70% | 12% | 24 months |
| Farmer Credit | 65% | 10% | 36 months |

---

## Layer 5C: Risk Controls & Parameterization

**Purpose:** Enforce risk limits, LTV ratios, and collateral requirements.

### Existing Contracts

| Contract | Address | Function |
|----------|---------|----------|
| RiskConfig V3 | 0xD9a53c691B688351283Fecc33D8D9AF964A9a078 | Fix & flip risk params |
| DSCRRiskConfig V3 | 0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26 | DSCR risk params |
| RateLimiter | 0xE19E4172786A193997f985edC27f7932a0B65327 | Minting rate limits |
| Liquidator | 0xF6518B363aB4D461D59E1c9A54De3B7f66Da5384 | Liquidation engine |

### Risk Parameters

| Parameter | Fix & Flip | DSCR |
|-----------|------------|------|
| Max LTV | 75% | 80% |
| Min DSCR | N/A | 1.25x |
| Interest Coverage | 1.5x | 1.25x |
| Reserve Requirement | 6 months | 6 months |

### Control Hierarchy

```
GovernanceHub (24h timelock)
       │
       ▼
┌─────────────────┐
│ RiskConfig V3   │
│ DSCRRiskConfig  │
└────────┬────────┘
         │
    ┌────┴────┬──────────┐
    ▼         ▼          ▼
┌───────┐ ┌───────┐ ┌─────────┐
│ LTV   │ │ Rate  │ │ Collat  │
│ Limits│ │ Limits│ │ Factors │
└───────┘ └───────┘ └─────────┘
```

---

## Layer 5D: Revenue Routing

**Purpose:** Distribute protocol revenue to stakeholders.

### Existing Contracts

| Contract | Address | Function |
|----------|---------|----------|
| AXUSDRevenueRouter | 0x39A9Ca593d350450d93aF7F24dC1A682df47F30a | Revenue distribution |
| SEEDYieldDistributor | 0x5867e1a8c77530648edF61975CBB57a8913d159F | SEED yield |
| AxiomFeeBurner | 0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94 | Fee burning |

### Revenue Split

```
Protocol Revenue (100%)
       │
       ├── 50% → SEED Holders
       │
       ├── 30% → Treasury
       │
       └── 20% → Backstop Vault
```

### Euler Fee Routing

```
Borrower Interest (100%)
       │
       ├── 90% → Lenders (vault depositors)
       │
       └── 10% → Fee Receiver (Revenue Router)
              │
              ├── 50% → SEED Holders
              ├── 30% → Treasury
              └── 20% → Backstop Vault
```

---

## Layer 5E: Capital Bridge to SPV Execution

**Purpose:** Coordinate on-chain capital with off-chain SPV acquisitions.

### Status: NEW (To Build)

### Required Contracts

| Contract | Function |
|----------|----------|
| CapitalBridgeHub | SPV coordination |
| CapitalReadinessGate | Threshold enforcement |

### Capital Bridge Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Property    │────▶│   Research   │────▶│  Risk Comm   │
│   Packet     │     │ Attestation  │     │   Approval   │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Settlement  │◀────│    SPV       │◀────│Authorization │
│   Event      │     │  Execution   │     │  Activation  │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Key Components

1. **PropertyPacket** - Off-chain property data reference
2. **ResearchAttestation** - Dual attestation requirement
3. **AcquisitionAuthorization** - Capital deployment approval
4. **SettlementEvent** - On-chain settlement proof

### Invariants

- Two independent research attestations required
- 24-hour timelock on authorization activation
- Readiness gate must be satisfied
- Settled authorizations cannot be reused

---

## Layer 5F: Transparency & Observer Surfaces

**Purpose:** Provide institutional-grade transparency and reporting.

### Existing Components

| Component | Location | Function |
|-----------|----------|----------|
| Observer Dashboard | /observer | Main dashboard |
| Treasury View | /observer/treasury | Treasury metrics |
| Risk View | /observer/risk | Risk indicators |
| Governance View | /observer/governance | Governance activity |

### API Endpoints

| Endpoint | Function |
|----------|----------|
| /api/euler/vault-stats | Euler metrics |
| /api/axusd/history | AXUSD history |
| /api/axusd/peg-deviation | Peg tracking |

### Dashboard Metrics

- Total Value Locked (TVL)
- Utilization Rate
- Collateral Breakdown
- Revenue Distribution
- Governance Actions
- Risk Indicators

---

## Layer 5G: Securitization & Note Aggregation (NEW)

**Purpose:** Enable standardized instrument issuance and pool formation for institutional capital.

### Status: NEW (To Build)

### Standardized Instruments

| Instrument Type | Description | Use Case |
|-----------------|-------------|----------|
| Whole Loan | Full loan ownership | Direct acquisition |
| Participation | Fractional loan share | Co-lending |
| Note | Promissory note wrapper | Secondary market |
| Revenue Share | Cashflow entitlement | Yield products |
| Rent Stream | Rental income contract | Income securitization |

### Pool Concept

```
┌─────────────────────────────────────────────────────────────┐
│                         POOL                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  Loan   │  │  Loan   │  │  Loan   │  │  Loan   │        │
│  │   #1    │  │   #2    │  │   #3    │  │   #N    │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Eligibility Filters:                                       │
│  - LTV <= 75%                                               │
│  - DSCR >= 1.25x                                            │
│  - Property Type: Residential                               │
│  - Geographic: Continental US                               │
├─────────────────────────────────────────────────────────────┤
│  Formation Rules:                                           │
│  - Minimum 10 loans                                         │
│  - Max concentration 10%                                    │
│  - Weighted avg LTV <= 70%                                  │
├─────────────────────────────────────────────────────────────┤
│  Audit Trail:                                               │
│  - Formation timestamp                                      │
│  - Eligibility check hashes                                 │
│  - Pool modification log                                    │
├─────────────────────────────────────────────────────────────┤
│  Cashflow Schedule:                                         │
│  - Monthly distribution dates                               │
│  - Waterfall priority                                       │
│  - Reserve requirements                                     │
└─────────────────────────────────────────────────────────────┘
```

### Registry Contracts

| Contract | Purpose |
|----------|---------|
| InstrumentRegistry | Track all standardized instruments |
| PoolRegistry | Manage pool formation and composition |
| ServicingEventLog | Record servicing activities |

### Pathway Constraints

**No Public Issuance Required**

Layer 5G supports:
1. Internal treasury pathways (protocol-held)
2. Accredited investor pathways (506(c))
3. Institutional allocation (whitelisted)

It does NOT require:
1. Public token issuance
2. Retail access
3. Secondary market trading

### Implementation Notes

```solidity
// InstrumentRegistry.sol
struct Instrument {
    uint256 instrumentId;
    InstrumentType instrumentType;
    bytes32 underlyingAssetHash;
    uint256 principalAmount;
    uint256 issuedAt;
    address holder;
    bool active;
}

enum InstrumentType {
    WholeLoan,
    Participation,
    Note,
    RevenueShare,
    RentStream
}

// PoolRegistry.sol
struct Pool {
    uint256 poolId;
    bytes32 eligibilityFilterHash;
    bytes32 formationRulesHash;
    bytes32 cashflowScheduleHash;
    uint256[] instrumentIds;
    uint256 createdAt;
    bool active;
}

// ServicingEventLog.sol
struct ServicingEvent {
    uint256 eventId;
    uint256 instrumentId;
    ServicingEventType eventType;
    uint256 amount;
    bytes32 proofHash;
    uint256 timestamp;
}

enum ServicingEventType {
    Payment,
    Default,
    Modification,
    Payoff
}
```

---

## Cross-Sublayer Dependencies

```
5A Settlement ◀──────────────────────────────────────┐
     │                                               │
     ▼                                               │
5B Origination ─────▶ 5C Risk Controls              │
     │                      │                        │
     │                      ▼                        │
     │               5D Revenue Routing              │
     │                      │                        │
     ▼                      ▼                        │
5E Capital Bridge ────────────────────▶ 5G Securitization
     │                                       │
     ▼                                       ▼
5F Transparency ◀────────────────────────────┘
```

---

## Contract Address Summary

### Existing (Layer 5A-5D, 5F)

| Sublayer | Contract | Address |
|----------|----------|---------|
| 5A | RepaymentRouter | 0x68fe7924c56c7B9D13F21B3a22Fe2B5bc59Ab9D5 |
| 5A | DSCRRepaymentRouter | 0xa03e35afeE61c965522D88e778B356A2F2eF9Eab |
| 5A | PSM | 0x5db58d9c21369d1532a48Bdd658E4Fe415404922 |
| 5B | FixFlipManager V3 | 0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958 |
| 5B | DSCRLoanManager V3 | 0x105117F1AD1B65a5d0C7F0E9A870683A06738E16 |
| 5C | RiskConfig V3 | 0xD9a53c691B688351283Fecc33D8D9AF964A9a078 |
| 5C | DSCRRiskConfig V3 | 0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26 |
| 5C | RateLimiter | 0xE19E4172786A193997f985edC27f7932a0B65327 |
| 5C | Liquidator | 0xF6518B363aB4D461D59E1c9A54De3B7f66Da5384 |
| 5D | AXUSDRevenueRouter | 0x39A9Ca593d350450d93aF7F24dC1A682df47F30a |
| 5D | SEEDYieldDistributor | 0x5867e1a8c77530648edF61975CBB57a8913d159F |
| 5D | AxiomFeeBurner | 0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94 |

### Deployed (Layer 5E - Capital Bridge)

| Sublayer | Contract | Address |
|----------|----------|---------|
| 5E | CapitalBridgeHub | 0x6a00455dC277C9430e5c45324B34F2425ba0408d |
| 5E | CapitalReadinessGate | 0xc3f798066e1401aa30Da8703A4c0588A1076ff39 |

### Deployed (Layer 5G - Securitization)

| Sublayer | Contract | Address |
|----------|----------|---------|
| 5G | InstrumentRegistry | 0xcDE54ED7d19768be02Eb7C4799d7d8689310C7A5 |
| 5G | PoolRegistry | 0x7D386357F0D461Be9DA5FBb90E1F194c5aeafcD9 |
| 5G | ServicingEventLog | 0x4A152350e3df79CbE895453ee1B7d486E7338093 |

---

## Document Control

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-31 | Initial creation |
| 1.1 | 2026-01-31 | Layer 5E deployed - CapitalBridgeHub, CapitalReadinessGate |
| 1.2 | 2026-01-31 | Layer 5G deployed - InstrumentRegistry, PoolRegistry, ServicingEventLog |
| 1.3 | 2026-01-31 | Layer 7 Node Economy deployed - NodeRegistry, NodeRewards, SlashingEngine |

### Deployed (Layer 7 - Node Economy)

| Layer | Contract | Address |
|-------|----------|---------|
| 7 | NodeRegistry | 0x31bc6268155219B627FC3B2d8434d010F33DCb03 |
| 7 | NodeRewards | 0x0c1c96F38566d056877cEf4791c701C4F5AEf362 |
| 7 | SlashingEngine | 0x1ae162B80cEfb82f9ccF25b5E7A45E5e133E6F87 |

**Node Classes:**
- **Storage** - DeNet data hosting (0.1 ETH stake, 30-day lock)
- **Execution** - Arbitrum replicas (0.5 ETH stake, 60-day lock)
- **Indexing** - Event indexing (0.25 ETH stake, 30-day lock)
- **Research** - Property research attestation (1 ETH stake, 90-day lock)

**Last Updated:** January 31, 2026  
**Classification:** Technical Architecture
