# Axiom Protocol — Integrated Capital Stack
## How the Real Estate Pipeline, Community Capital Formation, and Banking Infrastructure Operate as a Single System

**Document Version:** 1.0
**Date:** March 2026
**Classification:** Institutional Reference
**Network:** Arbitrum One (Chain ID 42161)

---

## Table of Contents

1. Executive Summary
2. System Architecture: The Five Layers
3. The Capital Rail: Axiom Banking (Unit Finance + FDIC Insurance)
4. Layer 1 — Deal Origination: Distressed Property Feed and Wholesaler Submission
5. Layer 2 — Community Capital Formation: The Wealth Practice
6. Layer 3 — Underwriting and Intelligence: Deal Intelligence and Property Analysis
7. Layer 4 — On-Chain Credit Market: The Lending Fund
8. Layer 5 — Institutional Capital Formation: Syndications
9. How the Layers Connect: End-to-End Capital Flow
10. Compliance Architecture and Regulatory Positioning
11. Risk Controls and Transparency Mechanisms
12. Glossary of Institutional Terms

---

## 1. Executive Summary

Axiom Protocol is a governance-first wealth infrastructure platform designed to move community capital from savings coordination through institutional real asset acquisition. The platform connects five integrated operational layers — deal origination, community formation, property intelligence, on-chain credit markets, and syndicated institutional offerings — into a single, auditable capital stack.

The foundation of every capital-bearing interaction is the Axiom Banking infrastructure, built on Unit Finance's FDIC-insured banking rails. A verified, funded banking account is the required entry condition for any participant seeking to create a Wealth Practice group, launch a Syndication offering, or access credit. This banking gate is not a UX layer — it is a structural policy choice that ensures every participant moving capital has verified identity, FDIC-insured deposits, and a cleared fiat on-ramp before reaching any on-chain mechanism.

The result is a complete system: properties enter through the Deal Flow pipeline, are underwritten through Deal Intelligence, financed through the Lending Fund's on-chain credit market, and distributed to investors through the Syndications module — all anchored to community participants who have built track records through the Wealth Practice program.

This document describes each layer, its operating mechanics, and the precise integration points that connect them.

---

## 2. System Architecture: The Five Layers

The Axiom capital stack is organized into five sequential layers. Each layer gates the next, and all layers share the same banking infrastructure as a common foundation.

```
┌─────────────────────────────────────────────────────────┐
│         AXIOM BANKING INFRASTRUCTURE (Foundation)        │
│   Unit Finance FDIC-Insured Rail | BitGo Crypto Custody  │
└───────────────────┬─────────────────────────────────────┘
                    │ (Required for all capital-bearing actions)
     ┌──────────────┴──────────────────────────────────┐
     │                                                 │
┌────▼────────┐   ┌────────────────┐   ┌──────────────▼────┐
│  LAYER 1    │   │   LAYER 2      │   │    LAYER 3         │
│  Deal Flow  │──▶│ Wealth Practice│   │ Deal Intelligence  │
│  Origination│   │ Community Pools│   │ Property Analysis  │
└─────────────┘   └───────┬────────┘   └──────────┬────────┘
                          │                        │
                  ┌───────▼────────────────────────▼────────┐
                  │              LAYER 4                     │
                  │       On-Chain Lending Fund              │
                  │  AXIOMFixedLoan + AXIOMCreditMarket      │
                  └───────────────────┬─────────────────────┘
                                      │
                          ┌───────────▼───────────┐
                          │       LAYER 5         │
                          │    Syndications        │
                          │   LP Investor Portal   │
                          └───────────────────────┘
```

Each layer is operationally independent — a participant can engage any single layer without activating all others — but the layers are designed to compound: a community group that completes the Wealth Practice three-stage pipeline becomes a qualified pipeline candidate for the Syndications program. A distressed property that enters via the Deal Flow feed can be underwritten through Deal Intelligence, financed through the Lending Fund, and distributed as a syndicated offering to verified LP investors.

---

## 3. The Capital Rail: Axiom Banking (Unit Finance + FDIC Insurance)

**Route:** `/banking`
**Infrastructure:** Unit Finance API + BitGo CaaS (Custody as a Service)
**Regulatory Status:** FDIC-insured deposits (Unit Finance banking partner network)

### 3.1 What the Banking Layer Is

The Axiom banking integration is not a payments add-on. It is the foundational identity and capital verification layer for the entire platform. Every participant who intends to move fiat capital — into a Wealth Practice pool, into a Syndication, or through a loan — must first establish and fund a verified Unit Finance account.

Unit Finance provides:
- **FDIC-insured deposit accounts** through its banking partner network, up to the standard insurance limit
- **ACH transfer rails** for fiat deposits and withdrawals
- **Debit card issuance** for participants who elect it
- **KYC and identity verification** — Unit handles identity verification at account opening, satisfying AML/BSA baseline requirements before any capital commitment
- **Programmatic account management** through the Unit API, which Axiom uses to verify account existence, check available balances, and confirm deposit status before any capital-bearing operation is permitted

### 3.2 BitGo Institutional Crypto Custody

For participants and treasury operations that require institutional crypto custody, Axiom integrates BitGo CaaS (Custody as a Service):
- Multi-party authorization for large transactions
- Institutional-grade key management
- Policy-based spending controls
- On-chain settlement bridge connecting fiat deposits to AXUSD positions

The combination of Unit Finance (fiat) and BitGo (crypto) creates a bidirectional fiat-to-digital bridge. Fiat deposits clear through Unit ACH rails; digital asset custody and settlement routes through BitGo.

### 3.3 The Banking Gate in Practice

The `BankingRequiredGate` component is applied at the component level across three operational surfaces:

| Surface | Gate Applied | Required Condition |
|---|---|---|
| Wealth Practice — Create Group | Yes | Verified Unit account + funded deposit |
| Syndication — Create Offering | Yes | Verified Unit account + funded deposit |
| Lending Fund — Borrow Application | Yes | Verified Unit account |
| Lending Fund — LP Investment | Yes | Verified Unit account + accreditation |

When a participant attempts to create a Wealth Practice group or Syndication offering without a verified banking account, the platform presents the banking setup flow rather than the creation form. The gate checks account existence and available balance in real time via the Unit API before rendering any capital-bearing form.

This means no community pool, no syndication offering, and no credit application can be initiated without a participant whose identity has been verified and whose fiat capital is FDIC-insured and ready.

---

## 4. Layer 1 — Deal Origination: Distressed Property Feed and Wholesaler Submission

**Route:** `/distressed-feed`
**Purpose:** Aggregated distressed property pipeline with community submission layer

### 4.1 Two Origination Channels

Layer 1 has two distinct origination channels that feed the same database:

**Channel A — Automated Government Feeds**

The platform operates automated ingestion adapters for government real estate sources:

| Source | Type | Status |
|---|---|---|
| HUD HomeStore | Government REO | Automated (dependent on site availability) |
| Fannie Mae HomePath | GSE REO | Adapter built; API protection active |
| Freddie Mac HomeSteps | GSE REO | Adapter built; no public API |
| USDA Rural Development | Rural foreclosure | Adapter built; JS-rendered search |
| ATTOM Pre-Foreclosure | County-filed filings | Active with API key; covers NOD, Lis Pendens, NTS |

ATTOM is the primary production data source for the automated channel. It covers pre-foreclosure filings — Notice of Default, Lis Pendens, and Notice of Trustee Sale — with a 90-day lookback window across target states (GA, TX, NC, MS, AL, TN, SC, FL). ATTOM's dataset also includes REO inventory from Fannie Mae, Freddie Mac, and HUD properties that have progressed through the public record system.

**Channel B — Wholesaler Submission Portal**

The Submit Deal tab accepts direct submissions from verified wholesalers and community members. Required fields include submitter identity, property address, asking price, and contact information. Optional fields include ARV, rehab estimate, beds/baths/sqft, contract end date, and a description narrative.

Wholesale submissions are tagged with `source: 'wholesaler'` and enter the same normalized database as automated feed entries, making them searchable, filterable, and eligible for promotion to the Deal Intelligence workspace.

### 4.2 The Promote-to-Deal Action

Any listing in the feed — whether sourced from an automated government adapter or a wholesaler submission — can be promoted to Deal Intelligence via the "Promote to Deal" action. This action:

1. Creates a `deals` record in the database with the property's normalized data
2. Associates an initial underwriting strategy (default: BRRRR)
3. Redirects the operator to the full Deal Intelligence workspace at `/deal-intelligence/deal/[id]`

Promotion is the mechanism that moves a raw distressed listing from origination (Layer 1) into the full underwriting and analysis environment (Layer 3).

### 4.3 Buy Box Matching

Participants can define Buy Box criteria (state, distress type, property type, price range) associated with a wallet address. After each ingestion run, the system executes an automated matching sweep that compares all active listings against all registered Buy Boxes and assigns match scores. Matched listings are surfaced to Buy Box holders as pipeline candidates.

---

## 5. Layer 2 — Community Capital Formation: The Wealth Practice

**Route:** `/wealth-practice`
**Purpose:** Three-stage community capital trust pipeline
**Banking Gate:** Required to create a group
**Accreditation Required:** No (open entry)

### 5.1 What the Wealth Practice Is

The Wealth Practice is the community foundation layer of the Axiom capital stack. It is modeled on the traditional SUSU/savings circle principle — disciplined, recurring contributions from a defined group — but implemented with full on-chain accountability, programmable treasury controls, and institutional-grade reporting.

It is the platform's primary non-accredited entry point. Any participant with a verified banking account can initiate or join a Wealth Practice group without meeting accreditation thresholds.

### 5.2 The Three-Stage Trust Pipeline

Groups progress through three stages, each representing an increased level of capital coordination and institutional alignment:

**Stage 1 — Interest Hub**

An Interest Hub is a declared community of participants who share a regional focus and intent to pool capital. Formation requires no initial capital commitment. The Interest Hub stage establishes community identity, names the group, defines its geographic focus (Atlanta, Houston, Charlotte in the initial deployment), and begins the GEF (Graduated Execution Framework) scoring process for individual participants.

Purpose: Signal formation. No capital locked.

**Stage 2 — Purpose Group**

A Purpose Group is an active savings coordination unit. Members make recurring, tracked contributions into a shared pool. The pool is managed under defined treasury policy: contribution frequency, pool size targets, member count limits, and a stated capital purpose (typically a down payment toward land or residential acquisition).

All contribution and distribution activity is recorded on-chain, creating an auditable behavioral record. This record becomes the trust signal that qualifies a group for Stage 3.

Purpose: Active capital pooling. Fixed contribution schedule. GEF scores accumulate.

**Stage 3 — On-Chain Pool**

An On-Chain Pool is a graduated Purpose Group whose behavioral record — contribution consistency, pool growth, member retention — meets the threshold for institutional capital formation. At this stage, pooled capital can be directed toward:
- Community land acquisition votes (governance-gated)
- Participation in the Syndications program as a community capital contributor
- Lending Fund junior tranche consideration

Purpose: Institutional-grade capital unit. Eligible for Syndication pipeline.

### 5.3 The Wealth Practice → Syndication Pathway

Groups that complete the three-stage pipeline are surfaced as qualified pipeline candidates in the Syndications module. This is the governed pathway for community capital to enter institutional real estate offerings without requiring each individual member to meet accreditation requirements independently. The group's on-chain behavioral record — contribution history, GEF scores, pool size — functions as the due diligence signal for syndication pipeline consideration.

This pathway is the platform's primary mechanism for converting community savings discipline into institutional capital participation.

---

## 6. Layer 3 — Underwriting and Intelligence: Deal Intelligence and Property Analysis

**Routes:** `/deal-intelligence`, `/property-analysis`
**Purpose:** Institutional-grade underwriting workspace for promoted listings

### 6.1 Deal Intelligence Workspace

Once a distressed listing is promoted from the Deal Flow feed, it enters the Deal Intelligence workspace. This workspace provides a complete underwriting environment organized around a promoted deal record:

**Multi-Exit Strategy Engine**
Eight underwriting strategies with parameterized inputs and comparative output ranking:
- BRRRR (Buy, Rehab, Rent, Refinance, Repeat)
- Fix & Flip
- Wholesale Pass-Through
- Seller Finance / Subject-To
- Long-Term Hold
- Short-Term Rental
- Seller Finance
- Land Assemblage

Each strategy produces a standardized output set: acquisition cost, rehab budget, total invested capital, projected return, hold period, exit timing, and IRR estimate. The engine uses the Craftsman National Construction Estimator (NCE) cost database (57 reference costs seeded in `rehab_cost_benchmarks`) for deterministic rehab estimates.

**AI Acquisition Memo Builder**
Gemini-powered institutional acquisition memo generator. Given a promoted deal record, it produces a structured memo with property narrative, market context, underwriting assumptions, risk factors, and proposed capital structure — formatted for allocator-grade review.

**Document Ingestion and Extraction**
AI-powered document analysis accepts uploaded PDFs (inspection reports, title commitments, appraisals, environmental reports) and extracts structured data into the deal record.

**IVCEE — Institutional Viability and Capital Efficiency Engine**
An allocator-grade underwriting intelligence engine that scores each deal across capital efficiency, exit viability, and risk-adjusted return dimensions. Output is a structured IVCEE report appended to the deal record.

**Due Diligence Checklist**
Structured DD workflow with checkbox tracking, assignable items, and completion status linked to the deal record.

**Field Capture (Layer 5)**
Mobile-first walkthrough system for in-person property inspections. Tap-optimized condition buttons, real-time rehab cost binding from the NCE database, voice note capture, and unit replication engine for multifamily properties. Offline-first draft save with session completion summary.

### 6.2 Property Analysis Tool

**Route:** `/property-analysis`

The Property Analysis Tool provides a pay-per-report property intelligence product with three access tiers:

| Tier | Cost | Output |
|---|---|---|
| Free | No cost | Address verification, public data summary |
| Base | Paid | Full AVM, comparable sales, rental estimate, Walk Score |
| Premium | Paid | Full Base output + IVCEE scoring + acquisition memo outline |

Data sources include RentCast API (rental market and AVM), Walk Score API (walkability and transit), and on-chain registry data. The tool is available without wallet connection for the free tier; paid tiers require Stripe payment and optional wallet authentication.

---

## 7. Layer 4 — On-Chain Credit Market: The Lending Fund

**Route:** `/lending-fund`
**Regulatory Status:** SEC Reg D 506(c) — Accredited Participants Only (LP investment)
**Borrow side:** Accreditation not required at application; required upon credit approval
**On-chain contracts:** Arbitrum One (Chain ID 42161)

### 7.1 Two-Contract Architecture

The Lending Fund operates through two production automated control layers deployed and verified on Arbitrum One:

**AXIOMFixedLoan** — `0x511A0cD642532585dc87e41C84f7f499a9755511`

The fixed-term loan engine. Manages the full loan lifecycle:

| Parameter | Specification |
|---|---|
| Repayment modes | AMORTIZED, INTEREST_ONLY |
| Draw tranches | Up to 3 per loan |
| Maximum rate | 5,000 BPS (50% APR hard cap) |
| Loan states | PENDING → APPROVED → ACTIVE → DELINQUENT → DEFAULTED → REPAID → CLOSED / CHARGED_OFF |
| Accrual | `accrueAfterMaturity` flag for post-maturity interest |
| Delinquency | `daysDelinquent()` computed from installment schedule |
| Schedule | `paymentSchedule()` and `nextPaymentDue()` are public view functions |
| Charge-off | `chargeOffLoan()` function; triggers `writeDownOutstanding()` on CreditMarket |
| Early close | `closeUndrawnApprovedLoan()` for approved-but-undrawn facilities |

**AXIOMCreditMarket** — `0x85074a74774568692128eE97Da661Fe49dcF5fE4`

The ERC-3643 (T-REX) gated LP liquidity pool. Manages LP capital and distribution:

| Parameter | Specification |
|---|---|
| Access gate | ERC-3643 identity verification (KYC/accreditation check on-chain) |
| LP distribution | `interestPerShare` pro-rata mechanism |
| Reserve ratio | Configurable; enforced on withdrawal |
| Disbursement | `disburseCommittedLiquidity()` — callable only by AXIOMFixedLoan (no operator-callable disbursement) |
| Repayment | `receiveRepayment()` with `ArithmeticInvariantViolation` guard |
| Write-down | `writeDownOutstanding()` triggered on charge-off |
| Wiring | Bidirectional authorization confirmed on-chain: FixedLoan references CreditMarket; CreditMarket accepts FixedLoan calls |

The architecture enforces a strict principal-agent hierarchy: LP capital in the CreditMarket can only be disbursed by an approved loan in AXIOMFixedLoan. Operators cannot manually withdraw or redirect committed liquidity.

### 7.2 Loan Product

The Lending Fund provides short-term bridge capital for real asset acquisition. Primary use cases:

- **Acquisition financing:** Short-term capital to purchase a distressed property at auction or from a wholesaler pending longer-term financing
- **Rehabilitation financing:** Tranche-based draws released against documented renovation milestones
- **Refinance bridge:** Capital bridging a BRRRR exit while permanent financing is arranged

Loan applications enter the system with `PENDING` state. The credit review process includes underwriting of the deal record (typically promoted from Deal Intelligence), borrower GEF score review, and Unit account verification. Approved loans move to `APPROVED` state; borrowers draw tranches as needed.

### 7.3 LP Investment

LP capital flows into the AXIOMCreditMarket pool from accredited participants who have:
1. Verified identity via Unit Finance KYC
2. Confirmed accreditation status (SEC Reg D 506(c) — Rule 506(c) requires affirmative verification)
3. Completed AXUSD deposit into the platform's treasury prior to pool entry

LP returns are distributed through the `interestPerShare` mechanism — interest paid by borrowers accrues to the pool and is distributed pro-rata to LP positions. All distributions are on-chain and auditable.

### 7.4 Fail-Closed Fund Flow

The API layer enforces fail-closed fund flow: before any loan is approved, the API verifies the loan's current state via `getLoan().state`. If the state is not `PENDING`, the approval is rejected without any blockchain transaction being submitted. Repayment idempotency is enforced via transaction hash deduplication — duplicate repayment submissions are detected and rejected.

---

## 8. Layer 5 — Institutional Capital Formation: Syndications

**Routes:** `/syndication`, `/syndication/portal`
**Regulatory Status:** SEC Reg D 506(c) — Accredited Participants Only
**Banking Gate:** Required to create a Syndication offering

### 8.1 What Syndications Is

The Syndications module is the platform's primary vehicle for institutional-grade real estate capital formation. It allows verified deal sponsors to structure and offer private placement real estate investments to a pool of accredited investors.

Syndications is the bridge between the deal origination and underwriting layers (Layers 1 and 3) and institutional investor capital. A deal that has been promoted, underwritten through Deal Intelligence, and sized through the multi-exit strategy engine can be structured as a Syndication offering.

### 8.2 Offering Structure

Each Syndication offering records:
- Property address and deal record linkage
- Total raise target and minimum LP commitment
- Projected return and distribution schedule (clearly labeled variable)
- Hold period and exit strategy
- Offering documents and DD materials
- KYC/accreditation verification requirements for LP onboarding

Offering creation is gated behind the `BankingRequiredGate`: the sponsor must have a verified Unit Finance account and funded deposit before the creation form is presented. This ensures the capital chain — from LP deposit through sponsor custody through deal execution — is anchored to verified, FDIC-insured accounts at every node.

### 8.3 The LP Investor Portal

**Route:** `/syndication/portal`

The Investor Portal provides accredited LP investors with:
- Portfolio view of active and historical syndication participations
- Distribution tracking and capital account statements
- K-1 document generation for tax reporting
- Secondary transfer initiation (subject to Axiom Secondary Network rules)

### 8.4 Axiom Secondary Network

Syndication LP positions are eligible for secondary transfer through the Axiom Secondary Network V1 — the platform's permissioned secondary market. Key business rules:
- **10-check compliance gate** before any transfer is approved
- **0.5% platform fee** on all secondary transfers
- **180-day hold period** from initial investment before secondary transfer eligibility
- **NAV discount review** for any position offered below par
- **Atomic beneficial ownership registry update** on every settlement — the registry cannot advance to a new state without completing the prior state update

### 8.5 Wealth Practice → Syndication Pathway

Syndications is the institutional layer that graduated Wealth Practice groups can access. An On-Chain Pool with a documented contribution record becomes a qualified pipeline candidate — not as an individual accredited investor, but as a community capital unit that the syndication structure can accommodate. The on-chain behavioral record from the Wealth Practice functions as the diligence signal.

This pathway is the platform's resolution to the accreditation barrier: community participants build track records through the Wealth Practice, and those records qualify their pools for consideration in institutional offerings without requiring each individual member to independently meet SEC accreditation thresholds.

---

## 9. How the Layers Connect: End-to-End Capital Flow

The following narrative traces a complete deal from entry to investor distribution:

### 9.1 Property Entry

A distressed property enters the platform through one of two channels:
1. **Automated feed:** ATTOM ingestion identifies a lis pendens filing in Fulton County, GA. The property is normalized and inserted into the `distressed_listings` table with `distress_type: 'lis_pendens'`, `source: 'attom'`.
2. **Wholesaler submission:** A verified wholesaler submits a property with a signed purchase agreement, asking price, and ARV estimate through the `/distressed-feed` Submit Deal tab.

### 9.2 Buy Box Match

The post-ingestion matching sweep compares the new listing against all registered Buy Boxes. A participant whose Buy Box specifies GA, lis pendens, single family, max $200,000 receives a match notification. The listing is surfaced in their filtered feed view.

### 9.3 Promotion to Deal Intelligence

An operator promotes the listing to Deal Intelligence. This creates a `deals` record with the property's normalized data and opens the full underwriting workspace. The operator:
1. Runs the Multi-Exit Strategy Engine to evaluate BRRRR, Fix & Flip, and Hold scenarios
2. Uploads a preliminary title commitment — the AI extraction engine pulls the chain of title into the deal record
3. Generates an AI Acquisition Memo for internal review
4. Requests a Base-tier Property Analysis report to confirm the AVM and rental estimate
5. Completes the Due Diligence Checklist

### 9.4 Credit Application

The operator — now a borrower — submits a loan application through the Lending Fund. The application references the deal record. The credit review confirms:
- GEF score meets minimum threshold
- Unit Finance account is verified and funded
- Deal Intelligence workspace shows a completed DD checklist and acquisition memo

The loan is approved: `AXIOMFixedLoan` state moves from `PENDING` to `APPROVED`. The credit market commits liquidity. The borrower draws Tranche 1 (acquisition capital). On closing, the property is acquired.

### 9.5 Rehabilitation and Tranche Draws

The borrower submits milestone documentation. Tranche 2 (rehab capital, Phase 1) is drawn upon review. Tranche 3 (rehab capital, Phase 2) follows on completion of Phase 1 milestones. The Field Capture system provides documented walkthrough records that serve as on-platform milestone evidence.

### 9.6 Syndication Offering

With a rehabbed asset in hand, the operator structures a Syndication offering:
1. Links the deal record to the new offering
2. Sets the raise target, minimum LP, projected distribution schedule, and hold period
3. Uploads offering documents through the Syndications workspace

LP investors — including verified On-Chain Pools from the Wealth Practice that have graduated to Stage 3 — are presented with the offering through the Investor Portal. Qualified participants commit capital. AXUSD transfers from LP accounts to the offering treasury.

### 9.7 Loan Repayment and LP Distribution

As the asset generates cash flow (rental income or a disposition event), the borrower repays the Lending Fund loan. `AXIOMFixedLoan` records each repayment; `AXIOMCreditMarket.receiveRepayment()` updates the pool. Interest accrues to the `interestPerShare` register and is distributed pro-rata to LP positions. On full repayment, the loan state moves to `REPAID` and the facility is closed.

Syndication investors receive distributions through the Investor Portal and can access K-1 documents for tax reporting at year end.

---

## 10. Compliance Architecture and Regulatory Positioning

### 10.1 Securities Framework

| Module | Regulatory Framework | Access |
|---|---|---|
| Lending Fund — LP investment | SEC Reg D 506(c) — Accredited Participants Only | Affirmative accreditation verification required |
| Syndications — LP participation | SEC Reg D 506(c) — Accredited Participants Only | Affirmative accreditation verification required |
| Wealth Practice — group creation | No securities offering | Open; banking verification required |
| Deal Flow — feed access | Not a securities offering | Open; no accreditation |
| AXUSD | ERC-3643 T-REX compliant | KYC gated at identity registry level |

### 10.2 GENIUS Act Alignment

AXUSD is designed to align with the framework outlined in the GENIUS Act for payment stablecoins. It is ERC-3643 compliant, meaning every transfer involves an identity check at the automated control layer level. The identity registry maintains allowlisted wallet addresses; unlisted wallets cannot receive or transfer AXUSD tokens.

No definitive legal conclusion is offered regarding classification. Participants are directed to the `/disclosure` page for the canonical institutional disclosure document.

### 10.3 KYC Architecture

KYC operates at two levels:

**Fiat-side KYC:** Unit Finance handles identity verification at account opening. This satisfies AML/BSA baseline requirements for participants operating through the fiat banking rail.

**On-chain KYC:** ERC-3643 identity verification operates at the automated control layer level for AXUSD transfers and AXIOMCreditMarket LP positions. The on-chain identity registry maintains verified wallet addresses; the registry is separate from the Unit Finance verification but can be synchronized through the platform's bridge service.

### 10.4 Solvency Transparency

The `/solvency` page provides a three-mode institutional solvency console. It ingests a single canonical snapshot from the `/api/solvency/latest` endpoint and derives all headline numbers from that snapshot:
- Treasury balance
- Liabilities
- Coverage Ratio (CR)
- Reserve Ratio (RR)
- Liquidity Buffer Ratio (LBR)
- Policy mode (conservative / standard / recovery)

The Snapshot ID and timestamp are displayed at the top of every solvency view, making each report independently auditable. Allocators can reference a specific Snapshot ID in diligence materials.

---

## 11. Risk Controls and Transparency Mechanisms

### 11.1 On-Chain Automated Control Layers

Axiom operates 72 verified automated control layers on Arbitrum One. Key controls relevant to the capital stack:

| Control Layer | Function |
|---|---|
| AXIOMFixedLoan state machine | Enforces loan lifecycle; prevents disbursement without APPROVED state |
| AXIOMCreditMarket disbursement guard | `onlyFixedLoan` modifier — no operator-callable disburse; LP capital cannot be redirected outside the loan lifecycle |
| ArithmeticInvariantViolation guard | Protects pool arithmetic on repayment; reverts on balance inconsistency |
| ERC-3643 identity registry | Prevents AXUSD transfer to unlisted wallets; KYC enforced at transfer |
| MAX_RATE_BPS (5,000) | Hard-caps loan interest at 50% APR regardless of parameter input |

### 11.2 API Fail-Closed Design

The Lending Fund API layer enforces fail-closed fund flow at every capital-bearing endpoint:
- **State check before approval:** `getLoan().state` must equal `PENDING` before any approval action is submitted on-chain
- **Repayment idempotency:** Transaction hash deduplication prevents double-counting of repayment events
- **Banking verification before form render:** The `BankingRequiredGate` checks Unit account status before presenting any capital-bearing form to the participant

### 11.3 Proof of Execution

The Proof of Execution dashboard tracks all platform paper trading and capital deployment activity with deterministic, auditable records. It is accessible at `/proof-of-execution` and serves as the operational track record for institutional diligence.

### 11.4 Agent Governance System

Autonomous agent actions within the platform operate under a policy-based authorization system. No agent-initiated capital movement proceeds without an explicit governance authorization from the Agent Governance System. This prevents autonomous runaway execution in AI-assisted underwriting or capital routing contexts.

### 11.5 Active Contract Verification

The platform operates an Active Contract Verification System that monitors AXUSD and PSM contract addresses for integrity. Any address mismatch between the on-chain registry and the platform's configuration triggers an alert and can halt associated operations.

---

## 12. Glossary of Institutional Terms

| Term Used | Standard Term | Definition |
|---|---|---|
| Automated control layer | Smart contract | Self-executing code deployed on Arbitrum One |
| Multi-party authorization | Multi-signature | Transaction requiring multiple independent approvals |
| On-chain financial rails | DeFi | Decentralized financial infrastructure |
| Asset onboarding / issuance | Tokenization | The process of representing a real-world asset on-chain |
| Participation lockup | Staking | Capital committed to governance in exchange for protocol weight |
| Variable | APY (as a guaranteed figure) | Rate of return; not fixed; subject to market conditions |
| Designed to align with | Compliant with | The platform is designed to align with regulatory frameworks; no definitive legal conclusion is offered |
| GEF | Graduated Execution Framework | Behavior-based qualification system that gates platform feature access |
| IVCEE | Institutional Viability and Capital Efficiency Engine | Allocator-grade underwriting scoring engine |
| MIRDT | Market Intelligence and Risk Disclosure Terminal | Probabilistic trend-following analysis tool |
| NOD | Notice of Default | Pre-foreclosure filing indicating borrower default |
| NTS | Notice of Trustee Sale | Pre-foreclosure filing scheduling an auction |
| Lis Pendens | Lis Pendens | Pending legal action against a property title |
| REO | Real Estate Owned | Property repossessed by a lender after foreclosure |
| T-REX | Token for Regulated Exchanges | ERC-3643 standard for compliant real-world asset issuance |

---

*This document is for institutional reference purposes. It does not constitute investment advice, a securities offering, or a legal opinion. All capital-bearing activities on the Axiom Protocol are subject to the disclosures available at axiomprotocol.app/disclosure. Regulatory frameworks referenced are described as design targets; no definitive compliance conclusion is offered. SEC Reg D 506(c) participation requires independent verification of accreditation status.*

*Axiom Protocol — axiomprotocol.app*
*Network: Arbitrum One | Chain ID 42161*
*Document Version: 1.0 — March 2026*
