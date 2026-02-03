# AXIOM PROTOCOL WHITEPAPER

**The Financial Settlement Layer for Community Capital**

---

**Version:** 1.0
**Publication Date:** February 3, 2026
**Classification:** Public/Institutional
**Network:** Arbitrum One (Chain ID: 42161)
**Status:** Production

---

## Table of Contents

1. [Abstract](#1-abstract)
2. [Executive Summary](#2-executive-summary)
3. [Problem Statement](#3-problem-statement)
4. [Solution Architecture](#4-solution-architecture)
5. [Protocol Components](#5-protocol-components)
6. [Tokenomics](#6-tokenomics)
7. [Governance Framework](#7-governance-framework)
8. [Capital Bridge System](#8-capital-bridge-system)
9. [Node Operator Network](#9-node-operator-network)
10. [SUSU Savings Circles](#10-susu-savings-circles)
11. [Lending Products](#11-lending-products)
12. [Land Acquisition System](#12-land-acquisition-system)
13. [Stablecoin Infrastructure (AXUSD)](#13-stablecoin-infrastructure-axusd)
14. [Treasury Management](#14-treasury-management)
15. [Regulatory Compliance](#15-regulatory-compliance)
16. [Technology Stack](#16-technology-stack)
17. [Security Model](#17-security-model)
18. [Roadmap](#18-roadmap)
19. [Appendices](#19-appendices)

---

## 1. Abstract

AXIOM Protocol is a comprehensive land-first community ownership platform that enables communities to acquire, develop, and own real estate through SEC-compliant crowdfunding, SUSU-style savings pooling, and tokenized land options. Built on Arbitrum One with 43 deployed smart contracts, AXIOM creates the financial infrastructure for a sovereign smart city economy governed by its community stakeholders.

The protocol bridges traditional real estate finance with decentralized infrastructure, offering institutional-grade treasury management, transparent settlement systems, and community-driven governance. AXIOM's vision is to build America's first 1,000-acre on-chain sovereign smart city economy—a model for future digital-physical economies worldwide.

---

## 2. Executive Summary

### 2.1 Vision

AXIOM Protocol establishes the foundational infrastructure for community-owned land and financial services. Our mission is to democratize access to real estate investment while maintaining institutional-grade security, compliance, and transparency.

### 2.2 Key Metrics

| Metric | Value |
|--------|-------|
| **Network** | Arbitrum One (Layer 2 Ethereum) |
| **Deployed Contracts** | 43 verified |
| **Contract Categories** | Core (10), Product (16), Utility (15), Legacy (2) |
| **Governance Token** | AXM (15B max supply) |
| **Settlement Currency** | AXUSD (1:1 USD peg) |
| **Regulatory Framework** | SEC Reg D 506(c), Reg CF |
| **Node Operator Roles** | Observer, Validator, Attestor |
| **Lending Products** | Fix & Flip (12% APR), DSCR (7.25-8.5% APR) |
| **Target Land Acquisition** | 1,000+ acres |

### 2.3 Core Innovations

1. **Capital Bridge System**: SPV coordination for institutional capital deployment with dual attestation requirements
2. **Node Operator Network**: Decentralized verification layer with three-role hierarchy and slashing mechanisms
3. **Credits Ledger**: On-chain/off-chain hybrid rewards tracking with transparent accrual and distribution
4. **Readiness Gate**: Protocol maturity verification system ensuring capital deployment safety
5. **Note Portal**: Private credit note management for self-funded treasury operations
6. **SUSU Circles**: On-chain Rotating Savings and Credit Associations (ROSCAs) for community wealth building

---

## 3. Problem Statement

### 3.1 Barriers to Community Land Ownership

Traditional land acquisition faces significant challenges:

- **Capital Concentration**: Land ownership concentrated among institutional investors
- **Access Barriers**: High minimum investments exclude community participation
- **Opaque Processes**: Settlement and ownership records lack transparency
- **Fragmented Systems**: No unified platform for acquisition, financing, and governance
- **Regulatory Complexity**: Securities compliance creates friction for small investors

### 3.2 DeFi Limitations

Current DeFi protocols fail to address real-world asset needs:

- **Volatility**: Crypto-native collateral exposes lenders to extreme price swings
- **Compliance Gaps**: Most protocols ignore securities regulations
- **Real Asset Integration**: Limited infrastructure for property-backed lending
- **Governance Centralization**: Decision-making often controlled by founding teams
- **Sustainability**: Yield generation dependent on token emissions, not real revenue

### 3.3 Institutional Requirements

Institutional capital deployment requires:

- Timelock-protected governance with minimum 24-hour delays
- Transparent treasury operations with auditable flows
- Professional underwriting with dual verification
- Regulatory compliance with SEC frameworks
- Risk management with exposure ceilings and circuit breakers

---

## 4. Solution Architecture

### 4.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AXIOM PROTOCOL ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐  │
│  │   Frontend  │   │     API     │   │   Database  │   │  Blockchain │  │
│  │  (Next.js)  │───│  (Node.js)  │───│ (PostgreSQL)│───│ (Arbitrum)  │  │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘  │
│         │                 │                 │                 │          │
│         ▼                 ▼                 ▼                 ▼          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    CORE PROTOCOL MODULES                         │    │
│  ├─────────────┬─────────────┬─────────────┬───────────────────────┤    │
│  │  Treasury   │ Governance  │   Node      │   Capital Bridge      │    │
│  │  Management │   System    │  Economy    │      System           │    │
│  └─────────────┴─────────────┴─────────────┴───────────────────────┘    │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    PRODUCT LAYER                                  │    │
│  ├────────┬────────┬────────┬────────┬────────┬────────────────────┤    │
│  │ SUSU   │Lending │  Land  │  DEX   │Staking │ Insurance          │    │
│  │Circles │Products│Acquisition│ V2  │  Hub   │   Pools            │    │
│  └────────┴────────┴────────┴────────┴────────┴────────────────────┘    │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Layer Architecture

| Layer | Components | Purpose |
|-------|------------|---------|
| **Presentation** | Next.js 14, React 18, TailwindCSS | User interfaces, dashboards, portals |
| **Application** | Node.js, Express, API Routes | Business logic, orchestration |
| **Data** | PostgreSQL, Drizzle ORM | Off-chain state, user profiles, analytics |
| **Settlement** | Arbitrum One Smart Contracts | On-chain transactions, immutable records |
| **Integration** | Alchemy RPC, Resend Email, ATTOM Data | External services, data feeds |

### 4.3 Key Design Principles

1. **Hybrid Architecture**: Combine on-chain immutability with off-chain flexibility
2. **Modular Contracts**: Composable smart contracts under 24KB deployment limit
3. **Tiered Access**: Role-based permissions from visitor to admin
4. **Audit Trail**: Complete logging of all critical operations
5. **Graceful Degradation**: Fallback mechanisms for service interruptions

---

## 5. Protocol Components

### 5.1 Contract Registry Summary

| Category | Count | Size Status | Notes |
|----------|-------|-------------|-------|
| Core Infrastructure | 23 | 14 verified | 9 pending size check |
| Governance Infrastructure | 6 | 6 verified | All under 24KB |
| DEX V2 Ecosystem | 10 | 10 verified | Proxies (170 bytes) |
| Lending Fund Infrastructure | 3 | 3 verified | Production ready |
| AXUSD System | 1 | 1 verified | Token deployed, modules planned |
| **Total** | **43** | **34 verified** | Genesis snapshot complete |

### 5.2 Core Infrastructure Contracts

| Contract | Address | Size | Purpose |
|----------|---------|------|---------|
| AxiomV2 (AXM Token) | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` | 16.88 KB | ERC-20 governance token |
| AxiomIdentityComplianceHub | `0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED` | 2.87 KB | KYC/AML verification |
| AxiomTreasuryAndRevenueHub | `0x3fD63728288546AC41dAe3bf25ca383061c3A929` | 6.18 KB | Treasury & revenue distribution |
| AxiomStakingAndEmissionsHub | `0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885` | 6.06 KB | Token staking & emissions |
| CitizenCredentialRegistry | `0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344` | 8.97 KB | Citizen identity |
| AxiomLandAndAssetRegistry | `0xaB15907b124620E165aB6E464eE45b178d8a6591` | 3.55 KB | Land & asset registration |
| LeaseAndRentEngine | `0x26a20dEa57F951571AD6e518DFb3dC60634D5297` | 11.75 KB | Lease & rent processing |
| CapitalPoolsAndFunds | `0xFcCdC1E353b24936f9A8D08D21aF684c620fa701` | 10.68 KB | Investment pools |
| DePINNodeSuite | `0x16dC3884d88b767D99E0701Ba026a1ed39a250F1` | 11.54 KB | Node staking |
| DePINNodeSales | `0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd` | 13.60 KB | Node sales |

### 5.3 Governance Contracts

| Contract | Address | Size | Purpose |
|----------|---------|------|---------|
| GovernanceHub | `0x52Dc85fd653a75323b5307f4D2629ab9A070530E` | 8.92 KB | 24hr timelock governance |
| AxiomTimelockController | `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899` | 7.00 KB | Timelock execution |
| AxiomGovernanceConfig | `0xa645a0Fcc15dD22Ee44d774F19731Fb0fE70b2CC` | 4.33 KB | Governance parameters |
| ProductRegistry | `0x31AD75DB98F142069ff30D6C7C206Ca4b5a10e5d` | 4.08 KB | Loan product registration |
| RiskConfig | `0xD9a53c691B688351283Fecc33D8D9AF964A9a078` | 4.76 KB | Fix & Flip risk params |
| DSCRRiskConfig | `0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26` | 5.10 KB | DSCR loan risk params |

### 5.4 Contract Classification

| Tier | Description | Count | Upgrade Strategy |
|------|-------------|-------|------------------|
| **CORE** | Protocol foundation, cannot fail | 10 | Proxy upgrade only |
| **PRODUCT** | Revenue-generating products | 16 | Beacon proxy or redeploy |
| **UTILITY** | Supporting infrastructure | 15 | Redeploy freely |
| **LEGACY** | Deprecated or superseded | 1 | No upgrades |

---

## 6. Tokenomics

### 6.1 Token Overview

| Attribute | Value |
|-----------|-------|
| **Name** | Axiom Protocol Token |
| **Symbol** | AXM |
| **Max Supply** | 15,000,000,000 (15 billion) |
| **Decimals** | 18 |
| **Standard** | ERC-20 |
| **Network** | Arbitrum One |
| **Contract** | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` |
| **Initial Circulating (TGE)** | ~200,000,000 |
| **TGE Target** | Q1 2026 |

### 6.2 Token Allocation

| Category | Allocation | Token Amount | Vesting |
|----------|------------|--------------|---------|
| Community & Ecosystem | 35% | 5,250,000,000 | 48 months linear |
| Treasury | 20% | 3,000,000,000 | 36 months, 6-month cliff |
| Team & Advisors | 15% | 2,250,000,000 | 24 months, 12-month cliff |
| Private Sale | 12% | 1,800,000,000 | 18 months, 6-month cliff |
| Public Sale | 8% | 1,200,000,000 | 10% TGE, 12 months linear |
| Liquidity | 5% | 750,000,000 | Immediate at TGE |
| Strategic Partners | 5% | 750,000,000 | 24 months, 6-month cliff |

### 6.3 Token Utility

**1. Governance**
- Vote on protocol proposals
- Elect council members
- Approve treasury spending
- Set platform parameters

**2. Staking**
- Node operator staking requirements
- General staking for rewards
- Option consideration staking (8% APR for KeyGrow)
- Liquidity provision incentives

**3. Fee Payment**
- Transaction fees (discount for AXM holders)
- Platform service fees
- Banking product fees

**4. Access & Benefits**
- Premium feature access
- Higher tier banking services
- Early access to new products
- Governance participation rights

### 6.4 Deflationary Mechanisms

1. **Fee Burns**: Portion of transaction fees permanently burned
2. **Treasury Buybacks**: Regular buyback and burn programs
3. **Staking Locks**: Tokens locked in staking reduce circulating supply
4. **Governance Deposits**: Tokens locked for proposal submission

### 6.5 Emission Schedule

| Period | Circulating Supply |
|--------|-------------------|
| TGE (Day 1) | ~200,000,000 |
| End of Year 1 | ~2,000,000,000 |
| End of Year 2 | ~3,500,000,000 |
| End of Year 3 | ~4,700,000,000 |
| End of Year 4 | ~6,500,000,000 |
| Full Unlock (Year 5) | 15,000,000,000 |

---

## 7. Governance Framework

### 7.1 Governance Architecture

AXIOM implements a multi-layered governance system with timelocked execution and role-based access control.

```
┌─────────────────────────────────────────────────────────────────┐
│                     GOVERNANCE HIERARCHY                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  DEFAULT_ADMIN_ROLE (Gnosis Safe: 0x2Bb2c2A7...)                │
│  ├── RISK_COMMITTEE_ROLE     → Risk parameter updates            │
│  ├── SETTLEMENT_AUTHORITY    → Product activation                │
│  ├── GUARDIAN_ROLE           → Emergency pause (immediate)       │
│  ├── OPERATOR_ROLE           → Day-to-day operations             │
│  ├── REGISTRAR_ROLE          → Asset registration                │
│  └── CIRCUIT_BREAKER_ROLE    → Automated emergency triggers      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Timelock Configuration

| Parameter | Value | Status |
|-----------|-------|--------|
| Minimum Delay | 86400 seconds (24h) | Configured |
| Maximum Delay | 2592000 seconds (30d) | Configured |
| Default Delay | 24 hours | Active |
| Grace Period | 14 days | Configured |
| Lock Forever | Available | NOT activated |

### 7.3 Action Classification

| Action Type | Execution Path | Delay |
|-------------|----------------|-------|
| Emergency Pause | GUARDIAN → Contract | IMMEDIATE |
| Circuit Breaker | CIRCUIT_BREAKER → Contract | IMMEDIATE |
| Emergency Sweep | GUARDIAN → Contract | IMMEDIATE |
| Role Changes | Safe → Timelock → Contract | 24h+ |
| Fee Changes | Safe → Timelock → Contract | 24h+ |
| Risk Parameters | Safe → Timelock → Contract | 24h+ |

### 7.4 Invariant Testing

All 37 invariant tests pass, ensuring:

| Domain | Count | Status |
|--------|-------|--------|
| Authorization Safety | 4 | PASS |
| Treasury Solvency | 3 | PASS |
| Emergency Response | 3 | PASS |
| Parameter Integrity | 3 | PASS |
| Exposure Ceilings | 2 | PASS |
| **TOTAL** | **15** | **ALL PASS** |

---

## 8. Capital Bridge System

### 8.1 Overview

The Capital Bridge System coordinates institutional capital deployment through SPV (Special Purpose Vehicle) structures with transparent on-chain settlement and off-chain verification.

### 8.2 Capital Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAPITAL BRIDGE FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Institutional Capital                                            │
│         │                                                         │
│         ▼                                                         │
│  ┌─────────────────┐                                             │
│  │   SPV Entity    │ ◄──── SEC Reg D 506(c) Compliance          │
│  └────────┬────────┘                                             │
│           │                                                       │
│           ▼                                                       │
│  ┌─────────────────┐    ┌─────────────────┐                      │
│  │  Readiness Gate │───▶│ Dual Attestation │                     │
│  └────────┬────────┘    └─────────────────┘                      │
│           │                      │                                │
│           ▼                      ▼                                │
│  ┌─────────────────────────────────────────┐                     │
│  │           Settlement Layer               │                     │
│  │    (AXUSD / On-Chain Transactions)       │                     │
│  └─────────────────────────────────────────┘                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 Readiness Gate System

Before capital can be deployed, the protocol must pass four readiness checks:

| Check | Requirement | Purpose |
|-------|-------------|---------|
| Observation Period | 90+ days operational | Prove stability |
| Uptime | 99%+ system availability | Ensure reliability |
| Incidents | Zero critical incidents | Verify safety |
| TVL Threshold | Minimum TVL achieved | Demonstrate adoption |

### 8.4 Dual Attestation Requirement

Settlement authorization requires attestations from TWO different Attestors who:

- Are from different competency categories
- Have no shared conflicts of interest
- Completed independent reviews
- Signed within the same 24-hour settlement window

---

## 9. Node Operator Network

### 9.1 Program Overview

The Node Operator Program establishes a decentralized network of qualified participants who validate, attest, and monitor Capital Bridge settlement activities.

### 9.2 Role Hierarchy

| Role | Tier | Capabilities | Requirements |
|------|------|--------------|--------------|
| **Observer** | LIGHT | Read-only metrics, weekly reports, dashboard access | Email verification, wallet attestation |
| **Validator** | STANDARD | Artifact validation, underwriting review, validation reports | LIGHT + KYC, professional reference |
| **Attestor** | STRONG | Final attestation authority, dual attestation participation | STANDARD + enhanced due diligence, bonding |

### 9.3 On-Chain Node Economy

| Contract | Address | Purpose |
|----------|---------|---------|
| NodeRegistry | `0x52Dc85fd...` | Operator registration and roles |
| NodeRewards | `0x3fD63728...` | Rewards distribution |
| SlashingEngine | `0x8b99cDee...` | Penalty enforcement |
| CapitalReadinessGate | `0xc3f79806...` | Readiness verification |

### 9.4 Node Classes (On-Chain)

| Class | Stake Requirement | Purpose |
|-------|------------------|---------|
| Storage | Variable | Data availability |
| Execution | Variable | Transaction processing |
| Indexing | Variable | Query services |
| Research | Variable | Analytics and insights |

### 9.5 Compensation Model

| Milestone | USD Value | Eligible Roles |
|-----------|-----------|----------------|
| PACKET_ACCEPTED | $10 | Observer (20%), Validator (60%), Attestor (100%) |
| UNDERWRITING_FINALIZED | $20 | Validator (60%), Attestor (100%) |
| ARTIFACTS_PREVALIDATED | $20 | Validator (60%), Attestor (100%) |
| DUAL_ATTESTATION_RECORDED | $25 | Attestor (100%) |
| POST_SETTLEMENT_AUDIT | $25 | Observer (20%), Validator (60%), Attestor (100%) |

**Total per settlement cycle**: $100 USD equivalent

### 9.6 Enforcement and Slashing

| Severity | Examples | Consequences |
|----------|----------|--------------|
| LOW | Minor SLA miss, documentation error | Warning, remediation |
| MEDIUM | Repeated SLA violations | 25% slash, 30-day suspension |
| HIGH | Conflict non-disclosure, negligence | 50% slash, 90-day suspension |
| CRITICAL | Fraud, collusion | 100% slash, permanent revocation |

### 9.7 Credits Ledger System

The Credits Ledger provides transparent tracking of operator rewards:

**Database Tables:**
- `credits_ledger` - Per-operator balance tracking
- `credits_transactions` - All credit events (accrual, claim, adjustment)
- `onchain_rewards_sync` - Synchronization with on-chain rewards

**Features:**
- Real-time balance queries
- Transaction history with filtering
- Admin accrual and adjustment capabilities
- On-chain synchronization

---

## 10. SUSU Savings Circles

### 10.1 Overview

AXIOM SUSU digitizes the traditional Rotating Savings and Credit Association (ROSCA) practice, enabling community-based savings pools with blockchain transparency.

### 10.2 Three-Tier Discovery

**1. Interest Hubs** (Regional/Geographic)
- City, state, and country-based communities
- Examples: Atlanta GA, New York City, Lagos Nigeria

**2. Purpose Categories** (Savings Goals)
- 12 preset categories: Emergency Fund, Home Down Payment, Business Startup, Education, Vehicle, Wedding, Medical, Travel, Debt Payoff, Retirement, Investment, General

**3. Purpose Groups** (Pre-commitment Pools)
- Format: `{Region} | {Purpose} | {Amount} {Currency} | {Cycle}`
- Example: "Atlanta, GA | Investment Pool | 50 AXM | Monthly"

### 10.3 Core Features

| Feature | Description |
|---------|-------------|
| Group Health Dashboard | Readiness score, member tracking, wallet verification |
| Contribution Tracking | Progress visualization, cycle records, status indicators |
| In-App Messaging | Group communication, announcements, history |
| Invitation System | Shareable links with 7-day expiration |
| Trust & Reputation | Vouching system, reliability profiles and scores |
| Payout Scheduling | Sequential or randomized, estimated dates |
| Group Graduation | On-chain migration, charter creation |

### 10.4 Mode Classification

| Mode | Thresholds | Requirements |
|------|------------|--------------|
| **Community** | <$1,000/cycle, <$10,000 total, <20 members, <90 days | Standard verification |
| **Capital** | Exceeds any threshold | Enhanced compliance, additional verification |

### 10.5 Smart Contract: AxiomSusuHub.sol

- Configurable pool parameters: 2-50 members, AXM or ERC20 tokens
- Flexible cycle durations: Daily to monthly
- Sequential or random payout order
- Grace periods for late payments
- Protocol fees routed to treasury
- Comprehensive event logging

---

## 11. Lending Products

### 11.1 Product Overview

AXIOM offers institutional-grade lending products backed by real property collateral.

### 11.2 Fix & Flip Bridge Loans

| Parameter | Value |
|-----------|-------|
| **Contract** | FixFlipManager (`0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958`) |
| **LTV** | 75% (After-Repair Value) |
| **APR** | 12% |
| **Term** | 6-18 months |
| **Amount Range** | $50,000 - $5,000,000 |
| **Collateral** | Real property |

### 11.3 DSCR Rental Loans

| Product | LTV | DSCR | APR | Term | Amount Range |
|---------|-----|------|-----|------|--------------|
| 30-Year Rental | 75% | 1.25 | 8% | 360 mo | $75K - $3M |
| 15-Year Rental | 80% | 1.15 | 7.25% | 180 mo | $75K - $3M |
| BRRRR Refinance | 70% | 1.30 | 8.5% | 240 mo | $100K - $2M |

### 11.4 Builder & Farmer Credit

| Product | Type | Amount | Term | Rate |
|---------|------|--------|------|------|
| Builder Working Capital | Builder | $10K - $250K | 24 mo | 12% |
| Equipment Financing | Builder | $5K - $150K | 24 mo | 12% |
| Seasonal Farm Credit | Farmer | $5K - $100K | 36 mo | 10% |
| Livestock & Ranching | Farmer | $10K - $200K | 36 mo | 10% |
| Farm Infrastructure | Farmer | $25K - $500K | 36 mo | 10% |

### 11.5 Lending Infrastructure

| Contract | Purpose |
|----------|---------|
| ProductRegistry | Loan product configuration |
| RiskConfig | Fix & Flip risk parameters |
| DSCRRiskConfig | DSCR loan risk parameters |
| DSCRPoolVault V2 | Capital pool management |
| LoanReceiptNFT | Loan ownership tokens |

---

## 12. Land Acquisition System

### 12.1 Overview

The Land Acquisition System enables SEC-compliant community ownership of real property through tokenized crowdfunding.

### 12.2 Smart Contracts

| Contract | Purpose |
|----------|---------|
| LandOptionRegistry | Land parcel tokenization |
| LandAcquisitionPool | Crowdfunding pool management |
| RegCFCrowdfunding | SEC Reg CF compliance enforcement |
| BuilderFarmerCredit | Working capital for land development |

### 12.3 Tokenization Standard

- **Token Standard**: ERC-1155 (multi-token)
- **Ownership Representation**: Fractional land shares
- **Governance Rights**: Voting on land use decisions
- **Revenue Distribution**: Pro-rata rental/development income

### 12.4 Acquisition Pipeline

1. **Sourcing**: Identify target properties meeting criteria
2. **Due Diligence**: Property evaluation, title search, environmental assessment
3. **Crowdfunding**: SEC Reg CF compliant capital raise
4. **Tokenization**: Issue ERC-1155 ownership tokens
5. **Governance**: Community decisions on development
6. **Revenue**: Distribute income to token holders

### 12.5 Steward Corps

The Steward Corps program trains community members to manage acquired land:

- Multi-module training curriculum
- Certification requirements
- Regional assignment and responsibilities
- Compensation through Node Operator rewards

---

## 13. Stablecoin Infrastructure (AXUSD)

### 13.1 Overview

AXUSD is the settlement layer for all AXIOM Protocol transactions, designed as a fully-backed stablecoin with 1:1 USD peg.

### 13.2 Token Details

| Attribute | Value |
|-----------|-------|
| **Name** | AXUSD Stablecoin |
| **Contract** | `0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C` |
| **Size** | 6.30 KB |
| **Peg Target** | 1:1 USD |
| **Network** | Arbitrum One |

### 13.3 Planned System Components (Phase 1)

| Component | Purpose |
|-----------|---------|
| VaultEngine | CDP (Collateralized Debt Position) management |
| PSM | 1:1 USDC mint/redeem mechanism |
| Liquidator | Position handling for undercollateralized positions |
| BackstopVault | Protocol reserves for emergency situations |
| MarketOperations | Peg defense mechanisms |

### 13.4 Integration Points

- **SUSU Circles**: Contribution and payout currency
- **Lending Products**: Loan origination and repayment
- **Land Acquisition**: Crowdfunding contributions
- **Treasury Operations**: Revenue and expense flows
- **Node Rewards**: Operator compensation

---

## 14. Treasury Management

### 14.1 Treasury Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   TREASURY MANAGEMENT SYSTEM                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Revenue Streams                    Expense Categories           │
│  ├── Lending Interest              ├── Node Rewards              │
│  ├── Protocol Fees                 ├── Development               │
│  ├── Trading Fees                  ├── Operations                │
│  ├── Land Income                   ├── Marketing                 │
│  └── Insurance Premiums            └── Reserves                  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              AxiomTreasuryAndRevenueHub                  │    │
│  │              (0x3fD63728288546AC41...)                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           │                                       │
│           ┌───────────────┼───────────────┐                      │
│           ▼               ▼               ▼                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ Operations   │ │   Reserves   │ │  Development │             │
│  │    Vault     │ │    Vault     │ │    Vault     │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 14.2 Note Portal System

The Note Portal manages private credit notes for treasury self-funding:

**Database Tables:**
- `private_credit_notes` - Note records with terms
- `note_payment_events` - Payment history
- `note_covenants` - Compliance requirements
- `note_documents` - Supporting documentation

**Note Lifecycle:**
1. Draft → Active → Current/Delinquent → Paid Off/Defaulted

### 14.3 Observer Dashboard

Public transparency dashboard with 7 pages:

| Page | Purpose |
|------|---------|
| Overview | Executive summary metrics |
| Treasury | Bucket balances, fund flows |
| Governance | Timelock status, role assignments |
| Risk | Exposure monitoring, red flags |
| Assets | Registry, revenue attribution |
| Controls | Powers matrix, access control |
| Reports | Export capabilities, verification |

---

## 15. Regulatory Compliance

### 15.1 SEC Framework

| Regulation | Products | Investor Requirements |
|------------|----------|----------------------|
| **Reg D 506(c)** | Lending Fund, Mortgage Notes, Savings, Rent Streams | Accredited Investors Only |
| **Reg CF** | Community Land Funds | All investors (with limits) |

### 15.2 Accredited Investor Qualifications

Per SEC Rule 501(a):
- **Income Test**: $200K+ individual or $300K+ joint income for past 2 years
- **Net Worth Test**: $1M+ net worth (excluding primary residence)
- **Professional**: Series 7, 65, or 82 license holder
- **Entity**: $5M+ in assets, or all owners are accredited

### 15.3 Compliance Features

- KYC/AML verification on all products
- Investment limit enforcement for Reg CF
- On-chain whitelist for smart contract access
- Immutable audit trail
- Risk disclosures and acknowledgments
- Private Placement Memorandum (PPM) for each offering

### 15.4 Legal Entity Structure

| Entity | Purpose |
|--------|---------|
| Axiom Nexus LLC (Mississippi) | Fund management |
| Series A: AXUSD Fix & Flip Lending Fund | 506(c) offering |
| Additional series as needed | Future funds |

---

## 16. Technology Stack

### 16.1 Frontend

| Technology | Purpose |
|------------|---------|
| Next.js 14 | React framework with App Router |
| React 18 | UI component library |
| TypeScript | Type-safe development |
| TailwindCSS | Utility-first styling |
| MetaMask SDK | Wallet integration |

### 16.2 Backend

| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment |
| Express | API framework |
| Drizzle ORM | Database abstraction |
| PostgreSQL | Relational database |

### 16.3 Blockchain

| Technology | Purpose |
|------------|---------|
| Arbitrum One | Layer 2 settlement |
| Solidity | Smart contract language |
| ethers.js / viem | Web3 libraries |
| Alchemy | RPC provider |

### 16.4 Integrations

| Service | Purpose |
|---------|---------|
| Resend | Email notifications |
| ATTOM Data | Property valuation |
| RentCast | Rental market data |
| Walk Score | Location analysis |
| Chainlink | Price oracles |

### 16.5 Database Schema Highlights

The PostgreSQL database includes 100+ tables covering:

- User management and authentication
- SUSU circles and contributions
- Node operators and rewards
- Lending products and loans
- Land acquisition and ownership
- Treasury and transactions
- Audit logs and analytics

---

## 17. Security Model

### 17.1 Authentication Layers

| Layer | Mechanism | Scope |
|-------|-----------|-------|
| Wallet | MetaMask signature | All operators |
| Session | SIWE + JWT | Authenticated actions |
| Admin | Wallet + ADMIN_WALLETS env | Admin panel |
| Rate Limiting | 30 req/min per wallet | Admin APIs |

### 17.2 Access Control

| Role | Permissions |
|------|-------------|
| Visitor | View program info, connect wallet |
| Applicant | Submit application, view status |
| Operator | All applicant + certification |
| Admin | All operator + admin panel access |

### 17.3 Smart Contract Security

- OpenZeppelin security standards
- Upgradeable proxy patterns for critical contracts
- All contracts verified on Blockscout
- Role-based access control (RBAC)
- Pausable functionality for emergencies
- Reentrancy guards

### 17.4 Audit Status

| Component | Auditor | Status |
|-----------|---------|--------|
| Core Contracts | TBD | Planned |
| DEX V2 | TBD | Planned |
| Lending Contracts | TBD | Planned |
| AXUSD System | TBD | Planned |

### 17.5 Emergency Controls

| Control | Trigger | Effect |
|---------|---------|--------|
| GUARDIAN Pause | Multisig approval | Immediate halt |
| Circuit Breaker | Automated threshold | Immediate halt |
| Emergency Sweep | Multisig approval | Fund recovery |

---

## 18. Roadmap

### 18.1 Phase 0: Stabilization (COMPLETE)

- Document all deployed contract addresses and ABIs
- Create Genesis snapshot with version tags
- Identify contracts requiring upgrade proxies
- Separate core vs product contract classification
- Establish testnet fork for safe experimentation
- Deployment size audit

**Deliverables:**
- `GENESIS_SNAPSHOT.md`
- `DEPLOYMENT_SIZE_AUDIT.md`
- `CONTRACT_CLASSIFICATION.md`
- `UPGRADE_PROXY_PLAN.md`

### 18.2 Phase 1: Treasury Integration Layer (2-3 months)

**Stage 1A: Treasury Adapter Contracts**
- TreasuryVaultAdapter (~8 KB)
- ReportingOracle (~6 KB)
- AllocationRouter (~10 KB)

**Stage 1B: Internal Treasury Operations**
- Route internal capital through adapters
- Generate 3-6 month track record
- Build monitoring dashboards

**Stage 1C: External Pilot**
- Whitelist partner treasuries
- Capped allocations ($100K-$500K)
- Build case studies

### 18.3 Phase 2: Modular Architecture (1-2 months)

**Stage 2A: Contract Modularization**
- Split large contracts into smaller modules
- Deploy alongside existing contracts
- Migrate state via governance

**Stage 2B: Cross-Chain Interface**
- Prepare L2↔L3 communication
- Abstract bridge interface

**Stage 2C: State Migration Tools**
- Export/import scripts
- Verification tooling

### 18.4 Phase 3: Universe L3 Testnet (1-2 months)

**Configuration:**
- Chain ID: 421614
- Chain Name: Universe Testnet
- Native Currency: AXUSD
- Data Availability: AnyTrust

**Deliverables:**
- Private testnet deployment
- Core contract migration
- Bridge configuration

### 18.5 Phase 4: Universe L3 Private Mainnet (3-6 months)

**Operations:**
- Lending products live
- Treasury management
- Institutional settlements

**Target Revenue:**
- 12+ months operational runway
- $500K-$2M depending on volume

### 18.6 Phase 5: Public Universe L3 Launch

**Launch Criteria:**
- Treasury reserves: 12+ months runway
- Internal operations: 3+ months stable
- Security audit: Complete
- Legal review: Jurisdiction assessment

**Positioning:**
> "Universe Blockchain: The Financial Settlement Layer for Community Capital"

---

## 19. Appendices

### Appendix A: Contract Addresses

**Core Infrastructure:**
```
AxiomV2:                    0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D
AxiomIdentityComplianceHub: 0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED
AxiomTreasuryAndRevenueHub: 0x3fD63728288546AC41dAe3bf25ca383061c3A929
AxiomStakingAndEmissionsHub: 0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885
CitizenCredentialRegistry:  0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344
AxiomLandAndAssetRegistry:  0xaB15907b124620E165aB6E464eE45b178d8a6591
```

**Governance:**
```
GovernanceHub:             0x52Dc85fd653a75323b5307f4D2629ab9A070530E
AxiomTimelockController:   0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899
AxiomGovernanceConfig:     0xa645a0Fcc15dD22Ee44d774F19731Fb0fE70b2CC
ProductRegistry:           0x31AD75DB98F142069ff30D6C7C206Ca4b5a10e5d
RiskConfig:                0xD9a53c691B688351283Fecc33D8D9AF964A9a078
DSCRRiskConfig:            0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26
```

**Lending:**
```
FixFlipManager:            0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958
DSCRLoanManager:           0x105117F1AD1B65a5d0C7F0E9A870683A06738E16
DSCRPoolVault V2:          0x5a09cb67518e6E28d8307D75174430939C044A7d
```

**DEX V2:**
```
ExchangeHubV2:             0x31eF3DCB076ba97229113F4e58Cc9315cb8Dcd28
OracleAdapter:             0xe0074F15EFe0E39fdc39c8e13f752DDC63AB35c7
LPStaking:                 0x066623787044440015f7Ea2eC04cA58126cA00a5
FeeDistributor:            0xD981748E2ed17681D8088be84480FE294d635ae8
DEXRouter:                 0x05c655801dbf4ce8Db5aaE159769B7a1a0bFC0d8
InsuranceFund:             0x449769453e5bc43345092EeD31780bbbfc400F39
```

**Stablecoin:**
```
AXUSD Token:               0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C
```

**Multi-Sig:**
```
Gnosis Safe:               0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d
```

### Appendix B: API Endpoints

**Public Endpoints:**
- `GET /api/susu/hubs` - List regional hubs
- `GET /api/observer/node-economy` - Node economy metrics
- `GET /api/observer/capital-bridge` - Capital bridge status

**Operator Endpoints:**
- `GET /api/operator/status` - Operator status
- `POST /api/operator/apply` - Submit application
- `GET /api/operator/credits` - Credits balance
- `GET /api/operator/readiness` - Readiness gate status

**Admin Endpoints:**
- `GET /api/admin/operators` - List all operators
- `POST /api/admin/operators/advance` - Advance operator phase
- `GET /api/admin/notes` - List private credit notes
- `GET /api/admin/credits` - Credits ledger management

### Appendix C: Testing Coverage

| Test Suite | Tests | Status |
|------------|-------|--------|
| Node Economy | 25 | PASSING |
| Credits Ledger | 28 | PASSING |
| Readiness Gate | 17 | PASSING |
| Note Portal | 17 | PASSING |
| **Total** | **87** | **ALL PASSING** |

### Appendix D: Glossary

| Term | Definition |
|------|------------|
| **AXM** | Axiom Protocol governance token |
| **AXUSD** | Axiom USD stablecoin (1:1 USD peg) |
| **Capital Bridge** | System for institutional capital deployment |
| **CDP** | Collateralized Debt Position |
| **DSCR** | Debt Service Coverage Ratio |
| **LTV** | Loan-to-Value ratio |
| **Node Operator** | Network participant validating protocol operations |
| **ROSCA** | Rotating Savings and Credit Association |
| **SPV** | Special Purpose Vehicle |
| **SUSU** | Traditional African savings circle |
| **Universe L3** | Planned Layer 3 blockchain on Arbitrum Orbit |

### Appendix E: Risk Factors

1. **Market Risk**: Real estate values may decline
2. **Credit Risk**: Borrowers may default
3. **Liquidity Risk**: Lock-up periods limit liquidity
4. **Smart Contract Risk**: Potential vulnerabilities
5. **Regulatory Risk**: Securities law changes
6. **Stablecoin Risk**: Temporary de-pegging events

### Appendix F: Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-03 | AXIOM Protocol | Initial comprehensive whitepaper |

---

**DISCLAIMER**

This whitepaper is for informational purposes only and does not constitute an offer to sell or a solicitation of an offer to buy any securities. All investments involve risk, including the possible loss of principal. Securities have not been registered under the Securities Act of 1933. Prospective investors should carefully review the Private Placement Memorandum and consult with their own legal, tax, and financial advisors before investing.

---

**Copyright © 2026 AXIOM Protocol. All Rights Reserved.**

*Network: Arbitrum One (Chain ID: 42161)*
*Production Domain: axiomprotocol.app*
