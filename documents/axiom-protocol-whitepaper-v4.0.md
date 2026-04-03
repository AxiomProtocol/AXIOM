# Axiom Protocol
## Institutional White Paper & Executive Summary v4.0

| Field | Value |
|---|---|
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

---

> This document is provided for informational purposes only and does not constitute an offer to sell or a solicitation of an offer to buy any security or financial instrument. All on-chain references are independently verifiable on Arbitrum One. All rates are variable. No returns are guaranteed. Performance and reserve data cited herein reflect the state of the protocol as of the date above and are subject to change. This document is not legal or investment advice.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Token Ecosystem](#3-token-ecosystem)
4. [Reserve and Solvency Framework](#4-reserve-and-solvency-framework)
5. [Real Asset Infrastructure](#5-real-asset-infrastructure)
6. [Intelligence Layer](#6-intelligence-layer)
7. [Banking and Custody Infrastructure](#7-banking-and-custody-infrastructure)
8. [Community Infrastructure](#8-community-infrastructure)
9. [Capital Formation and Syndication](#9-capital-formation-and-syndication)
10. [DePIN Infrastructure](#10-depin-infrastructure)
11. [Tiered Access and Verified Participant Architecture](#11-tiered-access-and-verified-participant-architecture)
12. [Governance Framework](#12-governance-framework)
13. [Regulatory and Institutional Context — IMF Structural Shift Analysis](#13-regulatory-and-institutional-context--imf-structural-shift-analysis)
14. [Risk Framework](#14-risk-framework)
15. [Proof of Execution and Key Milestones](#15-proof-of-execution-and-key-milestones)
16. [Forward Roadmap](#16-forward-roadmap)
17. [Disclosures](#17-disclosures)
18. [Appendix A — Deployed Contract Registry](#appendix-a--deployed-contract-registry)
19. [Appendix B — Glossary of Approved Terms](#appendix-b--glossary-of-approved-terms)

---

## 1. Executive Summary

### 1.1 Mission

Axiom Protocol is a governance-first wealth infrastructure platform designed to bridge digital capital formation with physical asset acquisition. The protocol provides institutional-grade transparency, deterministic risk management, and community-governed capital allocation — all anchored to verifiable on-chain operations on Arbitrum One.

The core thesis: disciplined savings behavior, transparent treasury operations, and programmable governance can support a framework for community capital formation designed to facilitate physical asset acquisition — land, housing, food production infrastructure — while maintaining cryptographic auditability at every layer.

### 1.2 What Axiom Is — and What It Is Not

**Axiom Protocol is:**
- Governance-first wealth infrastructure with disclosure-grade transparency
- A reference architecture for sovereign digital-physical economies
- A programmable group savings framework with deterministic scheduling and cryptographic audit trails
- An ERC-20 governance and fee-routing token ecosystem on Arbitrum One
- An FDIC-insured banking rail (Increase.com / First Internet Bank) serving as the required entry gate for all capital-bearing activities
- A permissioned on-chain credit market for real asset acquisition and rehabilitation financing
- A live, gold-backed reserve instrument (AXAU) with seven deployed automated control layers on Arbitrum One mainnet

**Axiom Protocol is not:**
- A bank, broker-dealer, or registered investment advisor
- FDIC insured at the protocol level — banking accounts through Increase.com carry FDIC insurance per standard limits for that account type; the protocol itself does not
- A yield guarantee or wealth outcome promise — all rates are variable
- A claim of current ownership of any physical asset — physical asset targets are subject to market conditions, regulatory requirements, and governance approval

### 1.3 Platform Scale — April 2026

| Metric | Value |
|---|---|
| Deployed Automated Control Layers | 84 (7 new AXAU contracts added April 2, 2026) |
| On-Chain Addresses | 100+ |
| Frontend Pages | 55 |
| API Endpoints | 133 |
| UI Components | 142 |
| Database Tables | 339 |
| Active Token Supply — AXUSD | 10,019.98 AXUSD |
| Active Reserve Instrument — AXAU | 5.79 AXAU (genesis supply, April 2, 2026) |
| AXAU Gold Reserve | 0.0013 PAXG |
| AXM/AXUSD EulerSwap Pool | Live — 10,000 AXM / 9,000 AXUSD |
| PSM Debt Ceiling | 1,000,000 AXUSD |
| Deployment Phases | 6 (November 2025 – April 2026) |

### 1.4 Core Differentiators

**1. Identity-Gated Financial Infrastructure**
Every AXUSD and AXAU transaction is enforced through the ERC-3643 (T-REX) identity standard. No transfer, mint, or redeem is possible without on-chain verification. This is not a post-hoc compliance layer — it is enforced at the automated control layer level on every transfer.

**2. Dual-Lane Participant Architecture**
Lane A (institutional/accredited) and Lane B (verified standard) enable differentiated access to protocol products without exposing institutional infrastructure to unverified participants or requiring all participants to meet accredited investor thresholds.

**3. Physical-Digital Bridge**
The protocol's land acquisition pipeline, field inspection system, and syndication module connect on-chain capital formation to real-world asset acquisition, providing a traceable bridge between digital participation and physical asset interests.

**4. Integrated Fiat Capital Gateway**
The Axiom Nexus Account (First Internet Bank, via Increase.com) provides a single FDIC-insured banking entry point for all capital-bearing activities. Participants receive unique ACH reference codes enabling precise attribution of incoming fiat payments to on-chain participant records.

**5. Multi-Layer Reserve Infrastructure**
The AXAU Reserve Instrument adds a commodity-backed reserve layer to the protocol. With seven production automated control layers live on Arbitrum One as of April 2026, AXAU represents the first live instantiation of Axiom's physical asset reserve thesis — beginning with gold, with land and additional commodities planned through governance.

**6. Transparent by Design**
The Proof of Execution system, solvency console, and reserve methodology documentation create a multi-layer audit record that institutional counterparties can independently verify on-chain at any time.

---

## 2. System Architecture

### 2.1 Six-Layer Protocol Stack

```
+----------------------------------------------------------------------+
|  Layer 6: Fiat Capital Gateway                                       |
|  Axiom Nexus Account (FDIC) · ACH Reference Codes                   |
|  Insurance Holds · LP Deposit Registry · Distributions              |
+----------------------------------------------------------------------+
|  Layer 5: Physical World                                             |
|  Land Acquisition Pipeline · Field Inspections · Asset Onboarding   |
|  Syndication Closings · AXAU Reserve Vaults                         |
+----------------------------------------------------------------------+
|  Layer 4: Capital Formation                                          |
|  Syndication Module · Lending Fund · Wealth Practice                |
|  Community Entry Credit · AXAU Mint/Redeem                          |
+----------------------------------------------------------------------+
|  Layer 3: On-Chain Financial Rails                                   |
|  EulerSwap Pools · Euler Lending Vaults · PSM                       |
|  AXAU NAV Engine · Commodity Registry                                |
+----------------------------------------------------------------------+
|  Layer 2: Compliance and Identity                                    |
|  ERC-3643 · Identity Registry · Claim Topics · Tiered Access        |
+----------------------------------------------------------------------+
|  Layer 1: Governance and Token                                       |
|  AXM Governance Token · Governance Safe · Timelock Controller       |
+----------------------------------------------------------------------+
```

### 2.2 Technology Layers

| Layer | Components |
|---|---|
| Presentation | Next.js (Pages Router) · 55 pages · Design Law UI System · Cormorant Garamond/monospace typography · Navy/Forest Green/Muted Gold palette |
| API | 133 Next.js API routes · Rate limiting · SIWE authentication · CORS enforcement |
| Intelligence | AME (Deterministic) · MIRDT (Probabilistic) · Sentinel (Authorization) · AI Oracle (Gemini) |
| Data | PostgreSQL (Neon) · Drizzle ORM · 339 tables |
| Blockchain | Arbitrum One · 84 automated control layers · Alchemy RPC · ethers.js / viem · Wagmi v2.19 · Reown AppKit v1.8 · SIWE |
| Banking (Capital Gate) | Increase.com: FDIC-insured ACH · First Internet Bank · BitGo CaaS: Institutional crypto custody · Multi-party authorization · Fiat-to-digital bridge |
| External Integrations | Google Gemini AI · Alpha Vantage · CoinGecko · Chainlink Oracles · RentCast · ATTOM Data · Stripe · Resend · Discord · Google Cloud Storage · Storacha (IPFS) · ElevenLabs |

---

## 3. Token Ecosystem

### 3.1 AXM — Governance Token

AXM is the ERC-20 governance and fee-routing token of the Axiom Protocol ecosystem. It is the primary governance instrument through which community members exercise authority over protocol parameters, commodity basket admission, capital allocation policies, and roadmap prioritization.

| Property | Value |
|---|---|
| Contract Address | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` |
| Standard | ERC-20 |
| Network | Arbitrum One |
| Status | Live |
| Governance Mechanism | Governance Safe (3-of-5 multi-party authorization) + Timelock Controller (24h) |

**AXM Functions:**
- **Governance voting** — Protocol parameter changes, commodity admission, capital policy
- **Fee routing** — Protocol fee revenue denominated or distributed in relation to AXM
- **Participation lockup** — AXM may be locked to obtain vote-escrowed SEED positions (1–4 year lockup schedules) for enhanced governance weight
- **Collateral** — AXM serves as collateral in the eAXM-1 Euler lending vault (supply-only mode)
- **Exchange** — Active AXM/AXUSD EulerSwap pool provides on-chain liquidity

### 3.2 Unified AXUSD — Protocol Stablecoin

Unified AXUSD is the canonical USD-pegged stablecoin of Axiom Protocol. It supersedes all prior AXUSD generations (GENIUS epoch, Euler epoch) and operates as the single active stablecoin for the ecosystem.

| Property | Value |
|---|---|
| Contract Address | `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` |
| Standard | ERC-3643 (T-REX) — Identity-gated transfers |
| Decimals | 18 |
| Max Supply | 1,000,000,000 AXUSD |
| Current Supply | 10,019.98 AXUSD |
| Reserve Mechanism | Canonical PSM (USDC 1:1) |
| PSM Address | `0xDB669bb6cA07215C5B055B62072AAED2F821E53F` |
| Mint/Redeem Fee | 10 basis points (0.10%) |
| PSM Debt Ceiling | 1,000,000 AXUSD |
| Status | Live |

**ERC-3643 Enforcement:** Every AXUSD transfer — including mints, redeems, and wallet-to-wallet transfers — passes through the Identity Registry's `isVerified()` check. Wallets without valid KYC and sanctions-clear claims cannot send or receive AXUSD regardless of transaction origin.

**Euler V2 Integration:**
- eAXUSD-6 (AXUSD lending vault): `0xacdA87801f6409bB5157BA78aF1BD9631d6609B2` — Supply + Borrow
- Euler Earn Vault (AXUSD yield): `0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B`
- USDC/AXUSD EulerSwap Pool: `0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8`
- AXM/AXUSD EulerSwap Pool: `0x981763699D269E129a08E216b1AeC7caa376A8a8`

### 3.3 AXAU — Gold Reserve Instrument

AXAU is Axiom Protocol's gold-anchored reserve instrument — an on-chain store of value backed by a governance-curated basket of real-world commodity reserves. Phase 1 is anchored entirely by gold via PAXG (Paxos Trust Company, NYDFS-regulated). The genesis mint occurred on April 2, 2026: 0.0013 PAXG minted 5.789977 AXAU at block 448396754 on Arbitrum One.

| Property | Value |
|---|---|
| Contract Address | `0xbcCA4D937d427829914498423aE6E04C846dB0Bb` |
| Standard | ERC-3643 (T-REX) — Identity-gated |
| Network | Arbitrum One |
| Reserve Asset (Phase 1) | PAXG — Paxos Gold |
| Coverage Floor | 105% minimum |
| Mint Premium | 5% above Backing NAV |
| Mint Fee | 0 bps (genesis) |
| Redeem Fee | 0 bps (genesis) |
| Current Supply | 5.789977 AXAU |
| Gold Reserve | 0.0013 PAXG |
| Status | Live — Phase 1 Active |

AXAU is not a stablecoin. Its USD value will fluctuate with gold and future commodity reserve market prices. For the complete AXAU technical specification — including the full NAV mathematical framework, seven-contract architecture, reserve phase design, oracle infrastructure, and governance framework — refer to `documents/axau-whitepaper.md`.

**AXAU Seven-Contract System (All Live on Arbitrum One):**

| Contract | Address | Role |
|---|---|---|
| AXAUTokenLite3643 | `0xbcCA4D937d427829914498423aE6E04C846dB0Bb` | ERC-3643 token |
| CommodityRegistry | `0x6D3aAa92793503B40b3F3593d2fCc409Ca610bDa` | Reserve component registry |
| AXGoldVault | `0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8` | PAXG reserve vault |
| LandNAVOracleMultiSig | `0x8FF5D66d4be4C107362e63f8E9E8283E8c5EA0Fc` | Land appraisal oracle (Phase 3, inactive) |
| AXLandVault | `0x66Aadce66a359609ec5E18fb3d8927a2363449cf` | Land reserve vault (Phase 3, inactive) |
| NAVEngine | `0x80F8634a43B26a2bd403396A42465F138aeCC519` | NAV computation engine |
| MintRedeemController | `0x036F05a3fB74d35439c074f25F691b36f5D37792` | Mint/redeem gateway |

### 3.4 Deprecated Tokens

The following tokens have been superseded and carry no new activity:

| Token | Address | Status |
|---|---|---|
| GENIUS AXUSD | `0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C` | Superseded by Unified AXUSD |
| Euler AXUSD | `0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c` | Superseded by Unified AXUSD |
| eAXUSD-4 | `0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059` | WITHDRAW_ONLY — hook config issue |

---

## 4. Reserve and Solvency Framework

### 4.1 AXUSD Reserve Hierarchy

AXUSD reserves are held across three segregated pools:

| Pool | Address | Role | Status |
|---|---|---|---|
| Canonical PSM | `0xDB669bb6cA07215C5B055B62072AAED2F821E53F` | Primary reserve — identity-gated; 10 bps fee | Live |
| Legacy GENIUS PSM | `0x5db58d9c21369d1532a48Bdd658E4Fe415404922` | Supplementary backstop from legacy epoch | Configured-Inactive |
| Backstop Vault (USDC) | `0x54438249457694eB5431811f3f19444Af0a01B29` | Emergency reserve; 24h timelock on withdrawals | Live |

### 4.2 Core Solvency Metrics

**Reserve Ratio (RR)**
```
RR = Total USDC Reserves / Canonical AXUSD Total Supply × 100

Total USDC Reserves = Canonical PSM USDC
                    + Legacy GENIUS PSM USDC
                    + Backstop Vault USDC
```
Target: RR ≥ 100% at all times. The protocol targets RR ≥ 105% under normal operations.

**Coverage Ratio (CR)**
```
CR = Treasury Total Assets / Total Protocol Liabilities
```

**Liquidity Buffer Ratio (LBR)**
```
LBR = Immediately Liquid Reserves / Total Protocol Liabilities
```
Immediately liquid reserves = Canonical PSM USDC only (excluding backstop vault with 24-hour timelock and legacy PSM).

### 4.3 Policy Thresholds

| Mode | CR Range | LBR Condition | Protocol Response |
|---|---|---|---|
| NORMAL | ≥ 1.05 | LBR ≥ 0.50 | No restriction |
| CAUTION | 1.00–1.05 | LBR ≥ 0.30 | Alert issued; remediation plan required within 48 hours |
| RESTRICTED | 0.90–1.00 | LBR < 0.30 | PSM debt ceiling frozen; new product launches paused |
| EMERGENCY | < 0.90 | Any | Emergency pause eligible; governance vote required |
| BOOTSTRAP | N/A | Early deployment | Current mode — no restrictions |

### 4.4 Adaptive Metrics Engine (AME)

The Adaptive Metrics Engine is the deterministic financial computation engine at the center of Axiom's solvency infrastructure. AME continuously computes regime scores, adaptive targets, and policy multipliers — providing a real-time systemic health signal that feeds into Sentinel's authorization layer.

AME's Hard Brake circuit breaker activates automatically when coverage falls below defined thresholds, pausing new capital deployment and triggering governance notification. This circuit breaker is fully automated — it does not depend on any off-chain action to engage.

### 4.5 Three-Mode Solvency Console

The Solvency Console at `axiomprotocol.app/solvency` provides three distinct views of protocol health calibrated for different counterparty types:

- **Allocator Mode** — Headline metrics: treasury NAV, AXUSD supply, reserve ratio, coverage ratio. Designed for investment committee review.
- **Clearinghouse Mode** — Expanded reserve breakdown, liquidity buffer composition, PSM utilization, stress scenario outputs.
- **Regulatory Mode** — Full formula disclosure with all input variables, liability classification, and methodology documentation.

### 4.6 AXAU Coverage Mechanics

The AXAU system maintains its own independent coverage floor. The `NAVEngine` contract enforces a 105% coverage ratio as a condition of every mint transaction. If post-mint coverage would fall below 10,500 basis points, the transaction reverts automatically. This operates entirely on-chain and cannot be overridden by any administrative key.

---

## 5. Real Asset Infrastructure

### 5.1 Land Acquisition Pipeline

The Physical Asset Pipeline is Axiom's framework for bridging digital capital to real-world asset acquisition. The pipeline encompasses the full land acquisition lifecycle from deal sourcing through governance-approved acquisition, title onboarding, and reserve integration.

**Pipeline Stages:**
1. **Sourcing** — Distressed property feed aggregates off-market, tax-delinquent, and bank-owned listings from third-party data sources (ATTOM Data, county records)
2. **Analysis** — Deal Intelligence system computes multi-exit underwriting, comps, and capital stack for each candidate
3. **Due Diligence** — Structured checklist system guides operators through physical and title due diligence
4. **Field Inspection** — Field Capture System (mobile-first) enables on-site walkthrough documentation with GPS-tagged deficiency reports
5. **Governance** — Qualified acquisitions are submitted to AXM governance for community approval
6. **Onboarding** — Approved acquisitions are recorded in the `AxiomLandAndAssetRegistry` automated control layer on Arbitrum One
7. **Reserve Integration** — In Phase 3, governed land positions may be deposited into the AXLandVault and incorporated into the AXAU reserve basket

### 5.2 Lending Fund

The Axiom Lending Fund is a private credit facility structured under SEC Regulation D, Rule 506(c), providing fix-and-flip and DSCR rental financing for real property acquisition and rehabilitation.

| Feature | Description |
|---|---|
| Structure | SEC Reg D 506(c) — Accredited Investors Only |
| Loan Types | Fix-and-Flip (short-term bridge) · DSCR Rental (term) |
| Loan Receipt | ERC-721 NFT issued per loan position |
| Vault Standard | ERC-4626 |
| Access Control | Lane A only (accredited investor credential required) |
| Status | Configured — Activation subject to governance approval |

### 5.3 Property Analysis Tool

The Property Analysis Tool at `/property` provides pay-per-report property analysis for verified participants. Reports integrate RentCast rental estimate data, Walk Score infrastructure, Craftsman cost database rehab estimates, and multi-exit underwriting outputs into a single institutional-grade acquisition assessment.

### 5.4 Deal Intelligence

The Deal Intelligence system at `/deal-intelligence` provides an operator-grade workspace for underwriting active acquisitions. It integrates the Craftsman Cost Intelligence Engine, Capital Readiness Card, AI Acquisition Memo Builder (Gemini-powered), and Multi-Exit Strategy Engine to support the full deal evaluation workflow.

**Eight Underwriting Strategies supported:**
Fix and Flip · BRRRR · Long-Term Rental (DSCR) · Short-Term Rental · Wholesale · Seller Finance · Land Contract · Subject-To

### 5.5 IVCEE — Underwriting Intelligence Engine

The Investment Value and Capital Efficiency Engine (IVCEE) provides allocator-grade underwriting intelligence by computing capital efficiency scores, risk-adjusted return profiles, and funding source compatibility assessments for real property acquisition candidates.

### 5.6 Field Capture System

The Field Capture System is a mobile-first walkthrough platform that enables property inspectors to document physical condition, identify deficiencies, and generate structured inspection records with GPS coordinates and photo documentation. All field data is written to the Field Intelligence database and accessible via the Founder Operations dashboard.

---

## 6. Intelligence Layer

### 6.1 Adaptive Metrics Engine (AME)

The AME is the deterministic financial computation layer of Axiom Protocol. Unlike probabilistic or AI-driven systems, AME produces deterministic outputs from defined inputs — every metric is a reproducible mathematical function of on-chain and off-chain inputs. AME governs:

- Coverage ratio computation and threshold classification
- Capital flow waterfall management
- Hard Brake circuit breaker logic
- Adaptive target generation for Sentinel

AME outputs are published via the `/api/solvency` route family and consumed by the Solvency Console, Sentinel, and MIRDT.

### 6.2 MIRDT — Capital Intelligence Terminal

The Market Intelligence and Risk Disclosure Terminal (MIRDT) is a nine-dimension advisory signal engine that monitors live protocol data streams and produces a composite Protocol Readiness Score (PRS, 0–10). MIRDT operates in advisory-only mode — it has no execution authority.

**Nine Signal Dimensions:**
1. Treasury Coverage Health
2. Reserve Ratio Trend
3. Liquidity Buffer Status
4. PSM Utilization Rate
5. Euler Vault Health
6. Market Volatility Index
7. Community Participation Rate
8. Governance Activity Signal
9. Operational Execution Score

All MIRDT outputs are advisory intelligence only. The Protocol Readiness Score is a composite readiness indicator, not a guarantee of capital performance. MIRDT reports are rendered with a Lexicon Guard layer that enforces institutional vocabulary compliance before any output is displayed.

### 6.3 Axiom Sentinel

Axiom Sentinel is the advisory capital decision layer that converts AME intelligence signals into governance recommendations with cryptographic audit trails. Sentinel classifies the protocol into one of four operational regimes:

| Regime | Trigger Condition | Capital Policy |
|---|---|---|
| STABLE | AME score ≥ 8.0; CR ≥ 1.05 | Full deployment authorized |
| CAUTION | AME score 6.0–8.0; CR 1.00–1.05 | Reduced deployment; enhanced monitoring |
| DEFENSIVE | AME score 4.0–6.0; CR 0.90–1.00 | Defensive posture; new deployment paused |
| EMERGENCY | AME score < 4.0; CR < 0.90 | Emergency governance session; pause eligible |

Sentinel currently operates in advisory-only mode. It has no authority to deploy capital without explicit community governance approval.

### 6.4 AI Oracle — Gemini Intelligence Layer

The AME AI Oracle is a Gemini-powered interpretation layer that provides natural-language explanations of AME metric outputs and MIRDT signal readings. It does not execute trades, authorize transactions, or override governance decisions. It translates deterministic metric outputs into plain-language institutional summaries for the Solvency Console and Observer dashboard.

---

## 7. Banking and Custody Infrastructure

### 7.1 Increase.com — FDIC-Insured Banking Rail

The primary fiat capital gateway for Axiom Protocol is the Axiom Nexus Account, provided through Increase.com and held at First Internet Bank (FDIC member).

| Property | Value |
|---|---|
| Provider | Increase.com |
| Bank | First Internet Bank |
| FDIC Insurance | Standard deposit insurance limits apply per account type |
| Rails | ACH · Wire Transfer |
| Participant Onboarding | Unique ACH reference codes per participant for payment attribution |
| Status | Live |

All capital-bearing participant activities flow through this banking layer. Fiat deposits are attributed to individual participant records via ACH reference codes, enabling precise on-chain-to-fiat reconciliation without requiring per-participant banking accounts.

### 7.2 BitGo CaaS — Institutional Crypto Custody

Institutional crypto asset custody is provided by BitGo CaaS (Custody-as-a-Service). BitGo provides multi-party authorization custody infrastructure for protocol treasury digital assets, LP deposits, and AXAU reserve holding operations where institutional custody is required.

| Property | Value |
|---|---|
| Provider | BitGo Trust Company |
| Model | Multi-party authorization (3-of-5 minimum) |
| Status | Configured — Active for treasury operations |

### 7.3 Hybrid Custody Model

Axiom operates a hybrid custody model that combines:
- **Non-custodial on-chain rails** — AXUSD, AXM, and AXAU held in participant wallets are entirely self-custodied; the protocol has no custody authority over participant holdings
- **Institutional custody** — Protocol treasury assets designated for institutional safekeeping are held under BitGo multi-party authorization
- **Banking custody** — Fiat reserves held in the Axiom Nexus Account are held by First Internet Bank under FDIC-insured conditions

---

## 8. Community Infrastructure

### 8.1 The Wealth Practice

The Wealth Practice is Axiom Protocol's structured group savings framework — a programmable, discipline-enforced community capital formation system with deterministic scheduling, participant-level transparency, and cryptographic audit trails.

| Property | Value |
|---|---|
| Format | Rotating contribution groups with fixed cycle schedules |
| Governance | Community-elected group administrators with on-chain permission controls |
| Trust Pipeline | Three-stage: Onboarding → Active → Governance-Eligible |
| Audit Trail | Every contribution, allocation, and distribution is cryptographically logged |
| Status | Staged Rollout |

The Wealth Practice is not an investment product. It does not generate yield, guarantee returns, or constitute a financial product as defined by securities law. It is a structured savings coordination mechanism with transparent controls and community governance.

### 8.2 Community Credit

The Community Credit system provides verified participants with access to the Capital Program — an entry-level capital facilitation framework designed to expand access to the Wealth Practice and real asset pipeline for participants who meet participation criteria but require capital access assistance.

### 8.3 Axiom Academy

The Axiom Academy is an educational and certification platform offering track-based educational content covering wealth-building fundamentals, on-chain financial participation, and the Wealth Practice methodology. Completion of designated tracks may result in the issuance of certification acknowledgments.

---

## 9. Capital Formation and Syndication

### 9.1 Syndication Module

The Axiom Syndication Module is a full-stack capital formation operating system for structuring, managing, and closing real asset acquisition offerings. It supports the complete offering lifecycle from structuring through subscription, closing, and post-close reporting.

**Syndication Capabilities:**
- Offering structuring with preferred return, waterfall, and GP/LP terms
- Subscription tracking with wire and ACH payment attribution
- KYC/accreditation gating for all LP subscribers
- Capital account ledger with distribution calculation engine
- SEC Reg D 506(c) compliance framework integration

### 9.2 LP Investor Portal

The Investor Portal at `/syndication` provides accredited LP participants with a dedicated view of their capital account, offering subscriptions, distribution history, and K-1/tax document access. The portal is gated at Lane A (accredited investor) access level.

### 9.3 Axiom Secondary Network V1

The Axiom Secondary Network is a permissioned secondary transfer, settlement, registry, and intelligence layer for Axiom-issued private market products. It enables verified participants to access secondary liquidity for protocol-issued instruments under defined regulatory conditions, with all transfers subject to the same ERC-3643 identity compliance enforcement as primary transfers.

### 9.4 Capital Accounting and Performance Intelligence

The Capital Accounting system provides a full-stack capital ledger for all protocol investment activities. It tracks capital deployed, interest accrued, fee revenue, distributions paid, and unrealized NAV for the Lending Fund and Syndication Module. Performance reporting is accessible via the Founder Operations dashboard.

---

## 10. DePIN Infrastructure

### 10.1 DeNet Integration

Axiom Protocol integrates with the DeNet decentralized storage network as its primary DePIN (Decentralized Physical Infrastructure Network) partner. DeNet nodes provide decentralized, censorship-resistant storage infrastructure for protocol documents, inspection records, and on-chain data archives.

| Property | Value |
|---|---|
| Partner | DeNet Storage Network |
| Integration | DePIN Node Suite — node registration, metering, and management |
| Payment | ETH + AXM accepted for node services (DePINNodeSales contract) |
| Status | Configured — Active Integration |

### 10.2 Node Economy

The DePIN node economy enables protocol participants to contribute storage infrastructure and receive node-based incentives. The `DePINNodeSuite` automated control layer manages node registration and metering. The `UtilityAndMeteringHub` automated control layer coordinates IoT-level resource metering for future infrastructure expansion.

---

## 11. Tiered Access and Verified Participant Architecture

### 11.1 Identity Framework

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

### 11.2 Claim Topics

| Topic ID | Name | Validity | Required For |
|---|---|---|---|
| 1 | KYC_VERIFIED | 365 days | All AXUSD and AXAU transfers · PSM mint/redeem |
| 2 | ACCREDITED_INVESTOR | 365 days | Lending Fund · Lane A products · LP Investor Portal |
| 3 | SANCTIONS_CLEAR | 180 days | All AXUSD and AXAU transfers |

### 11.3 Dual-Lane Architecture

| Lane | Access Level | Identity Requirements | Available Products |
|---|---|---|---|
| Lane A | Institutional / Accredited | Topics 1, 2, and 3 | All protocol products including Lending Fund, full Syndication, LP Portal |
| Lane B | Verified Standard | Topics 1 and 3 | Wealth Practice, AXUSD, AXAU, Community Credit, DePIN, Academy |

### 11.4 Claim Lifecycle

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

The IMF calls for "clear policy frameworks" and "international coordination." Axiom's ERC-3643 architecture and its posture structured with reference to the GENIUS Act framework reflects a deliberate effort to operate inside the emerging regulatory envelope. The three-topic claim system (KYC, Accredited Investor, Sanctions-Clear) implements the identity verification requirements that regulators are actively writing into law.

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

> *"Automated margin calls, real-time settlement, and programmable financial flows could accelerate liquidity stress during volatility. Traditional systems have built-in delays that act as shock absorbers. Tokenized systems may transmit stress instantly across participants."*

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

6. **GENIUS Act.** AXUSD and AXAU are structured with reference to the GENIUS Act framework and applicable digital asset regulatory guidance. This is a design intent, not a legal determination or compliance guarantee. Compliance posture remains subject to legal and operational review.

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
| **GENIUS Act** | US federal digital asset legislation | Use "structured with reference to the GENIUS Act framework." Never claim compliance. |

---

*Axiom Protocol White Paper v4.0 — Axiom Nexus LLC — April 3, 2026*
*Institutional Disclosure — Not Investment Advice*
*This document supersedes v2.0 (March 31, 2026), v3.0 (March 23, 2026), and v1.1 (March 30, 2026).*
*For the AXAU Reserve Instrument technical specification, see documents/axau-whitepaper.md.*
