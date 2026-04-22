# AXIOM PROTOCOL

## Executive Summary & Technical White Paper

**Document Classification:** Institutional Disclosure
**Version:** 2.0
**Date:** February 19, 2026
**Network:** Arbitrum One (Chain ID: 42161)
**Deployer:** 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96
**Explorer:** https://arbitrum.blockscout.com

---

# PART I — EXECUTIVE SUMMARY

## 1. Mission Statement

Axiom Protocol is a governance-first wealth infrastructure platform designed to bridge digital capital formation with physical asset acquisition. The protocol provides institutional-grade transparency, deterministic risk management, and community-governed capital allocation — all anchored to verifiable on-chain operations on Arbitrum One.

The core thesis: disciplined savings behavior, transparent treasury operations, and programmable governance can support a framework for community capital formation designed to facilitate physical asset acquisition (land, housing, food production infrastructure) while maintaining cryptographic auditability at every layer.

## 2. What Axiom Is — and What It Is Not

**Axiom Protocol is:**
- Governance-first wealth infrastructure with disclosure-grade transparency
- A reference architecture for sovereign digital-physical economies
- A programmable group savings framework with deterministic scheduling and cryptographic audit trails
- An ERC-20 governance and fee-routing token ecosystem on Arbitrum One

**Axiom Protocol is not:**
- A bank, broker-dealer, or registered investment advisor
- FDIC insured
- A yield guarantee or wealth outcome promise
- An absolutist claim to being the "only" or "sole" platform of its kind

## 3. Platform Scale

| Metric | Count |
|---|---|
| Deployed & Verified Smart Contracts | 75+ across 5 phases (95 on-chain addresses) |
| Frontend Pages | 55 |
| API Endpoints | 133 |
| UI Components | 142 |
| Database Tables | 339 |
| Database Schema Lines | 9,205 |
| Production Dependencies | 99 |
| Deployment Phases | 5 (Nov 2025 – Feb 2026) |
| Audit Findings Fixed | 147 |

## 4. System Architecture at a Glance

```
┌──────────────────────────────────────────────────────────────────┐
│                     AXIOM PROTOCOL STACK                         │
├──────────────────────────────────────────────────────────────────┤
│  PRESENTATION LAYER                                              │
│  Next.js (Pages Router) · 55 pages · Design Law UI System       │
│  Serif/Mono typography · Navy/Forest/Gold palette · No shadows  │
├──────────────────────────────────────────────────────────────────┤
│  API LAYER                                                       │
│  133 Next.js API routes · Rate limiting · SIWE Auth · CORS      │
├──────────────────────────────────────────────────────────────────┤
│  INTELLIGENCE LAYER                                              │
│  AME (Deterministic) · MIRDT (Probabilistic) · Sentinel (Auth)  │
│  AI Oracle (Gemini) · Lexicon Guard · Glossary Enforcement       │
├──────────────────────────────────────────────────────────────────┤
│  DATA LAYER                                                      │
│  PostgreSQL (Neon) · Drizzle ORM · 339 tables · Redis Cache     │
├──────────────────────────────────────────────────────────────────┤
│  BLOCKCHAIN LAYER                                                │
│  Arbitrum One · 72+ contracts · Alchemy RPC · ethers.js / viem  │
│  MetaMask SDK · SIWE (Sign-In with Ethereum) · Safe Protocol    │
├──────────────────────────────────────────────────────────────────┤
│  EXTERNAL INTEGRATIONS                                           │
│  Google Gemini AI · Alpha Vantage · CoinGecko · ATTOM Data      │
│  Stripe · Resend · Discord · Supabase · Google Cloud Storage    │
└──────────────────────────────────────────────────────────────────┘
```

## 5. Token Overview

**AXM (Axiom Protocol Token)**
- Standard: ERC-20
- Network: Arbitrum One
- Contract: `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D`
- Total Supply: 15,000,000,000 (15 billion)
- Decimals: 18
- Functions: Governance voting, fee routing, participation lockup rewards, DePIN node payments (15% discount), SEED vote-escrow locking

**AXUSD (Protocol Stablecoin)**
- Dual-ecosystem architecture with strict segregation
- Primary (GENIUS Act Aligned): `0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C`
- Euler Original: `0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c`
- Non-mixing rule: The two AXUSD ecosystems operate independently with separate reserves, PSMs, and compliance layers

**SEED (Vote-Escrowed AXM)**
- Contract: `0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046`
- Curve-style locking: 1–4 year terms
- Functions: Governance power, real yield access, produce cycle eligibility, land cohort participation

---

# PART II — TECHNICAL WHITE PAPER

## 6. Smart Contract Infrastructure

### 6.1 Deployment Manifest

72+ verified smart contracts deployed across 5 phases on Arbitrum One, organized into the following subsystems:

#### Phase 1: Core Infrastructure (Contracts 1–6) — November 22, 2025

| # | Contract | Address | Function |
|---|---|---|---|
| 1 | AxiomV2 (AXM Token) | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` | ERC-20 governance and fee-routing token |
| 2 | AxiomIdentityComplianceHub | `0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED` | KYC/AML identity verification and compliance |
| 3 | AxiomTreasuryAndRevenueHub | `0x3fD63728288546AC41dAe3bf25ca383061c3A929` | Treasury management and revenue routing |
| 4 | AxiomStakingAndEmissionsHub | `0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885` | Participation lockup and emissions schedule |
| 5 | CitizenCredentialRegistry | `0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344` | On-chain credential and reputation registry |
| 6 | AxiomLandAndAssetRegistry | `0xaB15907b124620E165aB6E464eE45b178d8a6591` | Physical asset registry for land parcels |

#### Phase 1b: Real Estate & DeFi Utilities (Contracts 7–22) — November 2025

| # | Contract | Address | Function |
|---|---|---|---|
| 7 | LeaseAndRentEngine V2 | `0x00591d360416dE7b016bBedbC6AA1AE798eA873B` | Lease management and rent payment processing |
| 8 | RealtorModule | `0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412` | Real estate agent transaction facilitation |
| 9 | CapitalPoolsAndFunds | `0xFcCdC1E353b24936f9A8D08D21aF684c620fa701` | Investment pool management |
| 10 | UtilityAndMeteringHub | `0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d` | Utility billing and metering |
| 11 | TransportAndLogisticsHub | `0x959c5dd99B170e2b14B1F9b5a228f323946F514e` | Transport and logistics coordination |
| 12 | DePINNodeSuite V2 | `0x223dF824B320beD4A8Fd0648b242621e4d01aAEF` | Decentralized physical infrastructure nodes |
| 13 | DePINNodeSales V2 | `0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd` | Node sales with ETH + AXM payments |
| 14 | CrossChainAndLaunchModule | `0x28623Ee5806ab9609483F4B68cb1AE212A092e4d` | Cross-chain bridge and launch operations |
| 15 | AxiomExchangeHub | `0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D` | Internal decentralized exchange |
| 16 | CitizenReputationOracle | `0x649a0F1bd204b6f23A92f1CDbb2F1838D691B643` | On-chain reputation scoring |
| 17 | IoTOracleNetwork | `0xe38B3443E17A07953d10F7841D5568a27A73ec1a` | IoT data oracle feeds |
| 18 | MarketsAndListingsHub | `0x98a59D4fb5Fa974879E9F043C3174Ae82Fb9D830` | Real-world asset marketplace |
| 19 | OracleAndMetricsRelay | `0x5c17F4621A47b4E8c357bAA6379b4B223BAA5Ac6` | Oracle data aggregation and relay |
| 20 | CommunitySocialHub | `0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49` | Community engagement and social features |
| 21 | AxiomAcademyHub | `0x30667931BEe54a58B76D387D086A975aB37206F4` | Educational platform and certifications |
| 22 | GamificationHub | `0x7F455b4614E05820AAD52067Ef223f30b1936f93` | Achievement system and incentive mechanics |
| 23 | SustainabilityHub | `0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046` | Environmental sustainability tracking |

#### Phase 2: Community Savings & Sovereign Banking (Contracts 24–29) — December 2025

| # | Contract | Address | Function |
|---|---|---|---|
| 24 | AxiomSusuHub | `0x6C69D730327930B49A7997B7b5fb0865F30c95A5` | Rotating savings groups (pooled custody) |
| 25 | SusuPersonalVault | `0x7F474D9D5aF702D587A126c49aDa43318c1420E5` | Self-custody personal commitment vaults |
| 26 | AxiomScoreSBT | `0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008` | ERC-5192 soulbound credit scoring (300–850) |
| 27 | SusuInsuranceFund | `0x7B69ce0d83f45C2dBa3e5B73076beA8b1Be1271F` | Default protection fund (5% node reward diversion) |
| 28 | SEED (Vote-Escrowed AXM) | `0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046` | Curve-style 1–4 year governance locking |
| 29 | AxiomFeeBurner | `0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94` | 0.5% fee switch with buyback/burn mechanism |

#### Phase 3: AXUSD Stablecoin System (Contracts 30–52) — January 2026

**Euler Original AXUSD (Contracts 30–35):**

| # | Contract | Address | Function |
|---|---|---|---|
| 30 | AxiomStable (AXUSD) | `0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c` | ERC-20 stablecoin (1B max supply) |
| 31 | OracleAdapter | `0x6dEC19DD5472F5a82e37972008De3eBB46b754B0` | Multi-source collateral price feeds |
| 32 | RateLimiter | `0xeCaBaA0dBbbA47E22C1f5A0F0495D1Ce9F40CF20` | Daily 100K / per-address 10K minting controls |
| 33 | VaultEngine | `0x72aaBb0d84077859276513106Ea225E4edE80db0` | Collateralized debt positions (CDP) |
| 34 | BackstopVault | `0x9D59e65aF3F5251578DC5F7576793de28A95c00a` | Emergency reserve with 24h timelock |
| 35 | PSM | `0x4584888cB411E9cc88e3800BAB73A430D90d3793` | 1:1 USDC swaps with 0.1% fee |

**AXUSD Integration (Contracts 36–40):**

| # | Contract | Address | Function |
|---|---|---|---|
| 36 | SEEDYieldDistributor | `0x5867e1a8c77530648edF61975CBB57a8913d159F` | Weekly AXUSD yield to SEED lockers |
| 37 | AXUSDRevenueRouter | `0x39A9Ca593d350450d93aF7F24dC1A682df47F30a` | Revenue routing to SEED, treasury, backstop |
| 38 | SusuAXUSDAdapter | `0x4c17360651c2c46F1739E92f512D8ce6318106b4` | AXUSD-denominated savings circles |
| 39 | KeyGrowPaymentModule | `0x0FA690B590F37c369Ff7cFbF155d2E4A474d955c` | Rent-to-own housing payments in AXUSD |
| 40 | LiquidityBootstrapper | `0xd690F8A987542772FDd65a9813c0Ae55Cfb1AD19` | Protocol-owned liquidity seeding |

**GENIUS Act Aligned AXUSD (Contracts 41–52):**

| # | Contract | Address | Function |
|---|---|---|---|
| 41 | AXUSD (GENIUS) | `0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C` | Primary stablecoin designed to align with GENIUS Act |
| 42 | OracleAdapter | `0xE3b1f38AaBAd138d0EF2e2C7429ee57c512fDF3D` | GENIUS-specific price oracle |
| 43 | RateLimiter | `0xE19E4172786A193997f985edC27f7932a0B65327` | GENIUS-specific minting controls |
| 44 | VaultEngine | `0x4675C09dDC1B3094cd86F6b59904CC3E06c98028` | GENIUS-specific CDP engine |
| 45 | PSM | `0x5db58d9c21369d1532a48Bdd658E4Fe415404922` | GENIUS-specific peg stability module |
| 46 | BackstopVault (USDC) | `0x54438249457694eB5431811f3f19444Af0a01B29` | USDC emergency reserve |
| 47 | BackstopVault (ETH) | `0xF2540BD6fa365Bf8F1b9dd4efa7534Ff6522393f` | ETH emergency reserve |
| 48 | T-Bill Vault | `0x091c146EC7c348552319E8D17cF7D0C9A4b3BCd4` | Treasury bill backing vault |
| 49 | GeniusCompliance | `0x8E8F769dA133cd3825549EE3E814fC936C8dE7be` | GENIUS Act alignment enforcement |
| 50 | SegregatedCustody | `0x1Ba851cfB9B3e34D88BC0cbf5a0042F9eb1Af66b` | Segregated reserve custody |
| 51 | Liquidator | `0xF6518B363aB4D461D59E1c9A54De3B7f66Da5384` | Position liquidation engine |
| 52 | MarketOperations + LP Pool | `0x42E31Ac3A6aF2B2925a0B979A05156833b6660E4` / `0x266F6Cf7eA36d3f676eb292B274EAb25172790a2` | Peg stability and Camelot DEX liquidity |

#### Phase 4: Real Estate Lending & Governance (Contracts 53–62) — January 2026

**Real Estate Lending Fund:**

| # | Contract | Address | Function |
|---|---|---|---|
| 53 | RiskConfig V3 | `0xD9a53c691B688351283Fecc33D8D9AF964A9a078` | Fix & flip risk parameters with governance |
| 54 | LoanReceiptNFT | `0x6C4181A15EAC950A2504aC63ebE7F5A0999265e9` | ERC-721 loan receipt tokens |
| 55 | FixFlipVault V2 | `0xF4AcD4B7EaBfDA7E1b96D3abA1C6340557aa93E5` | ERC-4626 fix & flip lending vault |
| 56 | RepaymentRouter | `0x68fe7924c56c7B9D13F21B3a22Fe2B5bc59Ab9D5` | Loan repayment processing |
| 57 | FixFlipManager V3 | `0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958` | Loan origination with governance integration |
| 58 | ProductRegistry V3 | `0x31AD75DB98F142069ff30D6C7C206Ca4b5a10e5d` | Lending product catalog |
| 59 | DSCRRiskConfig V3 | `0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26` | DSCR rental loan risk parameters |
| 60 | DSCRLoanReceiptNFT | `0x66DB145A7ac0de369da88098E8F85467cFaD7674` | DSCR loan receipt tokens |
| 61 | DSCRPoolVault V2 | `0x5a09cb67518e6E28d8307D75174430939C044A7d` | ERC-4626 rental loan vault |
| 62 | DSCRRepaymentRouter | `0xa03e35afeE61c965522D88e778B356A2F2eF9Eab` | DSCR repayment processing |
| 63 | DSCRLoanManager V3 | `0x105117F1AD1B65a5d0C7F0E9A870683A06738E16` | DSCR loan origination |
| 64 | GovernanceHub | `0x52Dc85fd653a75323b5307f4D2629ab9A070530E` | Timelock governance with role-based access |

**Land Acquisition:**

| # | Contract | Address | Function |
|---|---|---|---|
| 65 | LandOptionRegistry | `0xCE0Df38260E626BA45628C4576254276B8C62A0D` | ERC-1155 tokenized land acquisition options |
| 66 | LandAcquisitionPool | `0x14162c6EE2BbcBC22Fd911c6f252807D186f5545` | Community pooling for land purchases |
| 67 | RegCFCrowdfunding | `0x02f967Ba52132E63272bbf8b01EF676605eA99d2` | SEC Reg CF compliant land crowdfunding |
| 68 | BuilderFarmerCredit | `0x814A9795bAbEE0DEd433d127dacD03031fB193b4` | Credit facility (Builder: 70% LTV / Farmer: 65% LTV) |

#### Phase 5: Euler Lending Markets & Node Economy — January–February 2026

**Euler V2 AXUSD Lending:**

| # | Contract | Address | Function |
|---|---|---|---|
| 69 | AXUSD Lending Vault V4 | `0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059` | 1M AXUSD supply/borrow cap |
| 70 | Vault Governor | `0xE742Ee9b946043ecc75bFc71B47216C1f8248316` | LTV, caps, and vault parameters |
| 71 | Price Oracle | `0x1045B6c70AC7b491bf724B5Aa4D89F542D955E15` | Decimal-corrected collateral pricing |

**Node Economy:**

| # | Contract | Address | Function |
|---|---|---|---|
| 72 | NodeRegistry | `0x31bc6268155219B627FC3B2d8434d010F33DCb03` | Node operator registration |
| 73 | NodeRewards | `0x0c1c96F38566d056877cEf4791c701C4F5AEf362` | Rewards distribution to operators |
| 74 | SlashingEngine | `0x1ae162B80cEfb82f9ccF25b5E7A45E5e133E6F87` | Slashing for misbehaving nodes |
| 75 | CapitalReadinessGate | `0xc3f798066e1401aa30Da8703A4c0588A1076ff39` | Capital requirements for node participation |

### 6.2 External Protocol Integrations

| Protocol | Address | Role |
|---|---|---|
| Camelot DEX Router | `0xc873fEcbd354f5A56E00E710B90EF4201db2448d` | AXUSD/AXM liquidity and swaps |
| Camelot DEX Factory | `0x6EcCab422D763aC031210895C81787E87B43A652` | Pair creation |
| USDC (Arbitrum) | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | Primary reserve asset |
| Euler EVC | `0x6302ef0F34100CDDFb5489fbcB6eE1AA95CD1066` | Euler Vault Connector |
| Euler EVK Factory | `0x78Df1CF5bf06a7f27f2ACc580B934238C1b80D50` | Vault deployment factory |
| Sovran Wealth Fund | `0x83E17aeB148d9b4b7Be0Be7C87dd73531a5a5738` | Treasury management |

---

## 7. Adaptive Metrics Engine (AME)

The AME is the deterministic financial computation engine at the heart of Axiom's solvency monitoring. Every calculation is a pure function — no randomness, no external dependencies at computation time, and fully reproducible given the same inputs.

### 7.1 Core Metrics (10 Measurements)

| Metric | Formula | Normal Range |
|---|---|---|
| Coverage Ratio (CR) | Treasury Liquid Assets / Net External Exposure | > 1.15 |
| Reserve Ratio (RR) | Designated Reserves / Circulating Exposure | > 0.10 |
| Liquidity Stability Ratio (LSR) | Redemption Capacity / Estimated Redemption Demand | > 1.00 |
| Redemption Stress Ratio (RSR) | Estimated Redemption Demand / Redemption Capacity | < 0.85 |
| Volatility Pressure Index (VPI) | Weighted composite (peg deviation 30%, liquidity depth 25%, redemption acceleration 25%, correlation spike 20%) | < 0.30 |
| Stability Score (SSS) | Composite 0–100 from CR, RR, LSR, RSR, VPI with weighted penalties | > 75 |
| Capital Adequacy | (Treasury Total + Reserves + Loss Buffer) / Net External Exposure | — |
| Loss Buffer Ratio (LBR) | Loss Buffer / Net External Exposure | — |
| Regime Band | STABLE (75+), CAUTION (50–74), STRESS (25–49), CRISIS (<25) | STABLE |
| Policy Mode | Deterministic from threshold breaches | NORMAL |

### 7.2 Policy Modes (6 States)

The protocol operates in exactly one policy mode at any time, determined by a priority-ordered threshold breach system:

| Mode | Trigger Conditions | Capital Routing |
|---|---|---|
| BOOTSTRAP | Explicit initialization flag | 40% Loss Buffer, 30% Reserves, 20% Stabilization, 10% Growth |
| NORMAL | CR ≥ 1.50 AND RR ≥ 0.25 | 20% Loss Buffer, 20% Reserves, 15% Stabilization, 25% Yield, 20% Growth |
| CAUTION | Thresholds met but below expansion | 25% Loss Buffer, 25% Reserves, 20% Stabilization, 20% Yield, 10% Growth |
| DEFENSIVE | RR < 0.10 OR VPI > 0.30 OR LSR < 1.00 | 35% Loss Buffer, 35% Reserves, 30% Stabilization, 0% Yield |
| RESTRICTED | CR < 1.15 OR RSR > 0.85 | 40% Loss Buffer, 30% Reserves, 30% Stabilization, 0% Yield |
| EMERGENCY | CR < 1.00 OR RR < 0.05 OR VPI > 0.55 | 100% Stabilization |

### 7.3 Hard Brake Circuit Breaker

An automatic circuit breaker that arms when any of these conditions are met:
- Coverage Ratio < 1.00 (defensive threshold)
- Liquidity Stability Ratio < 1.00 (floor threshold)
- Redemption Stress Ratio > 0.85 (run threshold)
- Volatility Pressure Index > 0.55 (shock threshold)

The hard brake releases only after 3 consecutive safe snapshots demonstrate sustained stability (configurable via `AME_BRAKE_RELEASE_CONSECUTIVE`).

### 7.4 Capital Flow Waterfall

All inflows are routed through a 5-bucket waterfall system that changes allocation percentages based on the current policy mode:

```
INFLOW → [LOSS_BUFFER] → [RESERVES] → [STABILIZATION] → [YIELD] → [GROWTH]
         ↑ Always first   ↑ Priority   ↑ Peg defense     ↑ Holders  ↑ Expansion
```

In EMERGENCY mode, 100% of all inflows are redirected to the STABILIZATION bucket. Yield and Growth buckets are only funded in NORMAL and CAUTION modes.

### 7.5 Yield Permission System

Yield distribution is governed by the Stability Modifier Factor (SMF):

```
SMF = (StabilityScore / 100) ^ exponent
MaxYieldPct = BaseRate × SMF
```

- EMERGENCY / RESTRICTED: Yield fully suspended (SMF = 0)
- DEFENSIVE: Yield limited by reduced SMF cap
- NORMAL / CAUTION: Yield permitted at stability-adjusted rate

### 7.6 Stress Testing Engine

Six deterministic shock scenarios are applied to current treasury state:

| Scenario | Treasury Drawdown | Reserve Drawdown | Liability Increase | Redemption Multiplier |
|---|---|---|---|---|
| Market Correction | 15% | 5% | 0% | 1.3x |
| Liquidity Crisis | 20% | 10% | 5% | 2.5x |
| Black Swan | 50% | 30% | 10% | 3.0x |
| Reserve Asset Depeg | 10% | 15% | 15% | 2.0x |
| Governance Attack | 25% | 0% | 30% | 1.8x |
| Redemption Run | 10% | 20% | 0% | 4.0x |

Each scenario produces a full projectedMetrics result including: post-shock policy mode, hard brake status, threshold breaches, and regime band change.

---

## 8. AI Oracle Interpretation Layer

The AME AI Oracle is powered by Google Gemini and provides institutional-grade interpretation of deterministic metrics. The oracle operates under strict constraints:

**Rules:**
1. Never makes predictions or promises about future outcomes
2. Never recommends specific capital actions — it interprets, it does not direct
3. Uses institutional vocabulary ("automated control layers" not "smart contracts")
4. All statements are interpretive observations, not investment advice
5. Clearly labels uncertainty — if data is missing or degraded, it says so
6. Frames tradeoffs explicitly

**Five Query Types:**
| Type | Purpose |
|---|---|
| `regime_narration` | Narrative interpretation of current policy mode and stability state |
| `stress_recommendation` | Interpretation of stress test projections and breach patterns |
| `tradeoff_analysis` | Analysis of capital allocation tradeoffs under current regime |
| `audit_summary` | Summary of enforcement events, mode changes, and brake activations |
| `full_briefing` | Comprehensive briefing combining all four analyses |

The Oracle outputs are clearly labeled as AI-generated interpretation in all user-facing interfaces.

---

## 9. AXUSD Stablecoin Architecture

### 9.1 Dual Ecosystem Segregation

AXUSD operates as two fully independent stablecoin ecosystems that never mix reserves, custody, or compliance logic:

**Primary (GENIUS Act Aligned):**
- Designed to align with GENIUS Act framework (Public Law 119-27)
- 100% reserve backing requirement
- T-Bill vault for treasury bill denominated reserves
- Segregated custody with dedicated USDC and ETH backstop vaults
- Separate PSM, rate limiter, and oracle adapter
- GeniusCompliance contract for alignment enforcement

**Euler Original:**
- CDP-style minting against collateral
- Flexible collateral types via VaultEngine
- BackstopVault with 24h timelock for emergency withdrawals
- Independent PSM with 0.1% fee and 500K debt ceiling
- Integration with Euler V2 lending markets

### 9.2 PSM (Peg Stability Module)

Both ecosystems maintain independent PSMs for 1:1 USDC conversion:
- GENIUS PSM: `0x5db58d9c21369d1532a48Bdd658E4Fe415404922`
- Euler PSM: `0x4584888cB411E9cc88e3800BAB73A430D90d3793`

### 9.3 Revenue Flow

```
Protocol Revenue
    ├── SEED Yield Distributor → Weekly distribution to SEED lockers
    ├── Treasury Backstop → Emergency reserves
    └── Revenue Router → Governance-directed allocation
```

---

## 10. MIRDT (Market Intelligence & Risk Disclosure Terminal)

### 10.1 Architecture

The MIRDT is a probabilistic trend-following analysis terminal with full audit trail. It operates exclusively in paper trading mode with human confirmation gates at every decision point.

**Pipeline Stages:**
1. Price fetching (Alpha Vantage for equities, CoinGecko for digital assets)
2. Direction inference (trend analysis)
3. Liquidity and regime classification
4. Grade computation (probabilistic scoring)
5. Eligibility checks
6. Position sizing
7. Entry trigger classification
8. Decision storage with full trace

### 10.2 Execution Model

The MIRDT Execution Engine processes market intelligence setups through a deterministic pipeline that produces paper trade decisions. Every decision is stored with a complete audit trace including:
- Input signals and source data
- Computed grades and eligibility flags
- Position sizing rationale
- Entry trigger classification
- Full timestamp chain

### 10.3 Lexicon Guard

MIRDT content passes through a Lexicon Guard that enforces institutional vocabulary:
- "Automated control layers" (not "smart contracts")
- "Multi-party authorization" (not "multi-sig")
- "On-chain financial rails" (not "DeFi")
- "Asset onboarding and issuance" (not "tokenization")
- "Participation lockup" (not "staking")

---

## 11. Axiom Sentinel

Sentinel is the unified capital decision and risk authorization layer across all Axiom products. It converts MIRDT market intelligence signals into cryptographically auditable authorized capital actions.

### 11.1 Architecture

- Control Plane: In-app Next.js service
- Trigger Model: Manual API triggers with human gates
- Data Store: Drizzle + PostgreSQL
- Gating: Mixed on-chain/off-chain authorization
- Audit: Append-only database with hash chain

### 11.2 Risk Constraints

Sentinel enforces risk constraints including position limits, exposure caps, concentration limits, and regime-based restrictions. All authorizations are logged with full trace data.

### 11.3 API Endpoints

| Endpoint | Function |
|---|---|
| `/api/sentinel/overview` | System overview and health |
| `/api/sentinel/authorize` | Authorization request processing |
| `/api/sentinel/authorize-action` | Action-level authorization |
| `/api/sentinel/decisions` | Decision history and audit |
| `/api/sentinel/signals` | Signal intake |
| `/api/sentinel/health` | System health check |
| `/api/sentinel/audit` | Full audit trail |
| `/api/sentinel/qualify` | Participant qualification |
| `/api/sentinel/allocate` | Capital allocation requests |
| `/api/sentinel/regimes` | Regime state management |
| `/api/sentinel/run-signals` | Signal processing runs |

---

## 12. The Wealth Practice (Community Group Economics)

### 12.1 Trust Pipeline

The Wealth Practice implements a three-stage trust pipeline for community capital formation:

```
Interest Hub → Purpose Group → On-Chain Pool
(Discovery)    (Commitment)    (Execution)
```

**Stage 1 — Interest Hub:** City and interest-based discovery groups (10 seeded hubs: Atlanta, Houston, DMV, Chicago, Charlotte, Detroit, Jackson MS, Memphis, National Land Stewardship, National Food Security).

**Stage 2 — Purpose Group:** Committed participant groups with defined savings goals, schedules, and accountability structures.

**Stage 3 — On-Chain Pool:** Executed on-chain via `AxiomSusuHub` (pooled custody) or `SusuPersonalVault` (self-custody), with capital flow bridges connecting to land acquisition.

### 12.2 Institutional Definition

A programmable group savings framework with deterministic scheduling, participant-level transparency, and cryptographic audit trails. Designed to support disciplined capital formation within community-governed parameters. Not an investment product. Not a yield claim. Not FDIC insured.

### 12.3 Capital Flow Bridge

The Wealth Practice connects to the Physical Asset Pipeline through participation credits:
```
Wealth Practice Groups → Capital Flow Bridge → Land Acquisition Pools
                          ↓
                    Produce Cycles → Community Distribution
```

---

## 13. Physical Asset Pipeline (Land Acquisition)

### 13.1 Lifecycle Stages

```
Submission → Due Diligence → Community Vote → Funding → Acquired → Activated
```

### 13.2 Smart Contract Infrastructure

- **LandOptionRegistry (ERC-1155):** Tokenized land acquisition options
- **LandAcquisitionPool:** Community pooling with savings-circle-style contributions
- **RegCFCrowdfunding:** SEC Reg CF compliant crowdfunding campaigns
- **BuilderFarmerCredit:** Tiered credit facility
  - Builder: 70% LTV, 12% APR, 24-month maximum
  - Farmer: 65% LTV, 10% APR, 36-month maximum

### 13.3 Produce & Housing Pipeline

Acquired land flows into two community programs:
1. **Produce:** Food production infrastructure with reservation-based community distribution
2. **Housing:** Rent-to-own pathways via the KeyGrow Payment Module (AXUSD-denominated escrow with buy-down credits)

---

## 14. Real Estate Lending Fund

### 14.1 Product Lines

**Fix & Flip Bridge Loans:**
- ERC-4626 vault for capital pooling (`FixFlipVault V2`)
- ERC-721 loan receipts for position tracking
- Governance-controlled risk parameters via GovernanceHub
- RepaymentRouter for structured loan servicing

**DSCR Rental Loans:**
- Dedicated ERC-4626 pool vault (`DSCRPoolVault V2`)
- DSCR-specific risk configuration with governance
- Separate loan receipt NFTs and repayment routing
- Designed for debt service coverage ratio underwriting

### 14.2 Governance Integration

The GovernanceHub (`0x52Dc85fd653a75323b5307f4D2629ab9A070530E`) provides:
- Timelock-based governance with 24-hour minimum delay
- Role-based access: RISK_COMMITTEE_ROLE, SETTLEMENT_AUTHORITY_ROLE, GUARDIAN_ROLE
- Emergency pause capability
- On-chain action queue for parameter changes

---

## 15. DePIN Node Economy

### 15.1 Architecture

The DePIN (Decentralized Physical Infrastructure Network) subsystem enables:
- **Node Sales:** ETH payment (full price) or AXM payment (15% discount)
- **Node Registry:** On-chain registration and operator management
- **Rewards Distribution:** Revenue distribution to node operators
- **Slashing Engine:** Penalty system for underperforming or malicious nodes
- **Capital Readiness Gate:** Minimum capital requirements for participation

### 15.2 DeNet Integration

Decentralized storage infrastructure via DeNet Datakeeper Node, with dashboard monitoring for node status and storage metrics.

### 15.3 Revenue Flow

```
Node Operations Revenue
    ├── 95% → Node Operators (rewards)
    └──  5% → SusuInsuranceFund (default protection)
```

---

## 16. Euler V2 Lending Markets

### 16.1 AXUSD Lending Vault

- Contract: `0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059` (V4)
- Supply/Borrow Cap: 1M AXUSD each
- Fee Receiver: Revenue Router
- Accepted Collateral: USDC, USDT, WETH, ARB (via existing Euler vaults)

### 16.2 Architecture

Vault-to-vault collateral model using Euler's EVC (Ethereum Vault Connector):
- Users deposit AXUSD to earn yield
- Borrowers use vault shares as cross-collateral
- Vault Governor manages LTV ratios, caps, and parameters
- Decimal-corrected price oracle for accurate collateral valuation

---

## 17. Observer Dashboard

The Institutional Observer Dashboard provides comprehensive monitoring across:

| Tab | Function | API |
|---|---|---|
| Overview | System-wide metrics and health | `/api/observer/overview` |
| Treasury | Treasury composition and flows | `/api/observer/treasury` |
| Assets | Asset registry and valuations | `/api/observer/assets` |
| Risk | Risk metrics and exposure analysis | `/api/observer/risk` |
| Governance | Proposal tracking and voting | `/api/observer/governance` |
| Node Economy | DePIN node metrics and rewards | `/api/observer/node-economy` |
| Capital Bridge | Physical-digital capital flows | `/api/observer/capital-bridge` |
| Reports | Exportable institutional reports | `/api/observer/reports` |

---

## 18. Solvency & Reserve Transparency

### 18.1 Three-Mode Console

The `/solvency` page provides an institutional solvency console with three viewing modes:

| Mode | Audience | Focus |
|---|---|---|
| Allocator | Institutional investors | Capital adequacy, coverage ratios, stress projections |
| Clearinghouse | Settlement counterparties | Liquidity depth, redemption capacity, peg stability |
| Regulatory | Compliance reviewers | Policy mode history, enforcement events, audit trails |

### 18.2 Snapshot System

- Database-backed snapshots capture full treasury state at each measurement
- Snapshot ID and timestamp displayed on disclosure page
- Historical trend tracking with export capability
- Auto-ingestion pipeline for continuous monitoring

### 18.3 Disclosure Page

The `/disclosure` page serves as the comprehensive institutional disclosure document:
- Fetches canonical snapshot from `/api/solvency/latest`
- Derives all headline numbers from single snapshot (no mixing)
- Definitions section with formulas for CR, RR, LBR, LD
- Dual AXUSD ecosystem non-mixing rule prominently stated
- Operational status segmented: Live / Configured-Inactive / Planned

---

## 19. Compliance & Language Governance

### 19.1 Glossary Enforcement

The canonical glossary (`lib/glossary.ts`) defines:
- Approved terms with institutional definitions
- Forbidden phrases (96+ patterns)
- Safe replacement patterns
- Maturity stage labels: LIVE, STAGED, BOOTSTRAP, PLANNED, CONFIGURED_INACTIVE

### 19.2 Institutional Vocabulary

| Colloquial Term | Approved Replacement |
|---|---|
| Smart contracts | Automated control layers |
| Multi-sig | Multi-party authorization |
| DeFi | On-chain financial rails |
| Tokenization | Asset onboarding and issuance |
| Staking | Participation lockup |
| SUSU/Savings Circle | The Wealth Practice |

### 19.3 Forbidden Patterns

The system enforces prohibition of:
- Absolutist positioning ("only platform", "sole platform")
- Unqualified physical asset claims
- Wealth outcome promises ("guaranteed returns", "APY" as a claim)
- Unqualified GENIUS Act compliance claims (must say "designed to align with")
- Forbidden characters in body copy (no asterisks or hashtags)

---

## 20. Founder Operations

### 20.1 Dashboard

The Founder Operations Dashboard (`/founder-ops`) is an internal command center with:

**4 Tabs:**
1. System Overview — protocol health and key metrics
2. Capital Allocation — treasury distribution and waterfall routing
3. Risk Checkpoints — threshold monitoring and breach alerts
4. Operations Log — append-only activity log

### 20.2 PSM Operations Console

Interactive console for PSM mint/redeem execution with:
- Pre-flight checks before any operation
- Automatic transaction logging
- Fee plumbing configuration
- Real-time PSM status monitoring

### 20.3 Guard Rails (6 Mandatory)

All operations pass through 6 mandatory guard rails enforced at the system level before capital movement is authorized.

---

## 21. Capital Program

### 21.1 Structure

$1M dual-asset capital program for physical asset acquisition:
- Treasury Allocation Policy: 35% / 35% / 20% / 10%
- Target: 20–30 qualified participants
- Execution: 52-week operational playbook at $100/week

### 21.2 Pilot Fund Dashboard

The `/pilot` dashboard provides:
- Investor management and accreditation tracking
- Capital call processing with per-investor tracking
- Distribution management
- SPV (Special Purpose Vehicle) structure
- Performance reporting and projections
- Document management
- Audit trail

---

## 22. Data Architecture

### 22.1 Database

- Engine: PostgreSQL (Neon-backed)
- ORM: Drizzle
- Schema: 9,205 lines defining 339 tables
- Enums: 50+ typed enums for status, role, and classification fields

### 22.2 Key Table Groups

| Domain | Example Tables | Count |
|---|---|---|
| Users & Identity | users, user_wallets, kyc_verifications, wallet_auth_nonces | ~25 |
| DePIN Infrastructure | depin_nodes, depin_events, depin_leases, depin_revenue_distributions | ~10 |
| Real Estate | properties, keygrow_progress, land_candidates, land_acquisition_pools | ~30 |
| Financial & Treasury | treasuries, treasury_transactions, ledger_entries, yield_vault_positions | ~20 |
| AXUSD Stablecoin | axusd_snapshots, axusd_alerts, axusd_trading_pools, axusd_bridge_transactions | ~10 |
| Wealth Practice (SUSU) | susu_interest_hubs, susu_purpose_groups, susu_group_members, susu_analytics_events | ~15 |
| AME & Solvency | ame_policy_state, ame_enforcement_event, ame_data_snapshot, ame_stress_run | ~10 |
| Governance | governance_proposals, governance_votes, admin_proposals, token_holder_proposals | ~10 |
| MIRDT & Sentinel | mirdt_setups, sentinel_decisions, sentinel_signals | ~10 |
| Compliance | compliance_events, compliance_claims, compliance_disclosures, compliance_audit_logs | ~10 |
| Learning & Community | courses, lessons, certificates, learning_paths, achievements | ~20 |
| Lending Fund | dscr_applications, dscr_borrowers, fund_subscriptions, investor_commitments | ~15 |
| Node Economy | node_economy tables (via shared schema) | ~5 |

### 22.3 Service Layer

| Service | File | Function |
|---|---|---|
| ContractsService | `lib/services/ContractsService.ts` | On-chain contract interaction via Sovran Wealth Fund |
| AXUSDTransactionService | `lib/services/AXUSDTransactionService.ts` | PSM operations, supply tracking, pool data |
| CamelotPoolService | `lib/services/CamelotPoolService.ts` | DEX liquidity and price data from Camelot |
| SusuService | `lib/services/SusuService.ts` | Wealth Practice group management |
| DelegationService | `lib/services/DelegationService.ts` | MetaMask delegation toolkit |
| PolicyGuardService | `lib/services/PolicyGuardService.ts` | Policy enforcement layer |
| PropertyDataService | `lib/services/PropertyDataService.ts` | Real estate data (ATTOM, RentCast, Walk Score) |
| SIWEService | `lib/services/SIWEService.ts` | Sign-In with Ethereum authentication |
| WalletService | `lib/services/WalletService.ts` | Wallet connectivity and management |

---

## 23. Security & Audit

### 23.1 Audit Summary

147 findings identified and remediated across the full codebase:
- 6 CRITICAL (timing attacks, error handling, SQL injection)
- 34 HIGH (silent errors, compliance terms, design violations)
- 76 MEDIUM
- 31 LOW

### 23.2 Security Architecture

- **Authentication:** SIWE (Sign-In with Ethereum) with nonce rotation and session management
- **Authorization:** Role-based access with multi-party authorization for sensitive operations
- **Rate Limiting:** Per-endpoint rate limiting on all API routes
- **Input Validation:** Zod schema validation on all API inputs
- **SQL Safety:** Drizzle ORM parameterized queries (no raw SQL injection vectors)
- **Secret Management:** Environment-based secret injection, never committed to repository
- **Smart Contract Security:** V2/V3 upgrades on security-critical contracts (LeaseAndRentEngine, DePINNodeSuite, FixFlipVault, DSCRPoolVault)

---

## 24. Design System (Design Law)

### 24.1 Principles

The Axiom Protocol Design Law mandates:
- **Typography:** Serif headings, monospace for data values
- **Palette:** Navy, forest green, muted gold — light mode only
- **Layout:** `max-w-7xl mx-auto px-6 py-8`, flat solid buttons
- **Prohibited:** Gradients, shadows, animations, rounded corners
- **Branding:** "AXIOM" with golden circular token logo, tagline "Build Wealth Together, On-Chain"

### 24.2 Component Library

142 components organized under the Design Law system:
- `DesignLawLayout` — Page wrapper with nav, footer, container
- `DesignLawHome` — Landing page composition
- `DisclosureBlock` — Standardized disclosure callouts
- `DataTable` — Institutional-grade data display
- `DetailGrid` — Key-value metric grids
- `AuditHeader` — Audit trail headers
- `ConnectWalletButton` — MetaMask integration

---

## 25. Deployment & Infrastructure

### 25.1 Application Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (Pages Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL (Neon) |
| ORM | Drizzle |
| Cache | Redis (ioredis) |
| Blockchain | Arbitrum One via Alchemy |
| Web3 | ethers.js, viem, MetaMask SDK |
| AI | Google Gemini (via Replit Integrations) |
| Email | Resend |
| Payments | Stripe |
| Storage | Google Cloud Storage, Storacha (IPFS) |
| Charts | Recharts, Chart.js, Lightweight Charts |
| Auth | SIWE, Supabase |
| Multi-sig | Safe Protocol SDK |

### 25.2 Deployment Configuration

- Target: Autoscale deployment
- Build: `next build` (standalone output)
- Start: `node .next/standalone/server.js`
- Port: 5000 (development), standard HTTPS (production)

---

## 26. Operational Roadmap

### 26.1 52-Week Playbook

The protocol executes a structured 52-week operational playbook at $100/week to:
1. Validate all 72+ deployed smart contracts through live operations
2. Build treasury position through disciplined weekly contributions
3. Grow community participation through the Wealth Practice pipeline
4. Advance land acquisition candidates through the lifecycle pipeline
5. Establish institutional reporting cadence

### 26.2 Maturity Status

| Product | Status |
|---|---|
| AXM Token | LIVE |
| AXUSD Stablecoin (Dual) | LIVE |
| Solvency Console | LIVE |
| Adaptive Metrics Engine (AME) | LIVE |
| MIRDT | LIVE |
| Axiom Sentinel | LIVE |
| Wealth Practice | STAGED |
| Physical Asset Pipeline | PLANNED |
| Axiom Protocol (overall) | BOOTSTRAP |

---

## 27. Risk Disclosures

This document is for informational purposes only and does not constitute an offer to sell, a solicitation of an offer to buy, or a recommendation of any security, investment product, or investment strategy. Participation in the Axiom Protocol involves significant risks including but not limited to:

- Smart contract risk (automated control layers may contain undiscovered vulnerabilities)
- Market risk (digital asset valuations are highly volatile)
- Regulatory risk (framework alignment does not guarantee compliance with future legislation)
- Liquidity risk (redemption capacity may be insufficient during stress events)
- Operational risk (system downtime, oracle failures, or governance attacks)
- Physical asset risk (land acquisition targets are subject to market conditions, regulatory requirements, and governance approval)

The Axiom Protocol is not a bank, broker-dealer, or registered investment advisor. Tokens and stablecoins issued by the protocol are not FDIC insured. Variable rates are subject to change based on market conditions and protocol policy mode. The GENIUS Act alignment designation means "designed to align with" the framework — it does not constitute a claim of regulatory compliance.

---

**Document Hash:** This document reflects the Axiom Protocol codebase as of February 19, 2026.
**Contract Explorer:** https://arbitrum.blockscout.com
**Deployer:** 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96
**Network:** Arbitrum One (Chain ID: 42161)
