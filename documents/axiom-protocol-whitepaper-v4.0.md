# Axiom Protocol
## Institutional White Paper v4.0

---

## Table of Contents

1. [Cover & Classification](#1-cover--classification)
2. [Executive Summary](#2-executive-summary)
3. [System Architecture](#3-system-architecture)
4. [Token Ecosystem](#4-token-ecosystem)
5. [Reserve and Solvency Framework](#5-reserve-and-solvency-framework)
6. [Real Asset Infrastructure](#6-real-asset-infrastructure)
7. [Intelligence Layer](#7-intelligence-layer)
8. [Banking and Custody Infrastructure](#8-banking-and-custody-infrastructure)
9. [Community Infrastructure](#9-community-infrastructure)
10. [Capital Formation and Syndication](#10-capital-formation-and-syndication)
11. [DePIN Infrastructure](#11-depin-infrastructure)
12. [Governance Framework](#12-governance-framework)
13. [Regulatory and Institutional Context — IMF Structural Shift Analysis](#13-regulatory-and-institutional-context--imf-structural-shift-analysis)
14. [Risk Framework](#14-risk-framework)
15. [Proof of Execution and Key Milestones](#15-proof-of-execution-and-key-milestones)
16. [Forward Roadmap](#16-forward-roadmap)
17. [Disclosures](#17-disclosures)
18. [Appendix A — Deployed Contract Registry](#appendix-a--deployed-contract-registry)
19. [Appendix B — Glossary of Approved Terms](#appendix-b--glossary-of-approved-terms)

---

## 1. Cover & Classification

| Field | Value |
|---|---|
| Document Title | Axiom Protocol Institutional White Paper v4.0 |
| Document Classification | Institutional Disclosure — Not Investment Advice |
| Version | 4.0 |
| Date | April 3, 2026 |
| Issuer | Axiom Nexus LLC |
| Network | Arbitrum One (Chain ID: 42161) |
| Document Status | Canonical Reference |
| Supersedes | v2.0 (March 31, 2026), v3.0 (March 23, 2026), v1.1 (March 30, 2026) |
| Explorer | https://arbitrum.blockscout.com |
| Disclosure | axiomprotocol.app/disclosure |
| Solvency | axiomprotocol.app/solvency |

> This document is provided for informational purposes only and does not constitute an offer to sell or a solicitation of an offer to buy any security or financial instrument. All on-chain references are independently verifiable on Arbitrum One. All rates are variable. No returns are guaranteed. Performance and reserve data cited herein reflect the state of the protocol as of the date above and are subject to change. This document is not legal or investment advice.

---

## 2. Executive Summary

### 2.1 Mission

Axiom Protocol is governance-first wealth infrastructure designed to build a sovereign digital-physical economy. Its founding thesis: that the structural shift in financial architecture now underway — from closed institutional systems to programmable, compliance-embedded, on-chain financial rails — creates the infrastructure moment for communities and individuals to build wealth at the same layer as institutions.

Axiom is not a prediction market, a speculative yield instrument, or an unregulated liquidity protocol. It is a multi-layer protocol for wealth accumulation, asset registration, community finance, and institutional-grade governance — all on verifiable, publicly auditable automated control layers deployed on Arbitrum One.

### 2.2 What Axiom Is — and What It Is Not

| Axiom Is | Axiom Is Not |
|---|---|
| Governance-first wealth infrastructure | A bank or broker-dealer |
| A multi-token protocol (AXM, AXUSD, AXAU) | A guarantee of returns |
| An ERC-3643 compliance framework | An unregulated speculative protocol |
| A land acquisition and real asset pipeline | A claim of current real estate ownership |
| A community savings coordination system | An investment fund |
| An institutional solvency disclosure system | FDIC insured |
| A structured reference architecture | The exclusive platform of its type |

### 2.3 Platform Scale — April 2026

| Metric | Value |
|---|---|
| Automated Control Layers Deployed | 84 |
| Verified on Arbitrum Blockscout | 84 |
| Application Pages | 55 |
| API Endpoints | 133 |
| Database Tables | 339 |
| Production Networks | Arbitrum One |
| Banking Rails | Increase.com (FDIC-insured) |
| Crypto Custody Rails | BitGo CaaS |
| AXAU Genesis Mint | April 2, 2026 — 0.0013 PAXG → 5.789977 AXAU |

### 2.4 Core Differentiators

- **Governance First** — Every token, reserve component, agent action, and parameter change is subject to documented governance authority before deployment
- **Compliance Embedded at Transfer Layer** — ERC-3643 identity verification executes on every transfer, not at the application layer
- **Reserve Transparency** — Three-mode Solvency Console with publicly queryable reserve snapshots
- **Physical-Digital Bridge** — Full operational stack for bringing land onto on-chain rails, from deal sourcing through title and reserve integration
- **Community Access** — Wealth Practice, Capital Program, and Academy provide community-layer access to the same infrastructure used by institutional participants

---

## 3. System Architecture

### 3.1 Six-Layer Protocol Stack

| Layer | Components |
|---|---|
| Layer 1 — Presentation | Next.js application · 55 pages · Mobile-optimized · Design Law system |
| Layer 2 — API | 133 REST endpoints · Next.js API routes · Auth0 + SIWE authentication |
| Layer 3 — Intelligence | AME (Adaptive Metrics Engine) · MIRDT Capital Terminal · Axiom Sentinel · AI Oracle (Gemini) |
| Layer 4 — Data | PostgreSQL (339 tables) · Drizzle ORM · MongoDB analytics · Google Cloud Storage |
| Layer 5 — Banking & Custody | Increase.com (FDIC-insured fiat rails) · BitGo CaaS (institutional crypto custody) |
| Layer 6 — Blockchain | Arbitrum One · 84 automated control layers · ERC-3643 identity stack · Chainlink oracles |

### 3.2 Technology Layers

| Category | Technology |
|---|---|
| Frontend | Next.js · React · Tailwind CSS · Wagmi v2 · Reown AppKit |
| Authentication | Auth0 v3 · SIWE (Sign-In with Ethereum) · ERC-3643 identity |
| Blockchain | Arbitrum One · Ethers.js · viem · Alchemy RPC |
| Database | PostgreSQL (Neon) · Drizzle ORM · MongoDB |
| AI / Intelligence | Gemini AI · AME deterministic computation engine |
| Banking | Increase.com REST API · First Internet Bank |
| Custody | BitGo CaaS REST API |
| Storage | Google Cloud Storage · Storacha (IPFS/Web3) |
| Property Data | RentCast API · Walk Score API · Alpha Vantage |
| Email | Resend |
| Payments | Stripe |

---

## 4. Token Ecosystem

### 4.1 AXM — Governance Token

| Property | Value |
|---|---|
| Standard | ERC-20 |
| Contract | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` |
| Network | Arbitrum One |
| Role | Governance · Fee routing · SEED vote-escrow |
| Minting | Governance-controlled (AXM Admin Safe) |
| Status | Live |

AXM is the protocol governance token. It does not constitute a security interest or guarantee any financial return. AXM holders may participate in governance votes subject to the bootstrap phase transition schedule. The SEED program enables AXM holders to lock tokens for 1–4 year periods in exchange for enhanced governance weight.

**On-Chain Financial Rails:**
- AXM/AXUSD EulerSwap Pool: `0x981763699D269E129a08E216b1AeC7caa376A8a8` (10,000 AXM / 9,000 AXUSD seeded March 28, 2026)
- eAXM-1 (ERC-4626 supply vault): `0x8e28ffa89d168599156004db4f4d12c2af7c250e`

### 4.2 Unified AXUSD — Protocol Stablecoin

| Property | Value |
|---|---|
| Standard | ERC-3643 (T-REX) |
| Contract | `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` |
| Network | Arbitrum One |
| Target Peg | 1.00 USD |
| Phase 1 Reserve | USDC (Circle) |
| PSM Contract | `0xDB669bb6cA07215C5B055B62072AAED2F821E53F` |
| Status | Live |

Unified AXUSD is the protocol stablecoin. All previous AXUSD generations (GENIUS AXUSD, Euler AXUSD) are deprecated. AXUSD is not FDIC insured. It is not a bank deposit. Redemption is subject to reserve availability. AXUSD transfers are gated by the ERC-3643 identity layer — only verified wallets can send or receive.

**PSM Mechanics:**
- Mint: 1 USDC + protocol fee (configurable) → 1 AXUSD
- Redeem: 1 AXUSD → 1 USDC (minus protocol fee)
- Ceiling: Governance-controlled mint ceiling
- Fee Sweep: Governance Safe receives accumulated PSM fees

**Euler V2 Integration:**
| Contract | Address | Type | Status |
|---|---|---|---|
| eAXUSD-6 | `0xacdA87801f6409bB5157BA78aF1BD9631d6609B2` | ERC-4626 lend/borrow | Live |
| Euler Earn Vault | `0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B` | AXUSD yield | Live |
| USDC/AXUSD EulerSwap | `0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8` | AMM Pool | Configured |

### 4.3 AXAU — Gold Reserve Instrument

AXAU is a gold-anchored reserve instrument backed by PAXG (Paxos Gold) in Phase 1. AXAU is not a stablecoin — its USD value will fluctuate with gold market prices. AXAU uses a subset of the ERC-3643 (T-REX) compliance standard. All mint, redeem, and transfer operations are subject to identity verification.

For the full AXAU technical specification, see `documents/axau-whitepaper.md`.

**Genesis Mint Record:**
| Field | Value |
|---|---|
| Date | April 2, 2026 |
| Input | 0.0013 PAXG |
| Output | 5.789977 AXAU |
| Transaction | `0x73479447...` |
| Block | 448396754 (Arbitrum One) |
| Preceding Action | haircutBps set 500 → 0 (TX: `0x115d2b7d...`) |

**AXAU Core Contracts:**
| Contract | Address | Role |
|---|---|---|
| AXAUTokenLite3643 | `0xbcCA4D937d427829914498423aE6E04C846dB0Bb` | ERC-3643 AXAU token |
| CommodityRegistry | `0x6D3aAa92793503B40b3F3593d2fCc409Ca610bDa` | Reserve component registry |
| AXGoldVault | `0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8` | PAXG reserve vault |
| NAVEngine | `0x80F8634a43B26a2bd403396A42465F138aeCC519` | NAV computation |
| MintRedeemController | `0x036F05a3fB74d35439c074f25F691b36f5D37792` | Mint/redeem gateway |
| AXLandVault | `0x66Aadce66a359609ec5E18fb3d8927a2363449cf` | Land reserve vault (inactive) |
| LandNAVOracleMultiSig | `0x8FF5D66d4be4C107362e63f8E9E8283E8c5EA0Fc` | Land appraisal oracle (inactive) |

### 4.4 Deprecated Tokens

| Token | Address | Status |
|---|---|---|
| GENIUS AXUSD | `0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C` | Deprecated — No new activity |
| Euler AXUSD | `0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c` | Deprecated — No new activity |
| Legacy GENIUS PSM | `0x5db58d9c21369d1532a48Bdd658E4Fe415404922` | Configured-Inactive |

---

## 5. Reserve and Solvency Framework

### 5.1 AXUSD Reserve Hierarchy

| Priority | Asset | Role |
|---|---|---|
| 1 | USDC | Primary operating reserve (PSM backing) |
| 2 | PAXG | Secondary commodity reserve |
| 3 | WETH | Tertiary liquidity reserve |
| 4 | AXM | Governance token reserve (last resort) |

### 5.2 Core Solvency Metrics

| Metric | Formula | Purpose |
|---|---|---|
| Reserve Ratio (RR) | Total Reserves / Total AXUSD Supply | Fundamental coverage indicator |
| Coverage Ratio (CR) | Weighted Reserve Value / Circulating Supply | Risk-adjusted adequacy |
| Liquidity Buffer Ratio (LBR) | Liquid Reserves / 30-Day Average Redemption Volume | Short-term redemption capacity |

**Policy Threshold Table:**

| Mode | CR Threshold | Policy Response |
|---|---|---|
| Optimal | ≥ 150% | Normal operations · Full PSM capacity |
| Adequate | ≥ 120% | Monitoring mode · Governance notified |
| Caution | ≥ 105% | Ceiling tightened · Governance review required |
| Alert | ≥ 100% | Emergency protocol · Governance action required |
| Hard Brake | < 100% | All minting halted · Redemption only |

### 5.3 Adaptive Metrics Engine (AME)

The AME is the deterministic financial computation layer of Axiom Protocol. Unlike probabilistic or AI-driven systems, AME produces deterministic outputs from defined inputs — every metric is a reproducible mathematical function of on-chain and off-chain inputs. AME governs:

- Regime classification (Optimal, Adequate, Caution, Alert, Hard Brake)
- Adaptive target computation (policy multipliers applied to CR targets)
- Emergency circuit breaker activation
- Reserve policy recommendations

AME's Hard Brake circuit breaker activates automatically when coverage falls below defined thresholds, pausing new capital deployment and triggering governance notification. This circuit breaker is fully automated — it does not depend on any off-chain action to engage.

### 5.4 Three-Mode Solvency Console

The Solvency Console at `axiomprotocol.app/solvency` provides three views of protocol reserves:

| Mode | Audience | Data Provided |
|---|---|---|
| Public | Open access | Reserve ratio, coverage ratio, policy mode |
| Institutional | Verified participants | Full snapshot with component breakdown |
| Audit | Governance / Compliance | Full snapshot with on-chain proof links |

### 5.5 AXAU Coverage Mechanics

AXAU maintains a hard 105% minimum coverage floor enforced by the MintRedeemController. The coverage ratio is computed in real-time using Chainlink XAU/USD oracle data. If coverage falls below 105%, the MintRedeemController automatically halts new minting. Key parameter: `haircutBps = 0` for PAXG (Phase 1), meaning no discount is applied to gold backing.

---

## 6. Real Asset Infrastructure

### 6.1 Land Acquisition Pipeline

The land acquisition pipeline is Axiom Protocol's operational system for sourcing, underwriting, governing, and onboarding physical land assets onto on-chain rails. The pipeline operates across seven stages:

| Stage | Name | Description |
|---|---|---|
| 1 | Deal Sourcing | Distressed property feed, MLS integration, agent network |
| 2 | Preliminary Analysis | Property Analysis Tool + RentCast API screening |
| 3 | Deal Intelligence | 8-strategy underwriting model + IVCEE capital readiness |
| 4 | Governance Submission | On-chain governance vote for acquisition authorization |
| 5 | Due Diligence | DD Checklist System + Craftsman cost database |
| 6 | Field Inspection | Field Capture System — GPS-tagged walkthrough documentation |
| 7 | Title and Reserve Integration | Legal title onboarding + AXLandVault registration |

### 6.2 Lending Fund

The Axiom Lending Fund is a fixed-term real estate lending facility structured under SEC Regulation D 506(c). Participation is restricted to accredited investors as defined by applicable law. The fund provides short-term financing for real estate acquisition and rehabilitation operations.

| Property | Value |
|---|---|
| Structure | SEC Regulation D 506(c) |
| Access | Lane A (accredited investors only) |
| Vault | ERC-4626 standard |
| Loan Receipt | ERC-721 NFT |
| Status | Infrastructure deployed; activation pending governance approval |

### 6.3 Property Analysis Tool

A pay-per-report property analysis system powered by RentCast API and Walk Score API. The tool provides:
- Rental comps and estimated rental income
- Walk Score / Transit Score / Bike Score
- Neighborhood data and market trend analysis
- Estimated property value range

### 6.4 Deal Intelligence

An eight-strategy underwriting system for real estate acquisitions. The Multi-Exit Strategy Engine produces modeled returns across: wholesale, fix-and-flip, long-term rental, short-term rental, house hack, BRRRR, seller finance, and new construction scenarios. The Craftsman Cost Database provides rehabilitation cost estimates grounded in the National Cost Estimator.

### 6.5 IVCEE — Underwriting Intelligence Engine

The Institutional Value Creation and Exit Execution Engine (IVCEE) is an allocator-grade underwriting intelligence system. It produces:
- Capital Readiness Card — scores deal viability against available funding sources
- AI Acquisition Memo — Gemini-powered institutional memo generator
- Full due diligence checklist with stage-gated completion tracking

### 6.6 Field Capture System

The Field Capture System is a mobile-first walkthrough platform that enables property inspectors to document physical condition, identify deficiencies, and generate structured inspection records with GPS coordinates and photo documentation. All field data is written to the Field Intelligence database and accessible via the Founder Operations dashboard.

---

## 7. Intelligence Layer

### 7.1 Adaptive Metrics Engine (AME)

The AME is described in Section 5.3. In the Intelligence Layer context, it is the system that receives on-chain and off-chain inputs and produces deterministic regime classifications and adaptive target outputs that govern protocol parameters.

### 7.2 MIRDT — Capital Intelligence Terminal

The MIRDT (Macro Intelligence, Risk and Decision Terminal) is a nine-dimension advisory signal engine. It produces a Protocol Readiness Score (PRS) on a 0–10 scale, computed from:

| Dimension | Signal |
|---|---|
| 1. Market Regime | On-chain financial rails market conditions |
| 2. Protocol Health | Reserve ratios, coverage, liquidity |
| 3. Treasury Position | Protocol treasury composition and adequacy |
| 4. Governance Status | Pending votes, bootstrap phase status |
| 5. Real Asset Pipeline | Active acquisitions, deal flow velocity |
| 6. Community Activity | Wealth Practice participation, inflows |
| 7. Regulatory Environment | Jurisdiction monitoring |
| 8. Counterparty Exposure | PAXG, USDC, banking rail exposure |
| 9. Operational Readiness | Infrastructure status, audit status |

PRS is advisory only. It does not constitute investment advice and does not trigger autonomous capital deployment.

### 7.3 Axiom Sentinel

Axiom Sentinel is the unified capital decision and risk authorization layer. It converts MIRDT intelligence signals into structured capital recommendations with cryptographic audit trails. Sentinel recommendations require governance authorization before any capital action is executed. Sentinel is not an autonomous execution system.

### 7.4 AI Oracle — Gemini Intelligence Layer

The AI Oracle integrates Google's Gemini AI to provide:
- Document analysis and information extraction
- AI Acquisition Memo generation (IVCEE integration)
- Advisory narrative generation for governance decisions
- On-chain data interpretation and summarization

All AI Oracle outputs are advisory. No AI system has autonomous authority to deploy protocol capital or modify protocol parameters.

---

## 8. Banking and Custody Infrastructure

### 8.1 Increase.com — FDIC-Insured Banking Rail

Axiom Protocol's primary fiat banking infrastructure is provided by Increase.com, a banking-as-a-service platform with deposits held at First Internet Bank, Member FDIC.

| Property | Value |
|---|---|
| Provider | Increase.com |
| Bank | First Internet Bank (Member FDIC) |
| Account | Axiom Nexus Account |
| Rails | ACH, Wire Transfer |
| Status | Live |
| Coverage | Standard FDIC insurance limits apply |

**Capabilities:**
- ACH credit/debit for LP subscriptions and distributions
- Wire transfer for large capital movements
- Real-time transaction webhooks
- Programmatic payment initiation via Increase REST API
- LP deposit attribution and sub-ledger tracking

### 8.2 BitGo CaaS — Institutional Crypto Custody

BitGo Custody-as-a-Service (CaaS) provides institutional-grade digital asset custody for protocol treasury holdings.

| Property | Value |
|---|---|
| Provider | BitGo |
| Model | Custody-as-a-Service (CaaS) |
| Standard | Qualified Custodian infrastructure |
| Status | Configured |

### 8.3 Hybrid Custody Model

The protocol uses a hybrid custody architecture:

| Asset Type | Custodian | Model |
|---|---|---|
| Protocol treasury crypto | BitGo CaaS | Institutional custody |
| Fiat / USD operations | Increase / First Internet Bank | FDIC-insured banking |
| PAXG (AXAU reserve) | Paxos Trust (Brink's vaults) | Regulated trust custody |
| USDC (AXUSD reserve) | Circle (on-chain) | Non-custodial (on-chain) |
| User self-custody assets | User's own wallet | Self-custody |

The protocol does not hold user private keys. Participation in protocol products (Wealth Practice, AXUSD, AXAU, Lending Fund) does not transfer custody of user assets to Axiom Nexus LLC except where explicitly structured in the Lending Fund offering documents.

**Banking custody:** Fiat reserves held in the Axiom Nexus Account are held by First Internet Bank under FDIC-insured conditions

---

## 9. Community Infrastructure

### 9.1 The Wealth Practice

The Wealth Practice is Axiom Protocol's structured group savings framework — a programmable, discipline-enforced community capital formation system with deterministic scheduling, participant-level transparency, and cryptographic audit trails.

| Property | Value |
|---|---|
| Format | Rotating contribution groups with fixed cycle schedules |
| Governance | Community-elected group administrators with on-chain permission controls |
| Trust Pipeline | Three-stage: Onboarding → Active → Governance-Eligible |
| Audit Trail | Every contribution, allocation, and distribution is cryptographically logged |
| Status | Staged Rollout |

The Wealth Practice is not an investment product. It does not generate yield, guarantee returns, or constitute a financial product as defined by securities law. It is a structured savings coordination mechanism with transparent controls and community governance.

### 9.2 Community Credit

The Community Credit system provides verified participants with access to the Capital Program — an entry-level capital facilitation framework designed to expand access to the Wealth Practice and real asset pipeline for participants who meet participation criteria but require capital access assistance.

### 9.3 Axiom Academy

The Axiom Academy is an educational and certification platform offering track-based educational content covering wealth-building fundamentals, on-chain financial participation, and the Wealth Practice methodology. Completion of designated tracks may result in the issuance of certification acknowledgments.

---

## 10. Capital Formation and Syndication

### 10.1 Syndication Module

The Axiom Syndication Module is a full-stack capital formation operating system for structuring, managing, and closing real asset acquisition offerings. It supports the complete offering lifecycle from structuring through subscription, closing, and post-close reporting.

**Syndication Capabilities:**
- Offering structuring with preferred return, waterfall, and GP/LP terms
- Subscription tracking with wire and ACH payment attribution
- KYC/accreditation gating for all LP subscribers
- Capital account ledger with distribution calculation engine
- SEC Reg D 506(c) compliance framework integration

### 10.2 LP Investor Portal

The Investor Portal at `/syndication` provides accredited LP participants with a dedicated view of their capital account, offering subscriptions, distribution history, and K-1/tax document access. The portal is gated at Lane A (accredited investor) access level.

### 10.3 Axiom Secondary Network V1

The Axiom Secondary Network is a permissioned secondary transfer, settlement, registry, and intelligence layer for Axiom-issued private market products. It enables verified participants to access secondary liquidity for protocol-issued instruments under defined regulatory conditions, with all transfers subject to the same ERC-3643 identity compliance enforcement as primary transfers.

### 10.4 Capital Accounting and Performance Intelligence

The Capital Accounting system provides a full-stack capital ledger for all protocol investment activities. It tracks capital deployed, interest accrued, fee revenue, distributions paid, and unrealized NAV for the Lending Fund and Syndication Module. Performance reporting is accessible via the Founder Operations dashboard.

---

## 11. DePIN Infrastructure

### 11.1 DeNet Integration

Axiom Protocol integrates with the DeNet decentralized storage network as its primary DePIN (Decentralized Physical Infrastructure Network) partner. DeNet nodes provide decentralized, censorship-resistant storage infrastructure for protocol documents, inspection records, and on-chain data archives.

| Property | Value |
|---|---|
| Partner | DeNet Storage Network |
| Integration | DePIN Node Suite — node registration, metering, and management |
| Payment | ETH + AXM accepted for node services (DePINNodeSales contract) |
| Status | Configured — Active Integration |

### 11.2 Node Economy

The DePIN node economy enables protocol participants to contribute storage infrastructure and receive node-based incentives. The `DePINNodeSuite` automated control layer manages node registration and metering. The `UtilityAndMeteringHub` automated control layer coordinates IoT-level resource metering for future infrastructure expansion.

---

## 12. Governance Framework

### 12.1 Current Governance Structure

| Authority Layer | Mechanism | Scope |
|---|---|---|
| Governance Safe (3-of-5) | Multi-party authorization at `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` | PSM owner · Emergency pause · Fee sweep · Ceiling changes |
| Timelock Controller (24h) | Enforces upgrade delay | All upgradeable contracts |
| Deployer EOA | Bootstrap phase | AXUSD token admin · Identity Registry admin (pending migration) |
| AXAU Governor (Deployer EOA) | Bootstrap phase | AXAU system parameters · CommodityRegistry · Vault controls |
| AXM Admin Safe | Multi-party authorization | AXM MINTER_ROLE |

### 12.2 Bootstrap Phase

The protocol is currently operating in Bootstrap Phase governance. The Founder Operations team retains operational authority over system parameters during this phase. The bootstrap configuration is an acknowledged transitional state — full migration to AXM token-weighted governance is a defined roadmap milestone.

All bootstrap-phase administrative actions are logged in the `admin_action_log` database table and visible in the Founder Operations dashboard with transaction hash, action type, target address, amount, and timestamp.

### 12.3 Emergency Powers

| Function | Trigger Conditions | Authorization | Two-Person Rule |
|---|---|---|---|
| `pause()` | Active exploit · Regulatory order · Critical vulnerability | 3-of-5 Governance Safe | Yes |
| `emergencySweep()` | Imminent contract compromise · Regulatory seizure | 3-of-5 Governance Safe | Yes |
| `freeze(address)` | OFAC designation · Court order · Active exploit from address | Deployer EOA (pending Safe migration) | Yes (policy) |
| `forcedTransfer()` | Court order · Regulatory asset recovery directive | Governance Safe | Yes |

### 12.4 SEED — Vote-Escrowed Governance

The SEED program enables AXM holders to lock their governance tokens for 1–4 year periods in exchange for enhanced governance weight. Longer lockup periods receive proportionally greater governance weight, creating alignment between long-horizon participants and governance outcomes.

### 12.5 Agent Governance System

The Agent Governance System is a policy-based autonomous agent authorization layer that enables governance-approved software agents to perform defined protocol actions within explicitly bounded parameters. Agents cannot exceed their authorized scope without a new governance approval. This creates a governance-gated framework for protocol automation without delegating unbounded authority to any automated system.

### 12.6 AXAU Governance

The AXAU reserve basket is governed through the `CommodityRegistry` automated control layer. Commodity additions require a six-criterion admission review:

1. Custody attestability by a qualified custodian
2. Live, redundant on-chain price feed (Chainlink or equivalent)
3. Legal and operational readiness in relevant jurisdictions
4. Non-synthetic backing (direct physical or on-chain issued physical asset only)
5. Solvency stress test passage
6. Liquidity profile assessment (determines haircut and max basket weight)

### 12.7 Identity Framework and Tiered Access

Axiom Protocol uses the ERC-3643 (T-REX) standard for on-chain identity verification. All AXUSD and AXAU transfers are gated by the Identity Registry's `isVerified()` function. Identity enforcement is not an application-layer checkpoint — it is executed within the automated control layer on every transfer.

**Core Infrastructure:**

| Contract | Address | Role |
|---|---|---|
| Identity Registry | `0x58f64a1262d5434d6C7637a2309b0999bB6D1970` | Maps wallets to ONCHAINID contracts |
| Identity Registry Storage | `0x5A906507f886db1f41b12c75324C96dE27aB2E81` | Persistent identity storage |
| Modular Compliance | `0xD94a0dAc0c5Ce2D5f0E9FDe4fD5c30Ea82F06A84` | Routes transfer checks to compliance modules |
| Claim Topics Registry | `0xf4eA4f42fC03a5bE104fcB91e109665ae7b0EB18` | Authoritative list of recognized claim topic IDs |
| Trusted Issuers Registry | `0x3367c571f5ae60b4E2c5ABca22cA311b413F89D1` | Whitelists claim issuers per topic |
| Claim Issuer | `0x579A367eaDa7606edc58f43165B53D2526D1B313` | Signs and revokes claims on behalf of Axiom Protocol |
| Identity Factory | `0x1A7c55AC9A4AB318039f8E2BDfA82500332c86B9` | Deploys EIP-1167 minimal proxy ONCHAINID contracts |

### 12.8 Claim Topics

| Topic ID | Name | Validity | Required For |
|---|---|---|---|
| 1 | KYC_VERIFIED | 365 days | All AXUSD and AXAU transfers · PSM mint/redeem |
| 2 | ACCREDITED_INVESTOR | 365 days | Lending Fund · Lane A products · LP Investor Portal |
| 3 | SANCTIONS_CLEAR | 180 days | All AXUSD and AXAU transfers |

### 12.9 Dual-Lane Architecture

| Lane | Access Level | Identity Requirements | Available Products |
|---|---|---|---|
| Lane A | Institutional / Accredited | Topics 1, 2, and 3 | All protocol products including Lending Fund, full Syndication, LP Portal |
| Lane B | Verified Standard | Topics 1 and 3 | Wealth Practice, AXUSD, AXAU, Community Credit, DePIN, Academy |

### 12.10 Claim Lifecycle

```
Submission (off-chain)
  |  User submits KYC form → database: t3_kyc_submissions
  |
Compliance Review (Founder Ops dashboard)
  |  Operator reviews queue — approves or rejects
  |
Atomic On-Chain Approval
  |  ERC3643Service.atomicKycApproval():
  |  1. deployIdentity(wallet)       → ONCHAINID contract
  |  2. registerIdentity(wallet, identity, country)
  |  3. issueClaim(topic=1)          → KYC_VERIFIED
  |  4. issueClaim(topic=3)          → SANCTIONS_CLEAR
  |  All four calls in a single coordinated sequence
  |
Active State
  |  wallet.isVerified() = true → can send/receive AXUSD/AXAU
  |
Expiry or Revocation
     Claim.validTo exceeded → isVerified() = false → transfers blocked
     Compliance revokes: ClaimIssuer.revokeClaimBySignature()
```

---

## 13. Regulatory and Institutional Context — IMF Structural Shift Analysis

*Note: This section documents Axiom Protocol's relationship to the regulatory and institutional landscape as of April 2026. The analysis below is Axiom's independent interpretation of publicly available regulatory commentary. No regulatory endorsement is claimed or implied.*

In April 2026, the International Monetary Fund published a formal policy note authored by Tobias Adrian, Financial Counsellor and Director of the Monetary and Capital Markets Department, declaring that asset onboarding and issuance on programmable ledgers constitutes a "structural shift" in financial architecture rather than a marginal efficiency improvement. The note describes how permissioned shared ledgers, programmable financial assets, and automated control layer-based risk management are fundamentally altering how settlement, liquidity, and systemic risk operate within regulated financial systems.

The IMF identified real-world asset issuance at approximately $27.5 billion in total value as of early April 2026, with US Treasury products accounting for more than $12 billion. It called for clear policy frameworks, robust code governance, legal certainty, and international regulatory coordination.

The IMF note describes the phenomenon. Axiom Protocol is building one of the instantiations of it.

### 13.1 Direct Embodiment

**Permissioned Shared Ledgers and Embedded Compliance**

The IMF specifically identifies "permissioned shared ledgers" and "embedded compliance" as defining features of the structural shift. Axiom deploys this design pattern in its most technically rigorous form: the ERC-3643 (T-REX) standard, the leading open standard for compliance-gated asset issuance. Identity verification is enforced at the token transfer layer on every transaction — mint, redeem, and wallet-to-wallet — not as an application-layer checkpoint.

**Real-World Asset Onboarding and Issuance**

The IMF's $27.5 billion in real-world asset issuance is the market validation signal for Axiom's founding thesis. Axiom's reserve architecture spans multiple asset classes: gold via PAXG (Paxos Trust Company, NYDFS-regulated), US real estate via the land acquisition pipeline, and planned future commodity layers. The AXAU four-phase reserve system is a direct instantiation of the RWA market the IMF is describing — with the additional dimension of community governance over reserve composition.

**Atomic Settlement and Continuous Liquidity Management**

The IMF identifies these as the transformative operating properties of programmable financial infrastructure. The AXAU MintRedeemController and the AXUSD PSM deliver exactly this: real-time Chainlink oracle pricing, 24-hour-a-day on-chain settlement, and coverage verification computed at transaction execution time — not end-of-day.

**Governance as Infrastructure**

The IMF calls for "robust code governance" as a policy requirement. Axiom treats governance as a first-class infrastructure component. The CommodityRegistry governs what enters the AXAU reserve basket. AXM token holders vote on parameter changes through a Governance Safe with 24-hour Timelock. Every commodity addition requires a six-criterion admission review. The governance system was designed and deployed prior to the first production mint.

**Regulatory Framework Alignment**

The IMF calls for "clear policy frameworks" and "international coordination." Axiom's ERC-3643 architecture and its posture designed to align with the GENIUS Act framework reflects a deliberate effort to operate inside the emerging regulatory envelope. The three-topic claim system (KYC, Accredited Investor, Sanctions-Clear) implements the identity verification requirements that regulators are actively writing into law.

### 13.2 Beyond IMF Scope

The IMF note focuses on asset onboarding within the regulated institutional financial system — banks, asset managers, and market infrastructure providers. Axiom's scope is broader in three specific ways:

**Sovereign Individual Wealth, Not Only Institutional Efficiency**

The IMF is describing how large financial institutions will settle instruments faster and manage liquidity more continuously. Axiom is simultaneously building the infrastructure through which communities and individuals build wealth on the same rails. The Wealth Practice, the Capital Program, and the Community Entry Credit framework address participants that the IMF's institutional analysis does not reach. This is the bottom-up complement to the IMF's top-down institutional framing.

**Physical-Digital Bridge at the Land Level**

The IMF references real estate in the RWA category. Axiom operates a full-stack operational system for bringing land specifically onto on-chain rails: deal sourcing, underwriting, field inspection, governance approval, title onboarding, and reserve integration via the AXLandVault. This depth of physical asset integration is multiple layers beyond what any central bank working group is currently modeling.

**Decentralized Physical Infrastructure**

The IMF does not address physical network infrastructure. Axiom's DePIN integration and the broader sovereign digital-physical economy thesis position on-chain financial rails as one layer of a physical infrastructure sovereignty project — not the entirety of it. The vision extends beyond financial settlement to include storage infrastructure, IoT metering, and eventually utility networks governed by the same community governance that governs capital allocation.

### 13.3 Risk Warning Responses

The IMF issued a substantive risk warning alongside its structural shift declaration:

> *The IMF warned that automated margin calls, real-time settlement, and programmable financial flows could accelerate liquidity stress during volatility — that traditional systems have built-in delays acting as shock absorbers, and that on-chain financial systems could transmit stress instantly across participants.*

Axiom's architecture contains three structural responses to this concern, built into the protocol at the automated control layer level:

**Response 1 — The Coverage Circuit Breaker**
The MintRedeemController's 105% coverage floor is a programmable stop valve, not a stress transmitter. When gold prices fall and coverage trends toward the floor, new minting pauses automatically before undercollateralization occurs. The circuit breaker engages on-chain, without human intervention, and without the ability for any administrative key to override it. This is the inverse of an automated margin call cascade — it slows the system under stress rather than accelerating it.

**Response 2 — Illiquid Sleeve Design**
The AXAU Phase 3 land component carries a 40% haircut and a hard 10% maximum basket weight. The monthly appraisal cadence for land NAV updates means land values do not propagate intraday price movements into the reserve calculation. This is a deliberate design choice to preserve the shock-absorber function of illiquid assets — exactly the mechanism the IMF identifies as a stabilizer in traditional systems that programmable financial infrastructure must be careful not to discard.

**Response 3 — Component Isolation**
Each AXAU reserve component operates through an independent vault automated control layer. A failure, oracle outage, or regulatory action affecting one component triggers a component-level pause, not a system-wide halt. The circuit breaker architecture prevents contagion between reserve layers, addressing the IMF's concern about stress transmitting instantly across participants in a tightly interconnected system.

### 13.4 Most Significant Gap

The IMF frames the structural shift primarily through the lens of institutional settlement efficiency and systemic risk management. Axiom frames it through the lens of individual wealth sovereignty and community economic infrastructure.

These are not in conflict — they are operating at different layers of the same transformation. The IMF is describing the top of the stack: how institutional market infrastructure becomes more efficient, programmable, and compliant. Axiom is building the bottom of the stack: how individuals and communities gain access to the same programmable infrastructure to build wealth outside of traditional financial gatekeepers.

The practical consequence of this divergence is that Axiom must eventually interface with the regulated institutional layer the IMF is describing. The Increase.com banking rail, BitGo institutional custody, and the SEC Regulation D 506(c) Lending Fund structure are the current bridges between those two layers. As the IMF's policy frameworks crystallize and regulatory classification of on-chain instruments matures in major jurisdictions, these integration points become more consequential — not less.

Axiom's governance-first, compliance-embedded architecture is designed to be positioned at these integration points as a participant rather than an adversary of emerging regulatory frameworks. The ERC-3643 identity stack, the GENIUS Act reference architecture, and the three-tier solvency disclosure model are all structural responses to the institutional expectations the IMF is articulating — built before the regulatory requirements are formally codified.

### 13.5 Summary Judgment

The IMF note is an institutional acknowledgment that the architecture Axiom is building is structurally aligned with the direction of regulated financial infrastructure. The $27.5 billion in existing real-world asset issuance is the market evidence that this thesis is operationally real. The IMF's risk warnings are materially accurate, and Axiom's circuit breaker design and illiquid sleeve architecture directly address the most acute of them.

Where Axiom diverges from the IMF's scope — individual wealth access, land-level physical integration, and decentralized physical infrastructure — those divergences represent the differentiated thesis, not a departure from sound financial engineering. They represent the protocol's conviction that the structural shift the IMF is describing is not complete until it reaches the community and individual level, not merely the institutional settlement layer.

As the IMF's policy frameworks crystallize and the GENIUS Act framework matures, Axiom's governance-first, compliance-embedded architecture is structurally positioned to engage with that regulated layer rather than operate around it.

---

## 14. Risk Framework

### 14.1 Automated Control Layer Risk

**Current Status:** All automated control layers are deployed and verified on Arbitrum Blockscout. No independent third-party security audit has been completed for the AXAU contract system. The AXUSD and governance infrastructure has undergone internal audit with 147 findings remediated.

**Risk Controls:**
- Source code verified on Arbitrum Blockscout (publicly readable)
- Emergency pause available at Governance Safe authority
- Coverage circuit breaker (AXAU) and PSM ceiling cap (AXUSD) provide automated guardrails
- Timelock Controller enforces 24-hour delay on upgrades

**Risk Acknowledgment:** Participants engaging with protocol products during the bootstrap phase should be aware that the AXAU contract system has not completed an independent third-party security audit. The bootstrap phase is an acknowledged risk period.

### 14.2 Oracle Risk

**Chainlink XAU/USD (AXAU):**
- Network congestion may delay oracle updates beyond the 1-hour heartbeat
- Oracle data staleness triggers automatic component pause in the AXAU system
- Oracle manipulation is mitigated by Chainlink's decentralized node network

**Land Oracle (Phase 3 AXAU):**
- Monthly appraisal cadence creates lag relative to market movements
- Multi-party authorization creates key management risk for oracle signers

**General:**
All protocol price data from third-party oracles (Chainlink, Alpha Vantage, CoinGecko) is used as-is. Axiom does not independently verify third-party oracle data.

### 14.3 Custody Risk

**PAXG / Paxos (AXAU Reserve):**
- Paxos Trust Company regulatory action (NYDFS charter)
- Brink's vault operational risk (physical gold storage)
- Automated control layer risk in PAXG itself (independent of AXAU contracts)

**USDC / Circle (AXUSD Reserve):**
- Circle regulatory or operational risk could impair USDC redemption
- USDC is not FDIC insured

**Banking Rail (Increase.com / First Internet Bank):**
- Standard FDIC deposit insurance limits apply
- Increase.com platform operational risk
- Banking regulatory risk

### 14.4 Market Risk

- **Gold price volatility:** AXAU USD value will fluctuate with gold market prices. AXAU is not a stablecoin.
- **USDC depeg risk:** AXUSD reserves held in USDC are subject to USDC market risk
- **AXM price volatility:** AXM is a governance token whose market value is subject to crypto market conditions
- **Arbitrum network risk:** All on-chain operations require Arbitrum One to be operational

### 14.5 Regulatory Risk

- Token classification (utility, security, commodity) is jurisdiction-dependent
- AXUSD and AXAU regulatory classification may differ across jurisdictions
- Regulatory action affecting PAXG, USDC, or USDC reserve assets could impair protocol solvency
- The Lending Fund's Regulation D 506(c) status requires participants to be accredited investors as defined by applicable law
- Transfer restrictions under ERC-3643 may prevent certain wallets from receiving AXUSD or AXAU

### 14.6 Concentration Risk

- AXUSD Phase 1 reserve is 100% USDC (single asset, single issuer)
- AXAU Phase 1 reserve is 100% PAXG (single asset, single custodian)
- All on-chain operations rely on a single Layer 2 network (Arbitrum One)
- Single oracle dependency per asset class in Phase 1

### 14.7 Systemic Risk

The protocol is in an early bootstrap phase with limited total value under management. Current systemic risk to broader financial markets is assessed as negligible. As the protocol scales, the governance-first architecture, coverage circuit breakers, and tiered access framework are designed to maintain institutional-grade systemic controls.

---

## 15. Proof of Execution and Key Milestones

### 15.1 Deployment Timeline

| Date | Milestone | On-Chain Evidence |
|---|---|---|
| November 2025 | Phase 1 — Core contracts deployed: AXM, AXUSD v1, Governance Safe | Arbitrum Blockscout |
| December 2025 | Phase 2 — Identity and compliance infrastructure: ERC-3643 identity stack, 3-topic claim system | Arbitrum Blockscout |
| January 2026 | Phase 3 — On-chain financial rails: Euler V2 vaults, EulerSwap pools, PSM | Arbitrum Blockscout |
| February 2026 | Phase 4 — Capital formation: Syndication module, Lending Fund, Capital Accounting | Arbitrum Blockscout |
| March 2026 | Phase 5 — Banking integration: Increase.com Nexus Account, BitGo CaaS, LP deposit registry | Arbitrum Blockscout |
| March 26, 2026 | Unified AXUSD + eAXUSD-6 launched; EulerSwap USDC/AXUSD seeded with 10,000 AXUSD | TX verified |
| March 28, 2026 | AXM/AXUSD EulerSwap pool seeded (10,000 AXM / 9,000 AXUSD); eAXM-1 seeded | TX verified |
| March 30, 2026 | PSM activation; first end-to-end mint: 20 USDC → 19.98 AXUSD | TX verified |
| April 2, 2026 | AXAU Phase 1 — Seven AXAU contracts deployed and verified; haircutBps set to 0 | TX: 0x115d2b7d... |
| April 2, 2026 | AXAU Genesis Mint — 0.0013 PAXG → 5.789977 AXAU | TX: 0x73479447..., Block 448396754 |

### 15.2 Genesis Mint Record — AXAU

| Field | Value |
|---|---|
| Input | 0.0013 PAXG |
| Output | 5.789977 AXAU |
| Transaction | `0x73479447...` |
| Block | 448396754 (Arbitrum One) |
| Date | April 2, 2026 |
| Preceding Governor Action | haircutBps set 500 → 0 (TX: `0x115d2b7d...`) |
| Minting Wallet | Deployer (`0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`) |

### 15.3 Proof of Execution Dashboard

The Proof of Execution system at `axiomprotocol.app/proof-of-execution` provides a continuously updated record of operational milestones, governance actions, contract deployments, and capital events — each linked to on-chain transaction hashes for independent verification.

---

## 16. Forward Roadmap

### 16.1 Governance Transition

Full migration from Bootstrap Phase governance to AXM token-weighted decentralized governance is planned following sufficient AXM distribution and on-chain liquidity development. Milestones include:
- Migration of AXUSD token admin to Governance Safe
- Migration of Identity Registry admin to compliance tooling delegation
- Migration of AXAU GOVERNOR_ROLE to governance-controlled multi-party authorization
- Launch of formal AXM governance voting portal

### 16.2 Universe Blockchain (L3 Migration)

The Axiom Protocol is designed for forward migration to Universe Blockchain, a purpose-built Layer 3 network optimized for the protocol's governance-first wealth infrastructure requirements. The L3 migration will enable:
- Protocol-native gas fee management
- Custom governance execution environment
- Enhanced performance for high-frequency AME and solvency computations
- Protocol-controlled validator set aligned with AXM governance

### 16.3 AXAU Reserve Expansion

| Phase | Asset | Status |
|---|---|---|
| Phase 1 | Gold (PAXG) | Live |
| Phase 2 | Silver (XAG) | Governance Vote Required |
| Phase 3 | Land (Real Estate RWA) | Infrastructure deployed; NAV not yet activated |
| Phase 4+ | Energy and additional commodities | Future — pending on-chain commodity infrastructure maturity |

### 16.4 AXAU Third-Party Security Audit

Independent third-party security audit of the AXAU seven-contract system is a deferred milestone pending treasury development. Target audit threshold is approximately $50,000–$150,000 USD in treasury capacity. Audit candidates include OpenZeppelin Audits, Trail of Bits, Certik, Halborn, and Sherlock competitive audit.

### 16.5 Lending Fund Activation

The Lending Fund activation is pending governance approval and legal confirmation of the Regulation D 506(c) offering structure. The ERC-4626 vault infrastructure and ERC-721 loan receipt system are deployed and configured.

### 16.6 Secondary Market Development

The Axiom Secondary Network V1 infrastructure is deployed. Secondary market activation for protocol-issued instruments is pending sufficient primary market volume to support meaningful secondary liquidity.

---

## 17. Disclosures

1. **Not Investment Advice.** This document does not constitute an offer to sell or a solicitation to purchase any security, commodity, or digital asset. No investment advice is provided or implied.

2. **No Audit Completed.** The AXAU seven-contract automated control layer system has not been independently audited by a third-party security firm. The AXUSD and governance infrastructure has undergone internal review with findings remediated; external audit is deferred. Participants engage at their own risk.

3. **Variable Rates.** All rates, yields, and return metrics referenced herein are variable. No returns are guaranteed. Past performance is not indicative of future results.

4. **Not a Bank.** Axiom Protocol is not a bank, broker-dealer, or registered investment advisor. FDIC insurance applies only to Axiom Nexus Account bank deposits at First Internet Bank, per standard FDIC coverage limits for that account type. The protocol itself is not FDIC insured.

5. **Token Classification.** The regulatory classification of AXM, AXUSD, and AXAU may vary across jurisdictions. No definitive regulatory conclusion is made herein. Participants must obtain independent legal and tax advice for their specific jurisdiction before engaging.

6. **GENIUS Act.** AXUSD and AXAU are designed to align with the GENIUS Act framework and applicable digital asset regulatory guidance. This is a design intent, not a legal determination or compliance guarantee. Compliance posture remains subject to legal and operational review.

7. **Physical Asset Claims.** References to land acquisition, real estate, and physical asset pipelines describe a targeted acquisition framework and governance-governed process. No claim of current ownership of specific parcels is made. Physical asset targets are subject to market conditions, regulatory requirements, and governance approval.

8. **Counterparty Risk.** PAXG is issued by Paxos Trust Company. USDC is issued by Circle. FDIC-insured deposits are held at First Internet Bank via Increase.com. Regulatory action, operational failure, or insolvency of any counterparty could impair protocol operations regardless of automated control layer behavior.

9. **Automated Control Layer Risk.** Automated control layers are software running on a public blockchain. Bugs, exploits, or unexpected interactions may result in partial or total loss of deposited assets. The risk is elevated for unaudited systems.

10. **Governance Changes.** All parameters described herein — haircuts, coverage floors, fees, access tiers — are subject to change through the governance process and may be modified without prior notice.

11. **No Absolutist Positioning.** Axiom Protocol does not claim to be the exclusive or sole platform for digital-physical wealth infrastructure. References to Axiom as a "reference architecture" describe the protocol's design intent, not a market exclusivity claim.

12. **Independent Advice Required.** Participants should obtain independent legal, financial, and tax advice before participating in any Axiom Protocol activity.

---

## Appendix A — Deployed Contract Registry

**Network:** Arbitrum One | **Chain ID:** 42161 | **Explorer:** https://arbitrum.blockscout.com

### Core Protocol

| Contract | Address | Standard | Status |
|---|---|---|---|
| AXM Governance Token | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` | ERC-20 | Live |
| Unified AXUSD | `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` | ERC-3643 | Live |
| Canonical PSM | `0xDB669bb6cA07215C5B055B62072AAED2F821E53F` | Custom | Live |
| Backstop Vault (USDC) | `0x54438249457694eB5431811f3f19444Af0a01B29` | Custom | Live |
| Governance Safe (3-of-5) | `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d` | Gnosis Safe | Live |

### AXUSD Identity and Compliance

| Contract | Address | Role |
|---|---|---|
| Identity Registry | `0x58f64a1262d5434d6C7637a2309b0999bB6D1970` | Maps wallets to ONCHAINID |
| Identity Registry Storage | `0x5A906507f886db1f41b12c75324C96dE27aB2E81` | Persistent identity store |
| Modular Compliance | `0xD94a0dAc0c5Ce2D5f0E9FDe4fD5c30Ea82F06A84` | Transfer compliance routing |
| Claim Topics Registry | `0xf4eA4f42fC03a5bE104fcB91e109665ae7b0EB18` | Claim topic definitions |
| Trusted Issuers Registry | `0x3367c571f5ae60b4E2c5ABca22cA311b413F89D1` | Issuer whitelist |
| Claim Issuer | `0x579A367eaDa7606edc58f43165B53D2526D1B313` | Claim signing and revocation |
| Identity Factory | `0x1A7c55AC9A4AB318039f8E2BDfA82500332c86B9` | ONCHAINID deployment |

### Euler V2 Vaults and Pools

| Contract | Address | Type | Status |
|---|---|---|---|
| eAXUSD-6 | `0xacdA87801f6409bB5157BA78aF1BD9631d6609B2` | ERC-4626 — AXUSD lend/borrow | Live |
| eAXM-1 | `0x8e28ffa89d168599156004db4f4d12c2af7c250e` | ERC-4626 — AXM supply-only | Live |
| Euler Earn Vault | `0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B` | Euler Earn — AXUSD yield | Live |
| USDC/AXUSD EulerSwap | `0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8` | AMM Pool | Deployed + Configured |
| AXM/AXUSD EulerSwap | `0x981763699D269E129a08E216b1AeC7caa376A8a8` | AMM Pool | Deployed + Seeded |
| eAXUSD-4 (deprecated) | `0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059` | ERC-4626 | WITHDRAW_ONLY |

### AXAU Reserve Instrument

| Contract | Address | Role | Status |
|---|---|---|---|
| AXAUTokenLite3643 | `0xbcCA4D937d427829914498423aE6E04C846dB0Bb` | ERC-3643 token | Live |
| CommodityRegistry | `0x6D3aAa92793503B40b3F3593d2fCc409Ca610bDa` | Reserve component registry | Live |
| AXGoldVault | `0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8` | PAXG reserve vault | Live |
| NAVEngine | `0x80F8634a43B26a2bd403396A42465F138aeCC519` | NAV computation engine | Live |
| MintRedeemController | `0x036F05a3fB74d35439c074f25F691b36f5D37792` | Mint/redeem gateway | Live |
| AXLandVault | `0x66Aadce66a359609ec5E18fb3d8927a2363449cf` | Land reserve vault | Deployed — Inactive |
| LandNAVOracleMultiSig | `0x8FF5D66d4be4C107362e63f8E9E8283E8c5EA0Fc` | Land appraisal oracle | Deployed — Inactive |

### Reserve Assets and Oracles

| Reference | Address |
|---|---|
| PAXG (Paxos Gold, Arbitrum One) | `0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429` |
| USDC (Arbitrum One) | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| WETH (Arbitrum One) | `0x82aF49447D8a07e3bd95BD0d56f35241523fBab1` |
| Chainlink XAU/USD | `0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c` |
| Chainlink ETH/USD | `0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612` |
| Uniswap V3 QuoterV2 | `0x61fFE014bA17989E743c5F6cB21bF9697530B21e` |
| Deployer / GOVERNOR_ROLE | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` |

### Legacy / Deprecated Tokens

| Token | Address | Status |
|---|---|---|
| GENIUS AXUSD | `0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C` | Deprecated — No new activity |
| Euler AXUSD | `0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c` | Deprecated — No new activity |
| Legacy GENIUS PSM | `0x5db58d9c21369d1532a48Bdd658E4Fe415404922` | Configured-Inactive |

---

## Appendix B — Glossary of Approved Terms

The following terms represent the canonical institutional vocabulary for Axiom Protocol. These definitions govern all disclosure-facing documents, public communications, and institutional materials.

| Canonical Term | Definition | What It Is Not |
|---|---|---|
| **Axiom Protocol** | Governance-first wealth infrastructure with disclosure-grade transparency | Not a bank. Not a broker-dealer. Not a registered investment advisor. Not FDIC insured. |
| **Automated Control Layer** | On-chain programmable logic deployed on Arbitrum One | Do not use "smart contract" in disclosure-facing content |
| **Multi-Party Authorization** | Threshold authorization requiring M-of-N designated signers | Do not use "multi-sig" in disclosure-facing content |
| **On-Chain Financial Rails** | Blockchain-based payment, settlement, and liquidity infrastructure | Do not use "DeFi" in disclosure-facing content |
| **Asset Onboarding and Issuance** | Process of registering real-world assets on-chain under governance authority | Do not use "tokenization" in disclosure-facing content |
| **Participation Lockup** | Time-bound AXM lock for enhanced governance weight (SEED program) | Do not use "staking" in disclosure-facing content |
| **The Wealth Practice** | A programmable group savings framework with deterministic scheduling, participant-level transparency, and cryptographic audit trails | Not an investment product. Not a yield claim. Not a guarantee of returns. Not FDIC insured. |
| **Unified AXUSD** | Protocol stablecoin issued under ERC-3643 on Arbitrum One. Supersedes all prior AXUSD generations. | Not FDIC insured. Not a guarantee of redemption in excess of disclosed reserves. Not a bank deposit. |
| **AXAU** | Axiom Protocol's gold-anchored reserve instrument. Phase 1 backed by PAXG. | Not a stablecoin. Not FDIC insured. Value will fluctuate with commodity prices. |
| **AXM** | ERC-20 governance and fee-routing token on Arbitrum One | Not a security claim (jurisdiction-dependent). Not a guarantee of returns. |
| **Adaptive Metrics Engine (AME)** | Deterministic financial computation engine for regime scoring, adaptive targets, and policy multipliers | Not a trading engine. Not an AI system. |
| **Capital Intelligence Terminal (MIRDT)** | Nine-dimension advisory signal engine producing a Protocol Readiness Score (0–10) | Not a trading engine. Not an execution system. PRS is advisory only. |
| **Axiom Sentinel** | Advisory capital decision layer converting intelligence signals into recommendations with cryptographic audit trails | Not an autonomous execution system. No authority to deploy capital without governance approval. |
| **Physical Asset Pipeline** | Framework for bridging digital capital to real-world assets including land and housing | Not a claim of current ownership. Not a guarantee of acquisition. |
| **GENIUS Act** | US federal digital asset legislation | Use "designed to align with the GENIUS Act framework." Never claim compliance. |

---

*Axiom Protocol White Paper v4.0 — Axiom Nexus LLC — April 3, 2026*
*Institutional Disclosure — Not Investment Advice*
*This document supersedes v2.0 (March 31, 2026), v3.0 (March 23, 2026), and v1.1 (March 30, 2026).*
*For the AXAU Reserve Instrument technical specification, see documents/axau-whitepaper.md.*
