# AXIOM PROTOCOL ECOSYSTEM WHITEPAPER

## Complete Technical Architecture & Implementation Guide

**Version:** 2.1  
**Date:** January 31, 2026  
**Network:** Arbitrum One (Chain ID: 42161)  
**Total Deployed Contracts:** 60+ (8 additional planned)  
**Status:** Production

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Vision & Mission](#2-vision--mission)
3. [Network Architecture](#3-network-architecture)
4. [AXM Token Economics](#4-axm-token-economics)
5. [Core Infrastructure Contracts](#5-core-infrastructure-contracts)
6. [AXUSD Stablecoin System](#6-axusd-stablecoin-system)
7. [DeFi Treasury Suite](#7-defi-treasury-suite)
8. [Real Estate & Lending](#8-real-estate--lending)
9. [Community Programs](#9-community-programs)
10. [Governance System](#10-governance-system)
11. [DePIN Infrastructure](#11-depin-infrastructure)
12. [External Integrations](#12-external-integrations)
13. [Application Pages](#13-application-pages)
14. [API Endpoints](#14-api-endpoints)
15. [Security Architecture](#15-security-architecture)
16. [Roadmap](#16-roadmap)
17. [Contract Registry](#17-contract-registry)
18. [Future Development Roadmap](#18-future-development-roadmap)

---

## 1. EXECUTIVE SUMMARY

Axiom Protocol is a decentralized real asset clearinghouse and financial infrastructure stack designed to coordinate real-world property, credit, and capital using verifiable data, governed execution, and on-chain settlement. The platform operates as a community-governed DeFi protocol with a comprehensive treasury system, real estate tokenization, and institutional-grade financial infrastructure built on Arbitrum One.

### Key Statistics

| Metric | Value |
|--------|-------|
| Total Contracts Deployed | 56+ |
| Network | Arbitrum One |
| Total AXM Supply | 15,000,000,000 |
| AXUSD Max Supply | 1,000,000,000 |
| Deployment Date | November 22, 2025 |
| Current Status | Production |

### Core Products

1. **AXUSD Stablecoin** - CDP-style stablecoin backed by real estate and T-Bills
2. **KeyGrow Program** - Rent-to-own housing with tokenized equity
3. **Axiom SUSU** - On-chain rotating savings groups (ROSCA)
4. **SEED Wealth Engine** - Vote-escrowed AXM for governance and yield
5. **Real Estate Lending Funds** - SEC Reg D 506(c) compliant bridge and DSCR loans
6. **DePIN Nodes** - Decentralized physical infrastructure network
7. **DEX Exchange** - Integrated token trading and liquidity
8. **Euler V2 Integration** - External DeFi lending markets

---

## 2. VISION & MISSION

### Vision
Build a decentralized financial infrastructure that connects off-chain real assets with on-chain capital coordination, enabling transparent, community-governed wealth building through verifiable data and sovereign execution.

### Mission
Reclaim what was taken. Build what was denied. Own what is ours.

### Core Principles

1. **Transparency by Default** - All operations on-chain and auditable
2. **Community Governance** - Token holders control protocol direction
3. **Real-World Utility** - Every token connected to tangible value
4. **Regulatory Compliance** - SEC Reg D/CF frameworks integrated
5. **Self-Custody** - Non-custodial architecture throughout

---

## 3. NETWORK ARCHITECTURE

### Primary Network Configuration

| Attribute | Value |
|-----------|-------|
| Network | Arbitrum One |
| Chain ID | 42161 |
| Chain ID (Hex) | 0xa4b1 |
| RPC URL | https://arb1.arbitrum.io/rpc |
| Block Explorer | https://arbitrum.blockscout.com |
| Native Currency | ETH (18 decimals) |
| Deployer Address | 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96 |

### Technology Stack

| Layer | Technology |
|-------|------------|
| Blockchain | Arbitrum One (Ethereum L2) |
| Smart Contracts | Solidity, OpenZeppelin |
| Frontend | Next.js, React, TypeScript |
| Backend | Node.js, Express |
| Database | PostgreSQL (Neon), MongoDB |
| ORM | Drizzle |
| Wallet Integration | MetaMask SDK, ethers.js, viem |
| AI Integration | Google Gemini |
| Storage | IPFS (Storacha), Google Cloud Storage |
| Email | Resend |
| Payments | Stripe |
| Oracles | Chainlink |

### External DeFi Protocols

| Protocol | Purpose |
|----------|---------|
| Euler V2 | Lending markets |
| Camelot | DEX liquidity |
| Chainlink | Price oracles |

---

## 4. AXM TOKEN ECONOMICS

### Token Overview

| Attribute | Value |
|-----------|-------|
| Name | Axiom Protocol Token |
| Symbol | AXM |
| Max Supply | 15,000,000,000 (15 billion) |
| Decimals | 18 |
| Standard | ERC-20 |
| Contract | 0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D |
| TGE Date | January 1, 2026 |

### Token Allocation

| Category | Allocation | Token Amount | Vesting |
|----------|------------|--------------|---------|
| Community & Ecosystem | 35% | 5,250,000,000 | 48 months linear |
| Treasury | 20% | 3,000,000,000 | 36 months, 6-month cliff |
| Team & Advisors | 15% | 2,250,000,000 | 24 months, 12-month cliff |
| Private Sale | 12% | 1,800,000,000 | 18 months, 6-month cliff |
| Public Sale | 8% | 1,200,000,000 | 10% TGE, 12 months linear |
| Liquidity | 5% | 750,000,000 | Immediate at TGE |
| Strategic Partners | 5% | 750,000,000 | 24 months, 6-month cliff |

### Token Utility

1. **Governance** - Vote on protocol proposals, elect council members
2. **Staking** - DePIN node operation, general staking rewards
3. **Fee Payment** - Transaction fees with holder discounts
4. **Access & Benefits** - Premium features, higher tier services

### Deflationary Mechanisms

- Fee burns from transaction fees
- Treasury buyback and burn programs
- Staking locks reducing circulating supply
- Governance deposits for proposal submission

---

## 5. CORE INFRASTRUCTURE CONTRACTS

### Contract 1: AxiomV2 (AXM Token)
**Address:** `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D`

ERC-20 governance token with:
- Burnable, Permit, and Votes extensions
- Dynamic fee routing to 6 configured vaults
- Role-based access control (7 roles)
- Pausable functionality
- Anti-whale protection
- Governance voting power with delegation

### Contract 2: AxiomIdentityComplianceHub
**Address:** `0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED`

KYC/AML verification and identity management:
- Verifiable credentials (VCs) storage
- KYC credential verification
- Accreditation status tracking
- Non-U.S. participation flags

### Contract 3: AxiomTreasuryAndRevenueHub
**Address:** `0x3fD63728288546AC41dAe3bf25ca383061c3A929`

Protocol treasury and revenue distribution:
- Multi-signature governance
- Automated disbursements
- Revenue routing across departments

### Contract 4: AxiomStakingAndEmissionsHub
**Address:** `0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885`

Token staking and emissions management:
- Linear emission schedule
- Staking rewards calculation
- Emission vault management

### Contract 5: CitizenCredentialRegistry
**Address:** `0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344`

Citizen identity and credentials:
- Digital identity registration
- Credential verification
- Reputation tracking

### Contract 6: AxiomLandAndAssetRegistry
**Address:** `0xaB15907b124620E165aB6E464eE45b178d8a6591`

Land parcels and asset registration:
- Property tokenization
- Title tracking
- Asset metadata storage

---

## 6. AXUSD STABLECOIN SYSTEM

### Overview

AXUSD is a multi-collateral, compliance-aware stablecoin designed for real estate loan settlement, rental income, and private credit payments.

### AXUSD Token Specifications

| Attribute | Value |
|-----------|-------|
| Name | Axiom USD |
| Symbol | AXUSD |
| Max Supply | 1,000,000,000 |
| Decimals | 18 |
| Contract | 0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C |
| Standard | ERC-20 |

### Core AXUSD Contracts

#### VaultEngine (CDP System)
**Address:** `0x4675C09dDC1B3094cd86F6b59904CC3E06c98028`

Collateralized debt positions for AXUSD minting:
- Multi-collateral support
- LTV ratio enforcement
- Position management

#### PSM (Peg Stability Module)
**Address:** `0x5db58d9c21369d1532a48Bdd658E4Fe415404922`

1:1 USDC swaps for peg stability:
- 0.1% swap fee
- 500K debt ceiling
- Automatic peg maintenance

#### RateLimiter
**Address:** `0xE19E4172786A193997f985edC27f7932a0B65327`

Minting controls:
- Daily limit: 100,000 AXUSD
- Per-address limit: 10,000 AXUSD

#### OracleAdapter
**Address:** `0xE3b1f38AaBAd138d0EF2e2C7429ee57c512fDF3D`

Multi-source price feeds:
- Chainlink integration
- Multiple price sources
- Decimal normalization

#### BackstopVault (USDC)
**Address:** `0x54438249457694eB5431811f3f19444Af0a01B29`

Emergency USDC reserve:
- 24h timelock for withdrawals
- Protocol insurance fund

#### BackstopVault (ETH)
**Address:** `0xF2540BD6fa365Bf8F1b9dd4efa7534Ff6522393f`

Emergency ETH reserve:
- Diversified collateral backing
- Emergency liquidity

#### TBillVault
**Address:** `0x091c146EC7c348552319E8D17cF7D0C9A4b3BCd4`

T-Bill backed reserve:
- GENIUS Act compliance
- 100% reserve backing
- Institutional-grade backing

#### Liquidator
**Address:** `0xF6518B363aB4D461D59E1c9A54De3B7f66Da5384`

Liquidation mechanism:
- Under-collateralized position liquidation
- Incentive structure for liquidators

#### MarketOperations
**Address:** `0x42E31Ac3A6aF2B2925a0B979A05156833b6660E4`

Peg stability operations:
- Open market operations
- Supply management
- Price stabilization

#### GENIUSCompliance
**Address:** `0x8E8F769dA133cd3825549EE3E814fC936C8dE7be`

GENIUS Act compliance:
- Public Law 119-27 compliance
- Regulatory reporting
- Reserve verification

### AXUSD Integration Contracts

#### SEEDYieldDistributor
**Address:** `0x5867e1a8c77530648edF61975CBB57a8913d159F`

Weekly yield distribution to SEED lockers.

#### AXUSDRevenueRouter
**Address:** `0x39A9Ca593d350450d93aF7F24dC1A682df47F30a`

Revenue routing:
- 50% → SEED Holders
- 30% → Treasury
- 20% → Backstop Vault

#### SusuAXUSDAdapter
**Address:** `0x4c17360651c2c46F1739E92f512D8ce6318106b4`

AXUSD-denominated SUSU circles with PSM auto-conversion.

#### KeyGrowPaymentModule
**Address:** `0x0FA690B590F37c369Ff7cFbF155d2E4A474d955c`

Rent-to-own payments in AXUSD with escrow and buy-down credits.

#### LiquidityBootstrapper
**Address:** `0xd690F8A987542772FDd65a9813c0Ae55Cfb1AD19`

Protocol-owned liquidity seeding for DEX pools.

---

## 7. DEFI TREASURY SUITE

### Wealth Engine V2 Contracts

#### AxiomScoreSBT (Credit Scoring)
**Address:** `0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008`

ERC-5192 Soulbound Token for on-chain credit scoring:
- Score range: 300-850 (FICO-like)
- Non-transferable
- Reputation-based updates

#### SusuInsuranceFund
**Address:** `0x7B69ce0d83f45C2dBa3e5B73076beA8b1Be1271F`

Default protection:
- 5% of node rewards diverted
- Covers broken SUSU circles
- Community insurance pool

#### SEED (Vote-Escrowed AXM)
**Address:** `0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046`

Curve-style locking mechanism:
- Lock periods: 1-4 years
- Earn SEED tokens
- Governance voting power
- Access to produce cycles and land cohorts

#### AxiomFeeBurner
**Address:** `0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94`

Real yield mechanism:
- 0.5% fee switch
- Buyback and burn
- Deflationary pressure

---

## 8. REAL ESTATE & LENDING

### Real Estate Core Contracts

#### LeaseAndRentEngine
**Address:** `0x00591d360416dE7b016bBedbC6AA1AE798eA873B`

Lease agreements and rent processing for KeyGrow program:
- Security fixed v2 (December 16, 2025)
- Automated rent collection
- Equity accumulation tracking

#### RealtorModule
**Address:** `0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412`

Realtor registration and commissions:
- Agent onboarding
- Commission tracking
- Performance metrics

#### CapitalPoolsAndFunds
**Address:** `0xFcCdC1E353b24936f9A8D08D21aF684c620fa701`

Investment pools and fund management:
- Multiple pool types
- Investor allocation
- Returns distribution

### Fix & Flip Bridge Loan System

SEC Reg D 506(c) compliant real estate lending.

| Contract | Address | Purpose |
|----------|---------|---------|
| RiskConfig V3 | 0xD9a53c691B688351283Fecc33D8D9AF964A9a078 | Risk parameters with GovernanceHub |
| LoanReceiptNFT | 0x6C4181A15EAC950A2504aC63ebE7F5A0999265e9 | ERC-721 loan receipts |
| FixFlipVault V2 | 0xF4AcD4B7EaBfDA7E1b96D3abA1C6340557aa93E5 | ERC-4626 vault with approveSpender |
| RepaymentRouter | 0x68fe7924c56c7B9D13F21B3a22Fe2B5bc59Ab9D5 | Payment routing |
| FixFlipManager V3 | 0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958 | Loan management with GovernanceHub |
| ProductRegistry V3 | 0x31AD75DB98F142069ff30D6C7C206Ca4b5a10e5d | Product catalog with GovernanceHub |

**Loan Parameters:**
- LTV: 65-75%
- APR: 10-15%
- Terms: Up to 24 months
- Collateral: Real estate properties

### DSCR Rental Loan System

Long-term rental property financing.

| Contract | Address | Purpose |
|----------|---------|---------|
| DSCRRiskConfig V3 | 0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26 | DSCR risk parameters |
| DSCRLoanReceiptNFT | 0x66DB145A7ac0de369da88098E8F85467cFaD7674 | ERC-721 loan receipts |
| DSCRPoolVault V2 | 0x5a09cb67518e6E28d8307D75174430939C044A7d | ERC-4626 vault |
| DSCRRepaymentRouter | 0xa03e35afeE61c965522D88e778B356A2F2eF9Eab | Payment routing |
| DSCRLoanManager V3 | 0x105117F1AD1B65a5d0C7F0E9A870683A06738E16 | Loan management |

**DSCR Requirements:**
- Minimum DSCR: 1.25x
- LTV: 65-80%
- APR: 8-12%
- Terms: 5-30 years
- BRRRR refinance pathway available

### Land Acquisition System

SEC Reg CF compliant crowdfunding.

| Contract | Address | Purpose |
|----------|---------|---------|
| LandOptionRegistry | 0xCE0Df38260E626BA45628C4576254276B8C62A0D | ERC-1155 land options |
| LandAcquisitionPool | 0x14162c6EE2BbcBC22Fd911c6f252807D186f5545 | Community pooling |
| RegCFCrowdfunding | 0x02f967Ba52132E63272bbf8b01EF676605eA99d2 | SEC Reg CF campaigns |
| BuilderFarmerCredit | 0x814A9795bAbEE0DEd433d127dacD03031fB193b4 | Credit facility |

**Builder Credit:**
- LTV: 70%
- APR: 12%
- Max Term: 24 months

**Farmer Credit:**
- LTV: 65%
- APR: 10%
- Max Term: 36 months

---

## 9. COMMUNITY PROGRAMS

### Axiom SUSU (Rotating Savings Groups)

On-chain ROSCA implementation preserving traditional community finance.

#### AxiomSusuHub (Pooled Custody)
**Address:** `0x6C69D730327930B49A7997B7b5fb0865F30c95A5`

Traditional pooled ROSCA structure:
- Configurable cycles
- Treasury fee routing
- Automated payouts

#### SusuPersonalVault (Self-Custody)
**Address:** `0x7F474D9D5aF702D587A126c49aDa43318c1420E5`

Self-custody SUSU option:
- Segregated funds
- User-controlled
- Early exit with penalty

#### Three-Stage Progression

1. **Purpose Groups** - Goal-aligned pre-commitment groups
2. **SUSU Circles** - On-chain rotating savings with custody choice
3. **The Wealth Practice** - Access to real estate pools and DePIN investments

### KeyGrow Rent-to-Own Program

ERC-1155 tokenized fractional property shares.

**How It Works:**
1. Property tokenized on-chain
2. Tenant enrolls in KeyGrow
3. Rent payments in AXM/AXUSD
4. Portion converts to equity
5. Full ownership on threshold

**Technical Components:**
- KeyGrowRegistry - Property and participant tracking
- EquityVault - Accumulated equity management
- PaymentRouter - Rent distribution
- OwnershipTransfer - Final transfer execution

### Community Hub Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| CommunitySocialHub | 0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49 | Social features |
| AxiomAcademyHub | 0x30667931BEe54a58B76D387D086A975aB37206F4 | Education |
| GamificationHub | 0x7F455b4614E05820AAD52067Ef223f30b1936f93 | Rewards |
| SustainabilityHub | 0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046 | Carbon credits |

---

## 10. GOVERNANCE SYSTEM

### GovernanceHub
**Address:** `0x52Dc85fd653a75323b5307f4D2629ab9A070530E`

On-chain timelock governance:
- 24-hour minimum delay
- Emergency pause function
- Action queue system
- Role-based access

### Governance Roles

| Role | Description |
|------|-------------|
| DEFAULT_ADMIN_ROLE | Full administrative control |
| RISK_COMMITTEE_ROLE | Risk parameter management |
| SETTLEMENT_AUTHORITY_ROLE | Settlement operations |
| GUARDIAN_ROLE | Emergency controls |
| PAUSER_ROLE | Pause/unpause operations |
| MINTER_ROLE | Token minting |
| COMPLIANCE_ROLE | Compliance settings |
| RESCUER_ROLE | Rescue stuck tokens |
| FEE_MANAGER_ROLE | Fee configuration |
| ORACLE_MANAGER_ROLE | Oracle updates |
| TREASURY_ROLE | Treasury operations |

### Governance Process

1. **Proposal Submission** - Token-weighted requirement
2. **Discussion Period** - Community deliberation
3. **Voting Period** - Token-weighted voting
4. **Timelock** - 24-hour execution delay
5. **Execution** - Automated or multi-sig

### SEED Voting Power

Lock AXM to receive SEED:
- 1 year lock: 0.25x voting power
- 2 year lock: 0.5x voting power
- 3 year lock: 0.75x voting power
- 4 year lock: 1.0x voting power

---

## 11. DEPIN INFRASTRUCTURE

### DePIN Node System

Decentralized Physical Infrastructure Network.

#### DePINNodeSuite V2
**Address:** `0x223dF824B320beD4A8Fd0648b242621e4d01aAEF`

Node staking and leasing:
- Security fixed December 16, 2025
- Performance tracking
- Reward distribution

#### DePINNodeSales V2
**Address:** `0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd`

Node sales with multiple payment options:
- ETH (full price)
- AXM (15% discount)
- DEX pricing ready (disabled by default)
- Manipulation protection

### Node Tiers

| Tier | Name | Price (ETH) | Price (AXM) | Rewards |
|------|------|-------------|-------------|---------|
| 1 | Starter | 0.1 | 85% | Base |
| 2 | Standard | 0.5 | 85% | 2x Base |
| 3 | Professional | 1.0 | 85% | 4x Base |
| 4 | Enterprise | 5.0 | 85% | 10x Base |

### IoT and Oracle Infrastructure

| Contract | Address | Purpose |
|----------|---------|---------|
| IoTOracleNetwork | 0xe38B3443E17A07953d10F7841D5568a27A73ec1a | IoT data validation |
| CitizenReputationOracle | 0x649a0F1bd204b6f23A92f1CDbb2F1838D691B643 | Reputation scoring |
| OracleAndMetricsRelay | 0x5c17F4621A47b4E8c357bAA6379b4B223BAA5Ac6 | Price feeds and metrics |

---

## 12. EXTERNAL INTEGRATIONS

### Euler V2 AXUSD Lending Markets

**AXUSD Vault V4:** `0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059`

| Parameter | Value |
|-----------|-------|
| Symbol | eAXUSD-4 |
| Supply Cap | 100,000,000 AXUSD |
| Borrow Cap | 100,000,000 AXUSD |
| Interest Fee | 10% of borrower interest |
| Fee Receiver | Revenue Router |

**Accepted Collateral:**

| Collateral | Vault | Borrow LTV | Liquidation LTV |
|------------|-------|------------|-----------------|
| eUSDC-1 | 0x0a1eCC5Fe8C9be3C809844fcBe615B46A869b899 | 90% | 95% |
| eWETH-1 | 0x78E3E051D32157AACD550fBB78458762d8f7edFF | 80% | 85% |

**Euler Infrastructure:**

| Component | Address |
|-----------|---------|
| EVK Factory | 0x78Df1CF5bf06a7f27f2ACc580B934238C1b80D50 |
| EVC | 0x6302ef0F34100CDDFb5489fbcB6eE1AA95CD1066 |
| Protocol Config | 0x06c1Ab0A1672E8FC7F7D10BD7B869B4116D18a2c |
| Price Oracle | 0x1045B6c70AC7b491bf724B5Aa4D89F542D955E15 |

### Camelot DEX Integration

| Component | Address |
|-----------|---------|
| Router | 0xc873fEcbd354f5A56E00E710B90EF4201db2448d |
| Factory | 0x6EcCab422D763aC031210895C81787E87B43A652 |
| AXUSD/USDC LP Pool | 0x266F6Cf7eA36d3f676eb292B274EAb25172790a2 |

### Chainlink Oracles

Price feeds for:
- ETH/USD
- USDC/USD
- ARB/USD
- Custom AXUSD feeds

---

## 13. APPLICATION PAGES

### Public Pages

| Route | Purpose |
|-------|---------|
| `/` | Homepage |
| `/dex` | DEX trading interface |
| `/earn` | Yield opportunities |
| `/borrow` | Borrowing interface |
| `/yield-vault` | Vault deposits |
| `/axusd` | AXUSD information |
| `/axiom-nodes` | DePIN node marketplace |
| `/keygrow` | Rent-to-own program |
| `/transparency` | Protocol transparency |
| `/governance` | Governance portal |
| `/faq` | FAQ |
| `/roadmap` | Product roadmap |

### Observer Dashboard

Institutional transparency portal at `/observer`:

| Route | Purpose |
|-------|---------|
| `/observer` | Main dashboard |
| `/observer/treasury` | Treasury metrics |
| `/observer/risk` | Risk indicators |
| `/observer/governance` | Governance activity |
| `/observer/assets` | Asset breakdown |
| `/observer/reports` | Downloadable reports |
| `/observer/controls` | Monitoring controls |

### Investment Products

| Route | Purpose |
|-------|---------|
| `/lending-fund` | Fix & flip fund |
| `/dscr` | DSCR rental loans |
| `/land-funds` | Community land funds |
| `/mortgage-notes` | Mortgage note investments |
| `/rent-streams` | Rental income streams |
| `/savings` | High yield savings |
| `/credit-lines` | AXUSD credit lines |
| `/insurance-pools` | Insurance products |
| `/treasury-notes` | Treasury notes |

### User Dashboard

| Route | Purpose |
|-------|---------|
| `/dashboard` | Unified investor dashboard |
| `/profile/[wallet]` | User profile |
| `/journey` | Personalized journey |

### SUSU Program

| Route | Purpose |
|-------|---------|
| `/joincommunity` | SUSU onboarding |
| `/workbook` | Land reclamation workbook |
| `/workbook/case/[id]` | Individual case |

### Steward Program

| Route | Purpose |
|-------|---------|
| `/stewards` | Steward overview |
| `/steward-corps` | Steward corps |
| `/stewards/training` | Training modules |
| `/stewards/apply` | Application |

### Admin Pages

| Route | Purpose |
|-------|---------|
| `/admin/investors` | Investor management |
| `/admin/roadmap` | Roadmap editor |
| `/admin/partner-deals` | Partner deals |
| `/dex/admin` | DEX administration |

---

## 14. API ENDPOINTS

### Core APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/euler/vault-stats` | GET | Euler vault metrics |
| `/api/axusd/history` | GET | AXUSD price history |
| `/api/axusd/wallet-position` | GET | Wallet position details |
| `/api/axusd/peg-deviation` | GET | Peg deviation tracking |
| `/api/axusd/multi-pool` | GET | Multi-pool analytics |
| `/api/axusd/lp-incentives` | GET | LP incentive data |
| `/api/axusd/cross-chain-routes` | GET | Bridge routes |

### Discord Integration

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/discord/setup-channels` | POST | Channel setup |
| `/api/discord/cleanup` | POST | Duplicate cleanup |
| `/api/discord/reorder` | POST | Category reordering |
| `/api/discord/send-message` | POST | Message sending |
| `/api/discord/setup-roles` | POST | Role configuration |

### Investment APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/lending-fund/*` | Various | Lending fund operations |
| `/api/dscr/*` | Various | DSCR loan operations |
| `/api/land/*` | Various | Land fund operations |
| `/api/kyc/*` | Various | KYC verification |

---

## 15. SECURITY ARCHITECTURE

### Smart Contract Security

- **Access Control:** OpenZeppelin AccessControl with multi-role system
- **Pausable:** Emergency pause functionality on all critical contracts
- **Reentrancy Guards:** Protection on all value-transferring functions
- **Timelock:** 24-hour delay on governance actions
- **Multi-sig:** Multi-signature requirements for critical operations

### Application Security

- **Rate Limiting:** API rate limits to prevent abuse
- **Audit Logging:** Comprehensive audit trail
- **Session Management:** Secure session handling
- **Anomaly Detection:** Security event tracking
- **Input Sanitization:** All user inputs sanitized

### External Audits

| Audit | Status |
|-------|--------|
| Euler V2 Protocol | Audited (external) |
| Axiom Core Contracts | Pending |
| Smart Contract Monitoring | Live |

### Security Roles

| Role | Capability |
|------|------------|
| Guardian | Emergency pause |
| Risk Committee | Parameter changes |
| Settlement Authority | Loan settlements |
| Admin | Full access with timelock |

---

## 16. ROADMAP

### Phase 1: Build the Balance Sheet (Current)

- ✅ Axiom Mortgage Notes
- ✅ Axiom High Yield Savings
- ✅ Axiom Rent Streams
- ✅ AXUSD Stablecoin System
- ✅ Euler V2 Integration
- 🟡 Observation Window (ends March 26, 2026)

### Phase 2: Turn Capital Into Infrastructure (Q2-Q3 2026)

- ✅ Community Land Funds
- ✅ Builder & Farmer Credit
- 🟡 Cross-chain expansion
- 🟡 Additional DePIN nodes
- 🟡 Institutional onboarding

### Phase 3: Turn Axiom Into a Financial State (Q4 2026+)

- 🟡 AXUSD Credit Lines
- 🟡 Insurance Pools
- 🟡 Axiom Treasury Notes
- 🟡 Universe Blockchain (L3) migration
- 🟡 Full banking charter

---

## 17. CONTRACT REGISTRY

### Complete Contract List

#### Core Infrastructure (1-6)
| # | Name | Address |
|---|------|---------|
| 1 | AxiomV2 (AXM Token) | 0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D |
| 2 | AxiomIdentityComplianceHub | 0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED |
| 3 | AxiomTreasuryAndRevenueHub | 0x3fD63728288546AC41dAe3bf25ca383061c3A929 |
| 4 | AxiomStakingAndEmissionsHub | 0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885 |
| 5 | CitizenCredentialRegistry | 0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344 |
| 6 | AxiomLandAndAssetRegistry | 0xaB15907b124620E165aB6E464eE45b178d8a6591 |

#### Real Estate & Rental (7-9)
| # | Name | Address |
|---|------|---------|
| 7 | LeaseAndRentEngine V2 | 0x00591d360416dE7b016bBedbC6AA1AE798eA873B |
| 8 | RealtorModule | 0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412 |
| 9 | CapitalPoolsAndFunds | 0xFcCdC1E353b24936f9A8D08D21aF684c620fa701 |

#### DeFi & Utility (10-13)
| # | Name | Address |
|---|------|---------|
| 10 | UtilityAndMeteringHub | 0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d |
| 11 | TransportAndLogisticsHub | 0x959c5dd99B170e2b14B1F9b5a228f323946F514e |
| 12 | DePINNodeSuite V2 | 0x223dF824B320beD4A8Fd0648b242621e4d01aAEF |
| 13 | DePINNodeSales V2 | 0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd |

#### Cross-Chain & Advanced DeFi (14-17)
| # | Name | Address |
|---|------|---------|
| 14 | CrossChainAndLaunchModule | 0x28623Ee5806ab9609483F4B68cb1AE212A092e4d |
| 15 | AxiomExchangeHub (DEX) | 0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D |
| 16 | CitizenReputationOracle | 0x649a0F1bd204b6f23A92f1CDbb2F1838D691B643 |
| 17 | IoTOracleNetwork | 0xe38B3443E17A07953d10F7841D5568a27A73ec1a |

#### Market Infrastructure (18-19)
| # | Name | Address |
|---|------|---------|
| 18 | MarketsAndListingsHub | 0x98a59D4fb5Fa974879E9F043C3174Ae82Fb9D830 |
| 19 | OracleAndMetricsRelay | 0x5c17F4621A47b4E8c357bAA6379b4B223BAA5Ac6 |

#### Community & Engagement (20-23)
| # | Name | Address |
|---|------|---------|
| 20 | CommunitySocialHub | 0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49 |
| 21 | AxiomAcademyHub | 0x30667931BEe54a58B76D387D086A975aB37206F4 |
| 22 | GamificationHub | 0x7F455b4614E05820AAD52067Ef223f30b1936f93 |
| 23 | SustainabilityHub | 0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046 |

#### Community Savings (24-25)
| # | Name | Address |
|---|------|---------|
| 24 | AxiomSusuHub | 0x6C69D730327930B49A7997B7b5fb0865F30c95A5 |
| 25 | SusuPersonalVault | 0x7F474D9D5aF702D587A126c49aDa43318c1420E5 |

#### Wealth Engine V2 (26-29)
| # | Name | Address |
|---|------|---------|
| 26 | AxiomScoreSBT | 0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008 |
| 27 | SusuInsuranceFund | 0x7B69ce0d83f45C2dBa3e5B73076beA8b1Be1271F |
| 28 | SEED (veAXM) | 0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046 |
| 29 | AxiomFeeBurner | 0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94 |

#### AXUSD System (30-40)
| # | Name | Address |
|---|------|---------|
| 30 | AXUSD Token | 0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C |
| 31 | OracleAdapter | 0xE3b1f38AaBAd138d0EF2e2C7429ee57c512fDF3D |
| 32 | RateLimiter | 0xE19E4172786A193997f985edC27f7932a0B65327 |
| 33 | VaultEngine | 0x4675C09dDC1B3094cd86F6b59904CC3E06c98028 |
| 34 | PSM | 0x5db58d9c21369d1532a48Bdd658E4Fe415404922 |
| 35 | BackstopVault (USDC) | 0x54438249457694eB5431811f3f19444Af0a01B29 |
| 36 | BackstopVault (ETH) | 0xF2540BD6fa365Bf8F1b9dd4efa7534Ff6522393f |
| 37 | TBillVault | 0x091c146EC7c348552319E8D17cF7D0C9A4b3BCd4 |
| 38 | GENIUSCompliance | 0x8E8F769dA133cd3825549EE3E814fC936C8dE7be |
| 39 | SegregatedCustody | 0x1Ba851cfB9B3e34D88BC0cbf5a0042F9eb1Af66b |
| 40 | Liquidator | 0xF6518B363aB4D461D59E1c9A54De3B7f66Da5384 |

#### AXUSD Integrations (36-40)
| # | Name | Address |
|---|------|---------|
| 36 | SEEDYieldDistributor | 0x5867e1a8c77530648edF61975CBB57a8913d159F |
| 37 | AXUSDRevenueRouter | 0x39A9Ca593d350450d93aF7F24dC1A682df47F30a |
| 38 | SusuAXUSDAdapter | 0x4c17360651c2c46F1739E92f512D8ce6318106b4 |
| 39 | KeyGrowPaymentModule | 0x0FA690B590F37c369Ff7cFbF155d2E4A474d955c |
| 40 | LiquidityBootstrapper | 0xd690F8A987542772FDd65a9813c0Ae55Cfb1AD19 |

#### Real Estate Lending (41-52)
| # | Name | Address |
|---|------|---------|
| 41 | RiskConfig V3 | 0xD9a53c691B688351283Fecc33D8D9AF964A9a078 |
| 42 | LoanReceiptNFT | 0x6C4181A15EAC950A2504aC63ebE7F5A0999265e9 |
| 43 | FixFlipVault V2 | 0xF4AcD4B7EaBfDA7E1b96D3abA1C6340557aa93E5 |
| 44 | RepaymentRouter | 0x68fe7924c56c7B9D13F21B3a22Fe2B5bc59Ab9D5 |
| 45 | FixFlipManager V3 | 0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958 |
| 46 | ProductRegistry V3 | 0x31AD75DB98F142069ff30D6C7C206Ca4b5a10e5d |
| 47 | DSCRRiskConfig V3 | 0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26 |
| 48 | DSCRLoanReceiptNFT | 0x66DB145A7ac0de369da88098E8F85467cFaD7674 |
| 49 | DSCRPoolVault V2 | 0x5a09cb67518e6E28d8307D75174430939C044A7d |
| 50 | DSCRRepaymentRouter | 0xa03e35afeE61c965522D88e778B356A2F2eF9Eab |
| 51 | DSCRLoanManager V3 | 0x105117F1AD1B65a5d0C7F0E9A870683A06738E16 |

#### Land Acquisition (53-56)
| # | Name | Address |
|---|------|---------|
| 53 | LandOptionRegistry | 0xCE0Df38260E626BA45628C4576254276B8C62A0D |
| 54 | LandAcquisitionPool | 0x14162c6EE2BbcBC22Fd911c6f252807D186f5545 |
| 55 | RegCFCrowdfunding | 0x02f967Ba52132E63272bbf8b01EF676605eA99d2 |
| 56 | BuilderFarmerCredit | 0x814A9795bAbEE0DEd433d127dacD03031fB193b4 |

#### Governance
| # | Name | Address |
|---|------|---------|
| 57 | GovernanceHub | 0x52Dc85fd653a75323b5307f4D2629ab9A070530E |

#### Euler V2 Integration
| # | Name | Address |
|---|------|---------|
| 58 | AXUSD Vault V4 | 0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059 |
| 59 | Vault Governor | 0xE742Ee9b946043ecc75bFc71B47216C1f8248316 |
| 60 | Price Oracle | 0x1045B6c70AC7b491bf724B5Aa4D89F542D955E15 |

---

## 18. FUTURE DEVELOPMENT ROADMAP

This section outlines the institutional-grade infrastructure planned for implementation, designed to bridge on-chain capital with off-chain real estate acquisitions via SPVs with full transparency and governance controls.

### 18.1 Layered Architecture Vision

The complete Axiom Protocol stack integrates eight layers:

| Layer | Name | Purpose |
|-------|------|---------|
| 1 | Physical Asset Layer | Non-on-chain inputs (properties, notes, rehab data) |
| 2 | Data & Verification Layer | Convert off-chain to immutable records (DeNet, CID) |
| 3 | Oracle & Metrics Layer | Risk signals (LTV, DSCR, utilization) |
| 4 | Arbitrum Execution Layer | Sovereign transaction verification |
| 5 | Core Protocol Layer | AXUSD, Euler, lending, settlement |
| 6 | Governance & Compliance Layer | Observation windows, disclosures, dashboards |
| 7 | Node Economy Layer | Storage, execution, indexing, research nodes |
| 8 | Capital Deployment Layer | SPV acquisitions, mortgage notes, rehab financing |

### 18.2 Layer 5 Sublayers (Core Protocol)

| Sublayer | Name | Status |
|----------|------|--------|
| 5A | Settlement & Accounting | DEPLOYED |
| 5B | Credit Origination Interfaces | DEPLOYED |
| 5C | Risk Controls & Parameterization | DEPLOYED |
| 5D | Revenue Routing | DEPLOYED |
| 5E | Capital Bridge to SPV | PLANNED |
| 5F | Transparency & Observer | DEPLOYED |
| 5G | Securitization & Note Aggregation | PLANNED |

### 18.3 Capital Bridge Infrastructure (Layer 5E)

#### CapitalBridgeHub Contract

Coordinates on-chain capital with off-chain SPV acquisitions through research attestation and timelocked authorization.

**Core Components:**

| Component | Description |
|-----------|-------------|
| PropertyPacket | Off-chain property data reference with due diligence hashes |
| ResearchAttestation | Dual independent attestation requirement (A + B) |
| AcquisitionAuthorization | Timelocked capital deployment approval |
| SettlementEvent | On-chain settlement proof |
| SPVEntity | Registered legal entity for property holding |

**State Machine - PropertyPacket:**
```
Draft -> Submitted -> Attested -> Approved OR Rejected -> Archived OR Expired
```

**State Machine - Authorization:**
```
Proposed -> Timelocked (24h) -> Active -> Settled OR Canceled OR Expired
```

**Critical Invariants:**
- Two independent research attestations required before approval
- Attestors must hold different roles (A cannot satisfy B)
- 24-hour timelock on authorization activation
- Settled authorizations cannot be reused
- All metadata references must be CID hash or content hash
- Attestation freshness: 30 days default

#### CapitalReadinessGate Contract

Prevents authorization activation unless minimum institutional readiness thresholds are satisfied.

**Readiness Parameters:**

| Parameter | Type | Purpose |
|-----------|------|---------|
| requiredAuditHash | bytes32 | Required audit reference |
| minimumUptimeBps | uint16 | Minimum uptime (basis points) |
| minimumObservationDaysElapsed | uint16 | Days since observation start |
| maxIncidentsAllowed | uint16 | Maximum security incidents |
| minimumTVLUsd | uint256 | Minimum TVL (0 = disabled) |
| freezeWindowSeconds | uint256 | Freeze period (0 = disabled) |

### 18.4 Securitization Infrastructure (Layer 5G)

#### Standardized Instruments

| Instrument Type | Description | Use Case |
|-----------------|-------------|----------|
| Whole Loan | Full loan ownership | Direct acquisition |
| Participation | Fractional loan share | Co-lending |
| Note | Promissory note wrapper | Secondary market |
| Revenue Share | Cashflow entitlement | Yield products |
| Rent Stream | Rental income contract | Income securitization |

#### Registry Contracts

| Contract | Purpose |
|----------|---------|
| InstrumentRegistry | Track all standardized instruments |
| PoolRegistry | Manage pool formation and composition |
| ServicingEventLog | Record servicing activities |

**Pathway Constraints:**
- Internal treasury pathways (protocol-held)
- Accredited investor pathways (SEC Reg D 506(c))
- Institutional allocation (whitelisted)
- No public token issuance required

### 18.5 Node Economy (Layer 7)

#### Node Classes

| Class | Function | Reward Source |
|-------|----------|---------------|
| Storage | DeNet data hosting | Storage fees |
| Execution | Arbitrum replicas | Query fees |
| Indexing | Event indexing | API fees |
| Research | Property research | Attestation fees |

**Research Node Qualification:**
- Qualify for RESEARCH_ATTESTOR_A_ROLE or RESEARCH_ATTESTOR_B_ROLE
- Cannot hold both roles simultaneously
- Must pass accreditation
- Must maintain attestation quality metrics

**Reward Model:**
- Non-inflationary (no token emissions)
- Funded from protocol revenue
- Performance-based distribution

### 18.6 New Roles (To Deploy)

| Role | Purpose | Contract |
|------|---------|----------|
| RESEARCH_ATTESTOR_A_ROLE | First attestation signer | CapitalBridgeHub |
| RESEARCH_ATTESTOR_B_ROLE | Second attestation signer | CapitalBridgeHub |
| REPORTING_ORACLE_ROLE | Readiness data posting | CapitalReadinessGate |

### 18.7 Contracts To Deploy

| Contract | Location | Priority |
|----------|----------|----------|
| CapitalBridgeTypes.sol | contracts/capital-bridge/ | P1 |
| CapitalBridgeHub.sol | contracts/capital-bridge/ | P1 |
| CapitalReadinessGate.sol | contracts/readiness/ | P1 |
| InstrumentRegistry.sol | contracts/securitization/ | P1 |
| PoolRegistry.sol | contracts/securitization/ | P1 |
| ServicingEventLog.sol | contracts/securitization/ | P1 |
| NodeRegistry.sol | contracts/node-economy/ | P2 |
| NodeRewardDistributor.sol | contracts/node-economy/ | P2 |
| NodeSlashingEngine.sol | contracts/node-economy/ | P2 |

### 18.8 Implementation Timeline

#### Observation Window (Now - March 26, 2026)

During this period:
- No treasury capital deployment
- External liquidity only via Euler V2
- Contract development and documentation allowed
- Testing and audit preparation

#### Phase 2: Capital Bridge Activation (Q2 2026)

| Month | Milestone |
|-------|-----------|
| April | Testnet deployment, integration testing |
| May | Security audit, mainnet deployment prep |
| June | First property packet, SPV registration |

#### Phase 3: Securitization (Q3 2026)

| Month | Milestone |
|-------|-----------|
| July | Layer 5G contract development |
| August | Testnet deployment, pathway testing |
| September | Mainnet deployment, first instrument |

#### Phase 4: Node Economy (Q4 2026)

| Month | Milestone |
|-------|-----------|
| October | Node registry development |
| November | Reward distribution, testnet |
| December | Mainnet launch, first nodes active |

### 18.9 Observer Dashboard Extensions

Future metrics for institutional transparency:

| Section | Metrics |
|---------|---------|
| Capital Bridge | Packets count, attested, approved, authorized, settled |
| Readiness Gate | Uptime, incidents, audit hash, days elapsed |
| Securitization | Instruments count, pools count, servicing events |
| Research | Attestation count, freshness, failure reasons |
| Node Economy | Active nodes by class, uptime, rewards distributed |

### 18.10 API Endpoints (Planned)

| Endpoint | Purpose |
|----------|---------|
| GET /api/capital-bridge/packets | List property packets |
| GET /api/capital-bridge/attestations | Attestation history |
| GET /api/capital-bridge/authorizations | Authorization list |
| GET /api/capital-bridge/settlements | Settlement records |
| GET /api/readiness/status | Current readiness state |
| GET /api/securitization/instruments | Instrument registry |
| GET /api/securitization/pools | Pool registry |
| GET /api/nodes/registry | Active node list |

### 18.11 Reference Documentation

| Document | Location |
|----------|----------|
| Master Prompt Analysis | docs/internal/CAPITAL-BRIDGE-MASTER-PROMPT-ANALYSIS.md |
| Development Roadmap | docs/internal/DEVELOPMENT-ROADMAP-2026.md |
| Layer 5 Sublayers | docs/architecture/layer-5-sublayers.md |
| Property Research SOP | docs/ops/property-research-sop.md |
| Module-to-Contract Map | docs/module-to-contract-map.md |

---

## APPENDIX A: STABLECOINS ON ARBITRUM

| Token | Address |
|-------|---------|
| USDC | 0xaf88d065e77c8cC2239327C5EDb3A432268e5831 |
| USDT | 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9 |

---

## APPENDIX B: EXTERNAL DEPENDENCIES

| Service | Purpose |
|---------|---------|
| Alchemy | Blockchain RPC |
| MetaMask SDK | Wallet integration |
| Chainlink | Oracle price feeds |
| Neon Database | PostgreSQL hosting |
| MongoDB | Analytics storage |
| Resend | Email service |
| Stripe | Payment processing |
| Google Cloud Storage | File storage |
| Storacha/IPFS | Decentralized storage |
| Supabase | Authentication |
| Google Gemini | AI integration |
| ATTOM Data | Property data |
| RentCast | Rental data |
| Walk Score | Location data |

---

## APPENDIX C: LEGAL ENTITIES

| Entity | Purpose |
|--------|---------|
| Axiom Nexus LLC | Mississippi-based real estate and private credit |
| PMA Trust | Private Membership Association |

---

## DOCUMENT VERSION

| Attribute | Value |
|-----------|-------|
| Version | 2.1 |
| Date | January 31, 2026 |
| Author | Axiom Protocol |
| Classification | Public |
| Changes | Added Section 18: Future Development Roadmap with Capital Bridge, Securitization, and Node Economy specifications |

---

**Copyright © 2026 Axiom Protocol. All Rights Reserved.**

*This document is the canonical reference for the Axiom Protocol ecosystem. All other documentation should reference this whitepaper for authoritative information.*
