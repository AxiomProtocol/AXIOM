# Axiom Protocol
## Technical White Paper v5.0

**Classification:** Public — Institutional Disclosure Document
**Version:** 5.0
**Publication date:** April 22, 2026
**Network of record:** Arbitrum One (Chain ID 42161)
**Issuer entity:** Akili Group (Axiom Protocol)
**Document scope:** Capital infrastructure architecture, reserve and solvency framework, real-asset onboarding pipeline, banking and custody rails, governance, and risk controls as currently deployed and verifiable on chain and in operator systems.

---

## Table of Contents

1. Executive Summary
2. Design Principles and Operating Posture
3. System Architecture — The Seven Layers
4. Token Stack (AXM, AXUSD, AXAU)
5. Reserve, Solvency, and the Adaptive Metrics Engine
6. Capital Infrastructure Backend (capinfra)
7. Real Asset Pipeline — From Source to On-Chain
8. Banking, Custody, and Payment Rails
9. Trust Stack — Failure Modes and Their Specific Mitigations
10. Intelligence Layer (MIRDT, Sentinel, Observer, IVCEE)
11. Community Capital — The Wealth Practice
12. Governance and Authorization Architecture
13. Card Onramp and User Funding Paths
14. Risk Framework and Emergency Controls
15. Proof of Execution
16. Forward Roadmap
17. Disclosures and Definitions

---

## 1. Executive Summary

Axiom Protocol is a governance-first financial operating system for real-asset ownership. It exists to convert disciplined off-chain execution — community land acquisition, USDA-supported development work, structured private credit — into a programmable, audit-traceable system that can scale without abandoning the discipline.

The protocol is built around five non-negotiable design choices:

1. **Self-custody by default.** The user is always the asset of record. No protocol contract holds user funds in a discretionary capacity. Custodial paths are explicitly labeled and bounded by multi-party authorization.
2. **No bridges.** Axiom does not use third-party bridge contracts to move value between chains. Cross-chain settlement is structured through audited, identity-gated rails, not through composable bridge attack surface.
3. **Fail-closed, not fail-open.** Every chokepoint — oracle staleness, reserve attestation gaps, redemption integrity failures, withdrawal-rate spikes — defaults to halting the affected operation. Recovery requires explicit, logged, multi-party action.
4. **Verifiable, not advertised.** Every public claim on the protocol surface maps to a chain transaction, an audit document, or a public solvency snapshot. Claims that cannot be verified by clicking through are not made.
5. **Allocator-grade language.** Public communication uses institutional vocabulary. The protocol is "automated control layers, multi-party authorization, on-chain financial rails," not "smart contracts and DeFi." Marketing terms that overstate maturity are explicitly forbidden in the canonical glossary.

The protocol stack today comprises:

- **AXM** — ERC-20 governance token on Arbitrum One.
- **AXUSD** — ERC-3643 compliant settlement stablecoin with on-chain identity, automated KYC, and an ERC-7726 oracle perspective for use as Euler V2 vault collateral.
- **AXAU** — Live mainnet reserve instrument minted and redeemed against PAXG (gold) and a LandNAVOracle, with conservative loan-to-value and a dedicated MintRedeemController.
- **Capital Infrastructure Backend (capinfra)** — Modular monolith spine that holds the canonical asset registry, unified identity projection, deterministic version-stamped policy evaluator, market-data ingestion with built-in staleness chokepoints, append-only audit event ledger, and operator console foundation.
- **Banking layer** — Increase.com (FDIC-insured ACH/wire rails) for primary banking and treasury funding, BitGo CaaS for institutional Arbitrum custody, Coinbase Onramp for consumer card payments (card → USDC → PSM → AXUSD/AXAU).
- **Real-asset pipeline** — Property Analysis Tool, Distressed Property Feed, Multi-Exit Strategy Engine, Due Diligence Checklist, Craftsman Cost Database, Capital Readiness Card, AI Acquisition Memo Builder, Field Capture System, Syndication Module, and LP Investor Portal.
- **Trust Stack** — A public-facing surface (`/trust` and five sub-pages) that maps every common DeFi failure mode to the specific Axiom protection that prevents it, each backed by a verifiable artifact.

The remainder of this document is the technical specification of how those components fit together, what controls govern them, what fails closed, and where each claim can be independently verified.

---

## 2. Design Principles and Operating Posture

### 2.1 Self-Custody by Default
Axiom does not custody user assets unless that custody path is named, gated, and bounded. The default user experience is wallet-native (Reown AppKit + Wagmi v2 + SIWE on Arbitrum One and Base 8453). Where institutional custody is required (BitGo CaaS), the custodial relationship is disclosed, the operator has multi-party authorization on withdrawals, and the underlying assets are reflected on the public solvency snapshot.

### 2.2 No Bridges
Bridge contracts are the single largest source of catastrophic loss in on-chain finance. Axiom does not deploy or rely on third-party bridge contracts for settlement. Cross-chain movement, when it occurs, is mediated by the Axiom Rail (Stellar SEP-compliant anchor) for USDC/AXUSD/AXAU, with identity verification on both sides. The forward Universe Blockchain (L3) migration is structured as a settlement-layer migration, not as a bridged asset wrapping. This commitment is made publicly verifiable on `/trust/no-bridges`.

### 2.3 Fail-Closed Chokepoints
The following chokepoints flip the affected operation to RED automatically and require explicit operator action to restore:

| Chokepoint | Trigger | Effect |
| --- | --- | --- |
| Oracle staleness | `observedAt` age exceeds per-asset budget | `recordIntegrityFailure(kind='oracle_stale')` flips `cap_assets.collateral_class` to RED, emits `collateral.integrity_failed` audit event |
| Reserve attestation gap | Attestation not refreshed inside policy window | `recordIntegrityFailure(kind='reserve_attestation_failed')` |
| Redemption integrity | Redemption path emits a discrepancy | `recordIntegrityFailure(kind='redemption_failed')` |
| Withdrawal velocity | Window-based rate exceeds policy ceiling | `WithdrawalRateLimiter` consumer denies further redemptions in window |
| Bridge proposal | Allow-list proposal opened | Asset enters governance review; transit denied until quorum |

All of the above are write-through to the append-only audit event ledger and surface on the operator console.

### 2.4 Verifiable Claims
The canonical glossary at `lib/glossary.ts` defines the language Axiom is allowed to use about itself. Forbidden constructions include unqualified physical-asset claims, absolutist positioning ("only platform"), and wealth outcome promises. GENIUS Act references must say "designed to align with," never "compliant." The `/disclosure` page renders the canonical solvency snapshot and links every headline number back to its source.

---

## 3. System Architecture — The Seven Layers

Axiom is organized as seven layers. Layer 00 (Axiom Rail / Stellar) is the payment-anchor edge; Layer 6 is the user-facing application surface. The layered model is deliberate: no layer reaches across two boundaries, and each layer exposes a constrained set of typed operations to the layer above.

```
Layer 6 — Application Surface (Next.js, Design Law UI, Operator Console)
Layer 5 — Capture (Field Capture, Document Ingestion, Property Analysis)
Layer 4 — Intelligence (MIRDT, Sentinel, Observer, IVCEE, AME)
Layer 3 — Capital Programs (Lending Fund, Syndication, Capital Accounting, Wealth Practice)
Layer 2 — Reserve and Issuance (AXAU MintRedeemController, AXUSD ERC-3643, PSM)
Layer 1 — Settlement and Custody (Arbitrum One contracts, BitGo CaaS, Increase)
Layer 00 — Axiom Rail (Stellar SEP-compliant anchor for USDC/AXUSD/AXAU)
```

Each layer's contract surface is enumerated in `documents/cap-infra/README.md` and surfaced visually on `/system-map` via the `AxiomArchitectureDiagram` component. The diagram is rendered identically wherever it appears so operators and allocators see one canonical capital flow.

---

## 4. Token Stack

### 4.1 AXM — Governance Token
Standard ERC-20 on Arbitrum One. Used for governance signaling, participation lockup, and policy-engine voting weight. AXM does not represent a claim on protocol reserves and is not a security in its current form.

### 4.2 AXUSD — Settlement Stablecoin (ERC-3643)
AXUSD is the unified settlement stablecoin. The migration from a dual-ecosystem layout to a single ERC-3643 issuance is complete. Key properties:

- **Identity-gated transfer.** Every transfer checks an on-chain identity claim issued through the OnChain ID system.
- **Automated KYC.** Issuance and redemption flows compose with the identity registry; ineligible recipients cannot receive AXUSD.
- **Oracle-perspective adapter.** ERC-7726 adapter exposes AXUSD to Euler V2 as a perspective-verified collateral asset for the AXUSD Lending Markets.
- **PSM (Peg Stability Module).** Provides 1:1 mint/redeem against verified USD reserves, gated by the integrity chokepoints in Section 2.3.

### 4.3 AXAU — Reserve Instrument (Live Mainnet)
AXAU is the protocol's reserve instrument. It is collateralized against PAXG (tokenized gold) and a LandNAVOracle that values protocol-owned and pipeline-bound real estate. Mint and redeem flow through the `MintRedeemController`, which enforces conservative loan-to-value parameters and routes against integrity chokepoints. Operational paths for AXUSD → AXAU purchase are managed through an operational queue with a simplified user front-end.

---

## 5. Reserve, Solvency, and the Adaptive Metrics Engine

### 5.1 The Solvency Console
Axiom operates a three-mode institutional solvency console. The canonical snapshot lives at `/api/solvency/latest` and is consumed by `/disclosure` and the operator surface. Headline metrics derived from the snapshot:

- **Coverage Ratio (CR)** — total reserves divided by total liabilities at snapshot time.
- **Reserve Ratio (RR)** — reserves available to redemption per outstanding stable units.
- **Liability-Backed Ratio (LBR)** — explicit liability backing for AXUSD outstanding.
- **Liability Distribution (LD)** — distribution of liabilities across asset classes.

Every formula is published in the Definitions section of `/disclosure`. No headline number on the public site is derived from anything other than the canonical snapshot identifier.

### 5.2 Adaptive Metrics Engine (AME)
AME is the deterministic financial computation engine. Inputs are version-stamped; outputs are reproducible. The AME AI Oracle consumes AME outputs to produce ranked operational signals but cannot bypass AME — it can only annotate. This separation is intentional: deterministic math first, AI commentary second.

### 5.3 Integrity Chokepoints in the Reserve Path
Reserve-attestation failures and redemption failures both flow through `recordIntegrityFailure` with their respective kinds (`reserve_attestation_failed`, `redemption_failed`). The reserve service treats these as edge-triggered: when triggered, the affected asset's `collateral_class` flips to RED until an operator clears the integrity event with a documented justification.

---

## 6. Capital Infrastructure Backend (capinfra)

`capinfra` is the modular-monolith spine. Its responsibilities:

- **Canonical asset registry** (`cap_assets`) — every asset has a stable id, intent, classification (`collateral_class` ∈ {GREEN, AMBER, RED}), oracle staleness budget, and rationale string.
- **Unified identity projection** — projects identity state from upstream sources (OnChain ID, KYC providers, off-chain attestations) into a single read model used by all downstream services.
- **Deterministic policy evaluator** — version-stamped. Every policy decision records which policy version produced it, so historical decisions can be reproduced.
- **Market-data ingestion** — `lib/capinfra/marketData.ts::ingestPrice` performs divergence checks, then a staleness check that compares the inbound observation's age against the per-asset oracle staleness budget. Stale ingests trigger a fire-and-forget `recordIntegrityFailure(kind='oracle_stale')` while the snapshot is still persisted as the truthful upstream record.
- **Append-only audit events** — every state change emits an event with `payloadJson`, `reasonCode`, and `actor`. The ledger is the system of record for compliance review.
- **Operator console foundation** — the typed endpoint set under `/api/capinfra/*` is the contract between the backend and the operator UI.

The smoke harness `scripts/capinfra-smoke.ts` runs 77 end-to-end checks against a live process. Each check is idempotent and re-runnable. Check #57 covers the card-deposit path; check #77 covers the oracle-staleness auto-freeze flow.

---

## 7. Real Asset Pipeline — From Source to On-Chain

The land-acquisition lifecycle is the longest workflow in the system. It starts at sourcing and ends at on-chain governance over an income-producing asset.

1. **Sourcing.** The Distressed Property Feed aggregates inventory from multiple distress channels.
2. **Underwriting.** The Property Analysis Tool produces a pay-per-report property analysis. The Multi-Exit Strategy Engine applies eight underwriting strategies in parallel and ranks them. The Craftsman Cost Database (and Cost Intelligence Engine) grounds rehab line items in NCE data.
3. **Capital readiness.** The Capital Readiness Card computes capital analysis for funding sources side-by-side.
4. **Memo.** The AI Acquisition Memo Builder (Gemini-powered) drafts an institutional acquisition memo with citations back to the underlying analysis.
5. **Due diligence.** The Due Diligence Checklist System enforces a structured DD workflow with required artifacts per asset class.
6. **Field capture.** Layer 5's mobile-first walkthrough system produces a structured inspection record with media attachments.
7. **Syndication.** The Syndication Module operates the offering, allocation, and LP communication, with a dedicated LP Investor Portal.
8. **On-chain.** The asset is registered in `cap_assets`, the LandNAVOracle reflects valuation, and AXAU mint capacity adjusts accordingly. Governance over the asset is on-chain through the standard authorization architecture (Section 12).
9. **Income.** Rent Collection (Axiom Rail / Layer 00 extension) provides identity-verified landlord rent collection.
10. **Yield.** Net cash flow can route to the Lending Fund (SEC Reg D 506(c)) or back to AXAU reserve growth.

---

## 8. Banking, Custody, and Payment Rails

### 8.1 Primary Banking — Increase.com
Increase provides the FDIC-insured operating account, ACH origination, and wire rails. The Nexus operating account (routing 074920909 / account 7192752995) is the documented destination for direct treasury contributions via wire or ACH (see Section 13).

### 8.2 Institutional Custody — BitGo CaaS
Institutional crypto custody on Arbitrum One uses BitGo CaaS. Withdrawals from the custodied wallet require multi-party authorization and are reflected on the solvency snapshot.

### 8.3 Card Funding — Coinbase Onramp
See Section 13 for the full architecture.

### 8.4 Payment Anchor — Axiom Rail (Stellar)
The Stellar SEP-compliant anchor handles USDC/AXUSD/AXAU on the payment edge. Layer 00 services include batch USDC disbursements to DAO contributors (Payroll) and identity-verified rent collection.

---

## 9. Trust Stack — Failure Modes and Their Mitigations

`/trust` and its five sub-pages exist for one reason: every common DeFi failure mode should map to a specific Axiom protection that prevents it, with a deep link to verify.

| Failure Mode | Axiom Protection | Verification |
| --- | --- | --- |
| Bridge exploit | No third-party bridges; Axiom Rail with identity gates | `/trust/no-bridges` |
| Oracle drift / stale price | Per-asset staleness budget + auto-freeze chokepoint (Section 2.3) | `/trust/security` + smoke check #77 |
| Reserve over-issuance | ERC-3643 identity-gated mint, PSM gated by attestation | `/disclosure` solvency snapshot |
| Insider rug | Multi-party authorization, on-chain timelock, policy-engine governance | `/trust/governance` |
| Audit theatre | Public audit registry with document hashes | `/trust/audits` |
| Anonymous founder | Identified team with verifiable execution history | `/trust/team` |
| Withdrawal stampede | `WithdrawalRateLimiter` consumer denies window-violating redemptions | Operator console |
| Bridge whitelist drift | Bridge allow-list governance UX with public proposal review | `/operator/bridge-allowlist` |
| Loss event with no recourse | Loss Coverage Reserve claim adjudication path | `/operator/loss-coverage-claims` |

Every row in this table is intended to be independently clickable to verifiable evidence. Where a control is "Configured but not yet active," it is segmented as such on the public operational status table — Live, Configured-Inactive, and Planned are kept strictly distinct.

---

## 10. Intelligence Layer

### 10.1 MIRDT — Capital Intelligence Terminal
Nine-dimension advisory signal engine. MIRDT produces ranked operational signals across reserve, liquidity, credit, market, identity, integrity, governance, operational, and counterparty dimensions.

### 10.2 Axiom Sentinel
Unified capital decision and risk authorization layer. Sentinel is the gate through which capital allocation decisions pass for risk authorization.

### 10.3 Observer
Public allocator-facing dashboard. Observer is the read-only institutional dashboard for prospective allocators.

### 10.4 IVCEE
Allocator-grade underwriting intelligence engine. IVCEE produces the underwriting view used in the Acquisition Memo and the Capital Readiness Card.

### 10.5 Document Ingestion & Extraction
AI-powered document analysis pipeline. Extracts structured data (rent rolls, T-12, environmental reports) from upload artifacts.

---

## 11. Community Capital — The Wealth Practice

The Wealth Practice (formerly user-facing references to "SUSU" and "Savings Circle") manages community group economics with a three-stage trust pipeline. Database table and column names retain `susu_*` for historical continuity; only the visible labels and route path (`/wealth-practice`) reflect the rebrand. Historical references to the SUSU concept itself are preserved in Part 1 of the public educational documents.

---

## 12. Governance and Authorization Architecture

Authorization in Axiom is policy-engine driven, not role-list driven. Policies are version-stamped (Section 6) and every authorization decision records the policy version that produced it.

Key components:

- **Agent Governance System** — policy-based autonomous agent authorization. Every agent action is bound to a policy and an audit event.
- **On-chain timelock** (planned deployment) — per-role timelock for governor changes, with `setGovernor` migrations gated through it.
- **Bridge Allow-list governance** — every bridge or external transit endpoint requires a public proposal, comment window, and quorum before activation. Proposals and comments are persisted in `cap_bridge_allowlist_proposals` and `cap_bridge_allowlist_proposal_comments`.
- **Loss Coverage Reserve claim adjudication** — every claim against the Loss Coverage Reserve flows through a public adjudication path with events captured in `cap_loss_coverage_claims` and `cap_loss_coverage_claim_events`.

---

## 13. Card Onramp and User Funding Paths

Axiom uses two separate, purpose-built rails for inbound funding. Card-based merchant processing was retired after evaluating fit for a sovereign protocol; consumer card payments now route through regulated crypto onramp infrastructure, and institutional treasury funding moves through bank rails directly.

| Path | Outcome | Rail | Status |
| --- | --- | --- | --- |
| Consumer card → AXUSD | Card → USDC → PSM swap → AXUSD on Arbitrum | Coinbase Onramp + PSM `0x5db5…4922` | Live |
| Consumer card → AXAU | Card → USDC → PSM → AXUSD → operational queue → AXAU | Coinbase Onramp + AXAU operational queue | Live |
| Consumer card → USDC | Card → USDC on Arbitrum (no further conversion) | Coinbase Onramp | Live |
| Treasury funding (any size) | ACH or wire direct into the Increase Nexus operating account | Increase (Grasshopper Bank, N.A.) | Live |

Architecture:

- **Consumer card path.** `/onramp` orchestrates the Coinbase Onramp widget through `pages/api/onramp/intent.ts` and the CDP integration in `lib/cdp/`. Once USDC lands in the connected wallet, the user signs a single PSM transaction (`swapCollateralForAXUSD` on `0x5db58d9c21369d1532a48Bdd658E4Fe415404922`) to mint AXUSD 1:1, or routes through the AXAU operational queue at `/api/axau/purchase-request` for the gold-and-land-NAV reserve instrument.
- **Treasury funding path.** `/treasury/fund` is a public Design Law page that publishes the Nexus account wire/ACH instructions (beneficiary, routing 074920909, account 7192752995, bank details, memo guidance). No card form, no third-party processor in the path — funds settle directly into the operating account at Increase and are reflected in the daily solvency snapshot.
- **Deprecated Stripe rail.** The `cap_card_deposits` schema (`shared/capInfraSchema.ts`) and webhook receiver at `POST /api/capinfra/treasury/card-deposit/webhook` are retained to drain in-flight events for Checkout sessions issued before the cutover. The session-creation endpoint `POST /api/capinfra/treasury/card-deposit/checkout` returns `410 Gone`. The operator console at `/operator/treasury/card-deposits` carries a deprecation banner and continues to render historical rows for audit only.

---

## 14. Risk Framework and Emergency Controls

### 14.1 Collateral Risk Policy
The canonical Collateral Risk Policy lives at `documents/policies/collateral-risk-policy.md`. Section 6 ("Emergency Triggers") is the authoritative source for the auto-freeze logic enforced in `lib/capinfra/marketData.ts` and `lib/capinfra/reserve/service.ts`.

### 14.2 Withdrawal Rate Limiter
The on-chain `WithdrawalRateLimiter` enforces a window-based velocity ceiling. Consumer wiring into `MintRedeemController` and `AXIOMFixedLoan` is in progress; the contract itself is deployed and tested.

### 14.3 Oracle Adapters
ERC-7726 adapters provide perspective-verified pricing for AXUSD on Euler V2 vaults. Divergence between adapters triggers integrity failures.

### 14.4 Operator Override
No emergency control bypasses the audit ledger. Every override is recorded with actor, justification, policy version, and resulting state delta.

### 14.5 Active Contract Verification
The Active Contract Verification System checks AXUSD and PSM bytecode and storage layout against expected baselines on every operator console load. Mismatches fail closed — the operator surface refuses to render until the discrepancy is acknowledged.

---

## 15. Proof of Execution

- AXAU live on Arbitrum One mainnet with PAXG and LandNAVOracle backing.
- AXUSD migration to ERC-3643 unified issuance complete.
- Lending Fund operating under SEC Reg D 506(c), integrated with Euler V2 AXUSD lending markets.
- Banking layer live: Increase Nexus account funded; BitGo CaaS custody operational on Arbitrum One.
- Consumer card onramp live via Coinbase (Card → USDC → PSM → AXUSD/AXAU); treasury funding via direct wire/ACH to the Increase Nexus account.
- Capital Infrastructure Backend smoke harness at 77/77 OK including the new oracle-staleness auto-freeze coverage.
- Trust Stack public surface live at `/trust` with five verifiable sub-pages.
- Bridge allow-list governance and Loss Coverage Reserve claim adjudication live.
- Solvency snapshot live and consumed by `/disclosure`.

---

## 16. Forward Roadmap

- **Q2 2026.** Universe Blockchain (L3) settlement migration design publication; on-chain timelock deployment with per-role `setGovernor` migrations; `WithdrawalRateLimiter` consumer wiring into `MintRedeemController` and `AXIOMFixedLoan`.
- **Q3 2026.** Trust Stack Step 9: Loss Coverage Reserve line on `/disclosure` and `/api/solvency/latest` extension; expanded ERC-7726 adapter set; expanded LP Investor Portal capabilities.
- **Q4 2026.** First Universe-anchored AXAU issuance window; expanded Axiom Secondary Network V1 product set; DePIN node operator dashboard expansion.

Roadmap items are commitments, not promises. Every item moves from "Planned" to "Configured-Inactive" to "Live" on the public operational status table and is cross-linked to its governing policy or contract on graduation.

---

## 17. Disclosures and Definitions

This document is the technical specification of an operational system. Nothing in this document is an offer to sell or a solicitation to buy any security. All forward statements are subject to the conditions, controls, and chokepoints described herein, any of which may, by design, halt the operation under discussion.

The canonical glossary is `lib/glossary.ts`. Approved terms, forbidden phrases, maturity labels, and safe replacement patterns are defined there and are the authoritative source for all public communication.

The canonical solvency snapshot is `/api/solvency/latest`. All headline solvency numbers in public-facing materials must be derived from the snapshot identifier displayed at the top of `/disclosure`.

The canonical contract registry is in Appendix A of the v4.0 institutional white paper and is updated as deployments graduate. Legacy contracts are explicitly marked deprecated and segregated from the active registry.

---

*Document end. For the operational status table, see `/disclosure`. For the audit document set, see `/trust/audits`. For the active contract registry, see Appendix A of v4.0.*
