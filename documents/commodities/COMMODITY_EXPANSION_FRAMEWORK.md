# Axiom Protocol — Commodity Expansion Framework

Document class: Governance Framework  
Version: 1.0.0  
Effective date: 2026-05-01  
Status: ACTIVE — governs evaluation only. No commodity listed in this document is approved, deployed, or live unless separately confirmed by a completed governance vote and launch gate sign-off.

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Commodity Candidate Categories](#2-commodity-candidate-categories)
3. [Approval Workflow](#3-approval-workflow)
4. [Minimum Reserve Standards](#4-minimum-reserve-standards)
5. [Oracle Standards](#5-oracle-standards)
6. [Custody Standards](#6-custody-standards)
7. [Redemption Model Standards](#7-redemption-model-standards)
8. [Liquidity Model Standards](#8-liquidity-model-standards)
9. [Compliance and Disclosure Standards](#9-compliance-and-disclosure-standards)
10. [Risk Scoring Rubric](#10-risk-scoring-rubric)
11. [Launch Readiness Gate](#11-launch-readiness-gate)
12. [Deferred and Prohibited Commodity Types](#12-deferred-and-prohibited-commodity-types)
13. [Relationship to AXAU as the Reference Implementation](#13-relationship-to-axau-as-the-reference-implementation)

---

## 1. Purpose

This document establishes a governance-grade, repeatable framework for evaluating and onboarding future commodity-backed reserve instruments on the Axiom Protocol after the AXAU gold reserve instrument.

### What this document governs

This framework governs the evaluation and approval process — not the launch, deployment, or approval of any specific commodity. No commodity described or named in this document is live, approved, or committed to a delivery timeline unless separately confirmed by all of the following:

- A completed governance vote with documented majority
- A passing launch readiness gate sign-off (Section 11)
- A published on-chain disclosure endpoint meeting Section 9 requirements
- An independent custody attestation meeting Section 6 requirements

### What this document does not do

- It does not authorize any new token issuance.
- It does not approve any smart contract deployment.
- It does not create any legal obligation to pursue any specific commodity.
- It does not constitute investment advice or a solicitation of any kind.
- It does not supersede applicable law, regulation, or legal counsel.

### Design principle

Every standard defined here is calibrated against AXAU (the gold reserve instrument) as the proof-of-concept and reference implementation. Future commodity instruments must meet or exceed AXAU's standards across every dimension. AXAU is the floor, not the ceiling.

---

## 2. Commodity Candidate Categories

The following five categories represent the scope of commodities that Axiom Protocol may evaluate for future reserve instruments. All are candidates only. None is launched, approved, or committed to any timeline.

---

### Category A: Precious Metals

Status: NOT LAUNCHED — candidate only.

Description: Reserve instruments backed by physical precious metals other than gold — primarily silver (XAG), and potentially platinum (XPT) and palladium (XPD).

Why this category is viable: Precious metals share AXAU's core infrastructure pattern. Chainlink publishes price feeds for XAG/USD, XPT/USD, and XPD/USD on major EVM networks. Tokenized precious metal instruments (e.g., Paxos silver, Perth Mint) provide a custody-eligible reserve asset class. The redemption model (return underlying metal token, not fiat) maps cleanly to AXAU's PAXG redemption pattern.

Key differentiation from AXAU: Silver trades at a lower per-unit price than gold, which means a given dollar value of backing requires a larger physical quantity — operational buffer management and transfer costs are meaningfully different. Platinum and palladium have thinner markets and less Chainlink feed history; additional oracle due diligence is required.

Eligibility commentary: A silver reserve instrument (AXAG) is the most technically straightforward first expansion candidate given existing Chainlink XAG/USD feed maturity on Arbitrum One. Platinum and palladium remain deferred pending deeper oracle and liquidity analysis (see Section 12).

---

### Category B: Base Metals

Status: NOT LAUNCHED — candidate only.

Description: Reserve instruments backed by industrial base metals — copper (XCU), aluminum, or similar.

Why this category is viable: Copper has strong long-term demand fundamentals tied to electrification and infrastructure build-out. Tokenized copper instruments exist (e.g., warehouse receipt tokens backed by LME-grade copper).

Key differentiation from AXAU: Base metal markets are dominated by futures contracts, not spot physical delivery, which introduces roll risk and storage cost considerations not present in the gold/silver model. On-chain price feed maturity for base metals is significantly lower than for precious metals — Chainlink does not publish a production-grade XCU/USD feed on Arbitrum One at the time of this document.

Eligibility commentary: Base metals are deferred until a production-grade Chainlink (or equivalent Tier 1 oracle) feed is live on Arbitrum One. No base metal instrument should proceed past Stage 1 (Candidate Submission) until an oracle meeting Section 5 requirements exists.

---

### Category C: Energy-Linked Reserve Instruments

Status: NOT LAUNCHED — candidate only.

Description: Reserve instruments economically linked to energy commodities — primarily oil (WTI or Brent) or natural gas.

Why this category is viable: Energy is a foundational global commodity. On-chain oil price feeds exist (Chainlink WTI/USD is available on some EVM networks). Several energy tokenization projects have published frameworks for oil-backed instruments.

Key differentiation from AXAU: Energy commodities cannot be physically settled in a wallet-to-wallet manner equivalent to PAXG. Redemption of an energy-linked instrument likely requires a third-party intermediary for physical delivery or conversion to cash (which conflicts with this framework's non-fiat-redemption standard). Energy prices are significantly more volatile than gold, and leverage through futures introduces basis risk.

Eligibility commentary: Energy-linked instruments face a structural challenge with the redemption model standard (Section 7). Any energy-linked instrument must solve physical delivery or adopt a warehouse-receipt model with a qualified custodian holding physical units before it can pass Stage 2. These instruments are classified as deferred — technically eligible in principle but requiring significant structural work before they can meet this framework's standards.

---

### Category D: Agricultural Commodity Instruments

Status: NOT LAUNCHED — candidate only.

Description: Reserve instruments backed by agricultural commodities — grain, cotton, coffee, cocoa, or similar.

Why this category is viable: Agricultural commodities represent real economic output and could serve the protocol's broader mission of bridging digital capital to real-world productive assets. Warehouse receipt tokenization is a growing infrastructure layer for agricultural markets.

Key differentiation from AXAU: Agricultural commodities are perishable or subject to quality degradation over time, introducing reserve adequacy risks not present in gold. Chainlink does not maintain production-grade agricultural commodity feeds on Arbitrum One at the time of this document. Market liquidity is highly seasonal. Storage and insurance costs are meaningful.

Eligibility commentary: Agricultural instruments are deferred. The minimum conditions for reconsideration are: (a) a production Chainlink or Tier 1 oracle feed for the specific commodity on Arbitrum One, (b) a non-perishable or durability-certified custody model, and (c) a demonstrated redemption path that does not require USD fiat settlement.

---

### Category E: Land-Backed Reserve Units

Status: NOT LAUNCHED as a standalone commodity instrument — partially addressed by AXAU's existing land vault component.

Description: Reserve instruments backed primarily by a portfolio of land or real property, distinct from AXAU's current land vault component (which is a secondary backing source, not the primary commodity).

Why this category is viable: Land is a foundational real-world asset. Axiom Protocol's existing infrastructure includes a Land NAV Oracle (multi-party authorization), an AXLandVault contract, a Physical Asset Pipeline, and a Field Capture System — all oriented toward land-backed value. A standalone land reserve instrument (distinct from AXAU) is a logical extension of this infrastructure.

Key differentiation from AXAU: Land is illiquid relative to gold. A land-backed reserve instrument requires an automated control layer for periodic NAV attestation (already prototyped in the AXLandVault / LandNAVOracleMultiSig infrastructure), a clear redemption model for an illiquid asset (likely fractionalized land receipt tokens or staged auction mechanisms rather than instant physical delivery), and governance approval of a valuation methodology.

Eligibility commentary: A standalone land-backed reserve instrument is the most architecturally adjacent expansion to AXAU — the oracle, vault, and NAV attestation infrastructure already exist in partial form. This is the highest-priority category for Phase 3 evaluation, but it requires: (a) a finalized land NAV oracle methodology with external attestation, (b) a redemption model that does not promise USD fiat payout, and (c) governance vote establishing acceptable NAV update frequency and staleness thresholds.

---

## 3. Approval Workflow

All commodity candidates follow a four-stage pipeline. No stage may be skipped. Each stage produces a required artifact before the next stage may begin.

---

### Stage 1 — Candidate Submission

Initiator: Any AXM governance token holder, Axiom Protocol core team, or designated research committee.

Process: Submit a Commodity Candidate Brief (CCB) to the governance forum. The CCB must include:

1. Commodity identifier and market (e.g., XAG, silver, LBMA spot)
2. Proposed category per Section 2
3. Proposed reserve asset (the on-chain token or warehouse receipt that would back the instrument)
4. Proposed oracle source (Chainlink feed identifier or equivalent)
5. Proposed custodian (or custodian class)
6. Preliminary redemption model
7. Known risks and open questions
8. Statement that the submitter has reviewed this framework and believes the commodity meets the standards herein

Artifact required to advance: Published CCB on the governance forum with a minimum 7-day comment period. No community vote is required at this stage — Stage 1 is informational.

---

### Stage 2 — Technical Diligence

Initiator: Axiom Protocol technical team upon acknowledgment of a Stage 1 CCB.

Process: Conduct a structured technical review against the standards in Sections 4 through 9. Produce a Technical Diligence Report (TDR) covering:

1. Oracle feed assessment (Section 5 checklist)
2. Reserve asset assessment (Section 4 checklist)
3. Custody model assessment (Section 6 checklist)
4. Redemption model assessment (Section 7 checklist)
5. Liquidity model assessment (Section 8 checklist)
6. Risk score computation (Section 10 rubric)
7. Preliminary launch gate pre-check (Section 11) — identifying any hard blockers
8. Recommended proceed / defer / reject recommendation with reasoning

Artifact required to advance: Published TDR with a risk score and explicit proceed/defer/reject recommendation. If the score is 17 or above (DEFERRED or REJECTED per Section 10), the workflow terminates at Stage 2 and the candidate must be substantially revised or withdrawn before re-submission.

---

### Stage 3 — Governance Vote

Initiator: Axiom Protocol governance multisig upon receipt of a passing TDR (score 10 or below for APPROVED; 11–16 for CONDITIONAL with documented remediation plan).

Process: A formal on-chain governance proposal is published. The proposal must reference the CCB and TDR by hash or IPFS CID and include the full risk score breakdown. Voting parameters follow the current AXM governance rules (minimum quorum, minimum approval threshold, voting window).

Artifact required to advance: On-chain governance vote with passing outcome, recorded transaction hash, and a post-vote Governance Approval Record (GAR) documenting the approved parameters (commodity, reserve asset, oracle, custodian, redemption model, any conditional requirements).

---

### Stage 4 — Launch Gate

Initiator: Axiom Protocol technical team upon receipt of a GAR.

Process: Execute the full launch readiness gate (Section 11) against a deployed staging environment. Every hard blocker must pass. Every soft gate must either pass or have a documented governance waiver. A final Launch Readiness Certificate (LRC) is issued.

Artifact required to advance: Signed LRC, published on-chain disclosure endpoint meeting Section 9 requirements, and public commodity status console meeting the Phase 2C pattern. Only after LRC issuance may the instrument be described as "LIVE" in any user-facing context.

---

## 4. Minimum Reserve Standards

These standards define what constitutes an acceptable reserve asset for a commodity-backed instrument on Axiom Protocol. AXAU's gold reserve (backed by PAXG on Arbitrum One, custodied by Paxos) is the reference implementation.

### 4.1 Reserve asset eligibility

The reserve asset must be:

1. On-chain representable — the reserve must exist as an ERC-20 token on a supported EVM network (currently Arbitrum One) or be convertible to one via a qualified, audited bridge.
2. Price-oracle addressable — a Chainlink (or equivalent Tier 1) price feed for the reserve asset must exist on the target network with a track record of at least 12 months of production uptime.
3. Non-rehypothecable by default — the reserve asset held in the protocol vault must not be lent, pledged, or otherwise re-encumbered without an explicit governance vote authorizing the specific use.
4. Independently auditable — the reserve asset's on-chain balance must be verifiable by any party with a standard RPC provider connection, without reliance on privileged data.
5. Transfer-capable without fiat intermediary — the reserve asset must be deliverable to a user's self-custody wallet on redemption without requiring a USD wire, ACH, or bank transfer.

### 4.2 Coverage ratio requirements

All commodity reserve instruments must maintain a minimum coverage ratio of 105% at all times as measured by the on-chain NAVEngine (or its equivalent for the new instrument). Coverage below 100% triggers an automatic CRITICAL classification in the commodity disclosure console and requires immediate operator action.

| Coverage band | Classification | Required action |
|---------------|---------------|-----------------|
| 110%+ | HEALTHY | None |
| 105% – 109.99% | WATCH | Monitor; no action required |
| 100% – 104.99% | DEGRADED | Governance notification within 24 hours |
| Below 100% | CRITICAL | Mint pause mandatory; remediation plan within 6 hours |

### 4.3 Audit cadence

Custody of the reserve asset must be independently attested at minimum:

- Annually — formal third-party custody audit
- Quarterly — internal attestation published on-chain or via a public disclosure endpoint
- On demand — any time the coverage ratio falls below 105%

### 4.4 AXAU reference

AXAU uses PAXG (Paxos Gold) as its reserve asset. PAXG is an ERC-20 token on Arbitrum One (contract: `0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429`), backed by LBMA-accredited gold bars custodied by Paxos Trust Company. The AXGoldVault contract (`0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8`) holds the reserve, and the NAVEngine (`0x80F8634a43B26a2bd403396A42465F138aeCC519`) computes coverage in real time from the Chainlink XAU/USD feed.

---

## 5. Oracle Standards

The oracle is the single most critical technical dependency for a commodity reserve instrument. A commodity whose on-chain price cannot be reliably read cannot have a functioning NAVEngine, and therefore cannot have meaningful coverage measurement or mint/redeem pricing.

### 5.1 Primary oracle requirements

The primary oracle must meet all of the following criteria:

| Requirement | Minimum standard | AXAU reference value |
|-------------|-----------------|----------------------|
| Provider | Chainlink Data Feed (preferred) or documented Tier 1 equivalent | Chainlink XAU/USD on Arbitrum One (`0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c`) |
| Network | Same EVM network as the instrument (currently Arbitrum One) | Arbitrum One |
| Heartbeat | 24 hours or faster | 24 hours |
| Deviation threshold | 0.5% or tighter | 0.5% |
| Staleness ceiling | Configurable via ORACLE_STALE_THRESHOLD_SECONDS; default 27 hours | 97,200 seconds (27 hours) |
| Production history | Minimum 12 months of continuous uptime on target network | XAU/USD on Arbitrum has multi-year history |
| Answer range | Price must be positive and non-zero at all times | Enforced by `assertOracleFresh()` |
| Answer decimals | 8 decimals (standard Chainlink convention) | 8 |

### 5.2 Staleness policy

The protocol enforces oracle staleness at two levels:

1. Service level — `ORACLE_STALE_THRESHOLD_SECONDS` (configurable, default 97,200 s) enforced by `assertOracleFresh()`. If the oracle age exceeds this threshold, the instrument's commodity disclosure console grades the oracle section CRITICAL, mint pauses, and no new liquidity routes are simulated.
2. On-chain level — the MintRedeemController enforces the same threshold on-chain. A stale oracle at the contract level will cause NAVEngine reads to revert, triggering `navEngineDegraded = true`.

Both levels must agree. If the on-chain staleness threshold and the service-level threshold differ, the more conservative (shorter) value governs.

### 5.3 Fallback oracle architecture

If the primary oracle becomes unavailable:

1. The instrument's mint operation must pause automatically (no new issuance without a valid price).
2. Redemption may remain open if the last-known price is within the staleness ceiling and the governance multisig has published an explicit "stale-oracle redemption window" authorization.
3. A fallback oracle source (secondary Chainlink feed, API3, Pyth, or equivalent) may be substituted only by a governance vote — never by a unilateral operator action.

### 5.4 Oracle hard blocker

A missing or absent oracle is an unconditional hard blocker for launch. No instrument may proceed to Stage 3 (Governance Vote) if a production-grade oracle for the reserve asset does not exist on the target network.

---

## 6. Custody Standards

### 6.1 Acceptable custodian types

The following custodian models are acceptable, in descending order of preference:

1. Qualified custodian with on-chain representation — a regulated trust company or custodian (e.g., Paxos, BitGo, Copper) that issues an ERC-20 receipt token directly redeemable for the physical asset. This is the AXAU pattern (PAXG / Paxos).
2. Exchange-grade multi-party authorization — an institutional-grade multi-party authorization arrangement (minimum 3-of-5 keyholders, geographically distributed) holding the reserve asset in a segregated account with independent proof-of-reserve.
3. On-chain deployer-controlled buffer — acceptable as a supplemental operational buffer (to cover pending settlement demand) but not as the primary reserve custody model. The buffer minimum formula is defined in Section 8.2.

### 6.2 Custodian requirements

Regardless of model, the custodian must:

1. Hold the reserve asset in a segregated account — not commingled with the custodian's proprietary assets or other clients.
2. Publish proof of reserves at minimum quarterly, using a methodology that allows independent on-chain or cryptographic verification.
3. Carry insurance or surety covering at minimum the replacement value of the reserve assets under custody.
4. Operate under a written custody agreement that gives Axiom Protocol the right to direct redemption of the reserve asset to a user's wallet address.
5. Provide an emergency contact and escalation path for custody incidents, documented in the Technical Diligence Report.

### 6.3 Custodian prohibitions

The following custodian arrangements are not acceptable:

- Self-custody by a single private key controlled by one individual with no multi-party authorization recovery path.
- Exchange custody where the reserve asset is held in an exchange hot wallet without segregation.
- Custodians under active regulatory enforcement action or whose operating license has lapsed.

### 6.4 AXAU reference

AXAU's primary reserve custody is provided by Paxos Trust Company via PAXG. The operational buffer (PAXG held by the deployer wallet `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`) is a secondary liquidity layer — not the primary custody. The minimum deployer buffer is 0.003 PAXG, monitored live by the Phase 2A stabilization report and Phase 2C commodity disclosure console.

---

## 7. Redemption Model Standards

### 7.1 Core principle

Redemption must return the underlying reserve asset — not USD, not a stablecoin, not a bank wire. This is the foundational distinction between a commodity reserve instrument and a stablecoin. A commodity reserve instrument that promises USD on redemption is a stablecoin with extra steps.

AXAU reference: Redeeming AXAU returns PAXG to the user's wallet. The user holds physical-gold-backed tokens directly in self-custody. Converting PAXG to fiat is the user's own action through a third-party venue. Axiom Protocol does not intermediate that conversion.

### 7.2 Required redemption properties

| Property | Requirement | AXAU reference |
|----------|-------------|----------------|
| Redemption asset | Underlying reserve token (not USD, not a bank transfer) | PAXG |
| Redemption mechanism | On-chain transaction — no operator approval required for standard redemption | `MintRedeemController.redeem()` |
| Redemption pricing | Backing NAV per token at time of redemption, computed by on-chain NAVEngine | `backingNavPerAXAUWad()` |
| Redemption latency | Immediate settlement (same block or next block) for standard redemptions | Same block |
| Redemption fee | Disclosed in basis points, non-zero allowed, must be surfaced in commodity disclosure console | `redeemFeeBps` |
| Redemption pause | Governance multisig may pause redemption in an emergency; pause must be disclosed in real time | `redeemPaused` flag |
| Fiat path | NOT provided by the protocol; user's responsibility through third-party venue | N/A |

### 7.3 Fiat redemption deferred

ACH transfers, wire transfers, bank payouts, and any other fiat-denominated redemption pathway are deferred for all commodity reserve instruments unless separately approved by governance with a specific legal and compliance review. This deferred status must be disclosed explicitly in the instrument's commodity disclosure console and in any user-facing documentation.

### 7.4 Illiquid asset redemption

For commodity classes where the underlying reserve asset cannot be delivered to a wallet in a single on-chain transaction (e.g., a land-backed reserve unit backed by real property), a staged redemption model is permissible subject to governance approval. A staged redemption model must define:

1. The maximum redemption timeline (e.g., 90 days).
2. The fallback mechanism if physical delivery cannot be completed within the timeline.
3. A user notification mechanism.
4. A governance escalation path if the custodian cannot effect delivery.

---

## 8. Liquidity Model Standards

### 8.1 Required liquidity engine coverage

Before launch, every commodity reserve instrument must have a deployed and validated read-only liquidity engine equivalent to Phase 2B of the AXAU system. The liquidity engine must:

1. Compute implied instrument price from on-chain NAV per token.
2. Compute signed price deviation in basis points against the spot commodity price.
3. Classify arbitrage opportunities (MINT direction if instrument is below commodity spot; REDEEM direction if above).
4. Simulate deterministic mint and redemption routes with no slippage or pool depth modeling (simulation-only disclosure required).
5. Grade overall liquidity health using a three-tier system (HEALTHY / THIN / CRITICAL) with configurable thresholds.

The exact threshold values (arbitrage threshold bps, healthy band bps, critical band bps) may be adjusted per commodity based on that commodity's volatility characteristics — subject to governance approval.

### 8.2 Operational buffer minimum

The deployer-controlled operational buffer (the buffer used to pre-fund pending redemptions while settlement processes on-chain) must maintain a minimum balance at all times:

```
buffer_minimum = max(
  ABSOLUTE_FLOOR,
  PENDING_REDEMPTION_DEMAND * BUFFER_COVERAGE_RATIO
)
```

For AXAU:
- `ABSOLUTE_FLOOR` = 0.003 PAXG
- `BUFFER_COVERAGE_RATIO` = 1.0 (buffer must cover 100% of pending redemption demand)
- `PENDING_REDEMPTION_DEMAND` = sum of `axauPurchaseRequests` in pending/processing status

Future commodities may use different absolute floor values calibrated to the reserve asset's unit price and typical redemption lot size. The formula and parameters must be documented in the Technical Diligence Report and confirmed in the Launch Readiness Certificate.

### 8.3 Simulation transparency requirements

All liquidity engine outputs must carry explicit machine-readable transparency fields:

```json
{
  "simulationOnly": true,
  "slippageMode": "not_modeled",
  "depthMode": "not_modeled"
}
```

These fields must appear in the API response of the commodity disclosure endpoint. No route output may be described as an "executable quote" or "best execution" without an active order-routing integration that accounts for actual pool depth and slippage — which is not in scope for any Phase 2 instrument.

### 8.4 Simulation baseline thresholds

Although slippage and pool depth are not modeled at Phase 2 (see Section 8.3), the liquidity engine must use the following baseline threshold assumptions to classify price deviation and arbitrage risk. These thresholds are advisory defaults calibrated against AXAU. A different commodity may require different thresholds, which must be documented in the Technical Diligence Report and confirmed by governance.

| Threshold | Default value | AXAU reference | Notes |
|-----------|--------------|----------------|-------|
| Arbitrage trigger (price deviation before arbitrage flag) | 50 bps | 50 bps | Below this, deviation is within normal spread; no arbitrage flag raised |
| HEALTHY band ceiling (deviation before WATCH classification) | 100 bps | 100 bps | Deviation within 100 bps of NAV is considered normal for a production instrument |
| THIN / WATCH band ceiling | 200 bps | 200 bps | Deviation between 100 and 200 bps raises WATCH; arbitrage opportunity may exist |
| CRITICAL band threshold | 200 bps+ | 200 bps | Deviation above 200 bps indicates a systemic dislocation requiring operator review |
| Assumed notional per simulated route | 1,000 AXUSD equivalent | 1,000 AXUSD | Route simulation uses this notional; actual execution size may differ |
| Minimum assumed reserve pool depth (simulation floor) | 10,000 AXUSD equivalent | Not modeled | Notional floor used only for route feasibility classification; actual depth not measured |
| Assumed slippage for simulation-only outputs | 0 bps (no slippage modeled) | 0 bps | All simulation outputs must carry the transparency fields from Section 8.3 |

These thresholds define the simulation model's classification behavior. They do not represent real market conditions, executable prices, or actual pool depth. Any communication of these thresholds to end users must be accompanied by the simulation-only disclosure from Section 8.3.

### 8.5 On-chain pool depth (Phase 3 requirement)

On-chain pool depth modeling (AMM integration, Camelot / Uniswap routing, real slippage) is out of scope for the foundation liquidity layer but is a Phase 3 requirement before any instrument is described as having "deep liquidity." The Phase 2B/2D simulation-only engine is sufficient for disclosure and operator monitoring but must not be presented as a measure of actual market depth.

---

## 9. Compliance and Disclosure Standards

### 9.1 GENIUS Act positioning

All commodity reserve instruments are structured with reference to payment stablecoin regulatory frameworks under active consideration, including the GENIUS Act. No instrument may represent itself as "GENIUS Act compliant" or "compliant with" any specific regulatory framework without completed external legal attestation. The approved language is:

> "Structured with reference to applicable stablecoin and digital asset regulatory frameworks. Compliance posture remains subject to legal and operational review. External attestation has not been completed."

This language must appear in the instrument's commodity disclosure console (Section 9.3) and in all investor-facing documentation.

### 9.2 Institutional vocabulary

All public-facing documentation for commodity reserve instruments must use Axiom Protocol's institutional vocabulary:

| Plain term | Institutional equivalent |
|-----------|--------------------------|
| Smart contracts | Automated control layers |
| Multi-sig | Multi-party authorization |
| DeFi / decentralized finance | On-chain financial rails |
| Tokenization | Asset onboarding and issuance |
| Staking | Participation lockup |

Technical terms are preserved in the protocol's canonical glossary (`lib/glossary.ts`) and surfaced on the `/disclosure` page. Technical documentation (developer APIs, contract ABIs, audit reports) may use standard technical terminology.

### 9.3 Required public disclosure endpoint

Every commodity reserve instrument must expose a public read-only commodity disclosure endpoint following the Phase 2C pattern established by `/api/axau/commodity-disclosure`. The endpoint must return:

1. Overall risk label — HEALTHY / WATCH / DEGRADED / CRITICAL (worst of all subsections)
2. Backing and reserve section — coverage ratio, reserve asset balance, vault frozen status, buffer capacity
3. NAV engine section — degraded flag, backing NAV per token, mint NAV per token
4. Oracle section — stale flag, oracle age, staleness threshold, last updated timestamp, spot price
5. Liquidity section — implied instrument price, spot commodity price, deviation in bps, arbitrage direction, simulation transparency fields
6. Mint/redeem section — paused flags, fee schedule, cumulative volume
7. Solvency snapshot section — snapshot freshness, age, checksum
8. Known limitations — static list of modeling gaps and disclosure caveats
9. Deferred rails — explicit list of redemption pathways not supported (ACH, wires, fiat bank payout)
10. Disclaimers — including crypto-native nature, return-of-reserve-asset redemption model, simulation-only liquidity

### 9.4 Required public disclosure page

Every commodity reserve instrument must have a public-facing commodity status page following the Phase 2C pattern established by `/axau-disclosure`. The page must render all sections from the disclosure endpoint in human-readable form using the Axiom Protocol Design Law (serif headings, monospace data, dl- color classes, risk pills).

### 9.5 Language prohibitions

No disclosure documentation for a commodity reserve instrument may contain:

- Promises of fixed yield or guaranteed returns
- APY claims presented as certain outcomes (use "Variable" or omit)
- Absolutist positioning ("the only platform", "the sole solution")
- Unqualified physical asset ownership claims (use "framework", "pipeline", "targeted acquisition")
- The word "bankless" as a product descriptor
- Asterisks or hashtags in body text
- Any statement that fiat (USD) redemption is available unless separately approved by governance with legal review

---

## 10. Risk Scoring Rubric

### 10.1 Overview

Each commodity candidate is scored across five risk dimensions. Each dimension is scored 1 (lowest risk) to 5 (highest risk). The composite score determines the approval outcome.

All five dimensions carry equal weight (20% each). The composite score is the unweighted sum of the five dimension scores: a minimum possible score of 5 (all dimensions score 1) and a maximum possible score of 25 (all dimensions score 5). No dimension may be omitted from a completed Technical Diligence Report; a missing dimension is treated as a score of 5 for that dimension.

Governance may vote to apply dimension-specific multipliers for a specific commodity candidate if it presents an unusually concentrated risk profile — for example, a multiplier of 1.5 on Oracle Risk for a commodity with a newly deployed price feed. Any such multiplier must be documented in the Stage 2 TDR and confirmed by governance before the Stage 3 vote. If no multiplier is approved, equal weighting (1.0x per dimension) applies.

### 10.2 Score bands

| Composite score | Band | Outcome |
|-----------------|------|---------|
| 5 – 10 | APPROVED | May proceed to Stage 3 (Governance Vote) |
| 11 – 16 | CONDITIONAL | May proceed to Stage 3 with a documented remediation plan addressing each dimension scoring 3 or above |
| 17 – 21 | DEFERRED | Workflow terminates at Stage 2; candidate must be substantially revised |
| 22 – 25 | REJECTED | Structurally incompatible with this framework; see Section 12 |

### 10.3 Dimension 1 — Oracle Risk

Measures the quality, maturity, and availability of the price oracle for the reserve asset.

| Score | Criteria |
|-------|----------|
| 1 | Production Chainlink feed on Arbitrum One with 2+ years of history, sub-24h heartbeat, sub-0.5% deviation threshold |
| 2 | Production Chainlink feed with 12–24 months of history, or heartbeat 24–48h |
| 3 | Production Chainlink feed with less than 12 months of history, or deviation threshold above 0.5% |
| 4 | No Chainlink feed; relies on Tier 2 oracle (API3, Pyth, UMA) with limited on-chain history |
| 5 | No production on-chain oracle exists; price must be derived from off-chain data with no cryptographic attestation |

### 10.4 Dimension 2 — Custody Risk

Measures the quality, segregation, and auditability of the reserve asset custody arrangement.

| Score | Criteria |
|-------|----------|
| 1 | Regulated qualified custodian issuing a directly redeemable on-chain receipt token (AXAU pattern: Paxos / PAXG) |
| 2 | Regulated custodian with segregated account and quarterly proof-of-reserves, but no directly redeemable on-chain receipt token |
| 3 | Exchange-grade multi-party authorization arrangement with independent audit, no regulated custodian |
| 4 | Self-custody multi-party authorization with no third-party audit or insurance |
| 5 | Single-key self-custody, commingled custody, or custodian under regulatory enforcement |

### 10.5 Dimension 3 — Liquidity Risk

Measures the depth and redemption liquidity of the reserve asset market.

| Score | Criteria |
|-------|----------|
| 1 | Reserve asset has deep spot market (daily volume greater than $100M), instant on-chain redemption, and a functioning AMM pool on the target network |
| 2 | Reserve asset has liquid spot market (daily volume $10M – $100M) and on-chain redemption path, but limited AMM depth |
| 3 | Reserve asset has moderate spot market (daily volume $1M – $10M) or redemption requires T+1 settlement |
| 4 | Reserve asset has thin spot market (daily volume below $1M) or redemption latency exceeds 24 hours |
| 5 | Reserve asset has no liquid secondary market or redemption is not possible without a fiat intermediary |

### 10.6 Dimension 4 — Reserve Risk

Measures the stability and integrity of the underlying reserve asset as collateral.

| Score | Criteria |
|-------|----------|
| 1 | Physical commodity with multi-century track record of value preservation; non-perishable; fungible; LBMA or equivalent accreditation |
| 2 | Physical commodity with strong value history (50+ years); non-perishable; warehouse-receipt backed with independent certification |
| 3 | Physical commodity with moderate volatility or perishability risk; warehouse-receipt backed but certification less established |
| 4 | Commodity with high volatility (greater than 40% annualized) or significant perishability / storage cost risk |
| 5 | Synthetic or derivative exposure to a commodity rather than direct physical backing; algorithmic reserve; uncollateralized exposure |

### 10.7 Dimension 5 — Regulatory Risk

Measures the legal and regulatory clarity surrounding the instrument.

| Score | Criteria |
|-------|----------|
| 1 | Commodity instrument with clear regulatory precedent; reserve asset is a regulated product (e.g., LBMA gold, CFTC-regulated commodity); legal opinion in hand |
| 2 | Commodity instrument with strong regulatory analogy; reserve asset is a recognized commodity; legal review in progress |
| 3 | Commodity instrument in a developing regulatory environment; legal opinion not yet complete; no enforcement precedent |
| 4 | Commodity instrument with significant legal uncertainty; reserve asset's regulatory status is contested; no legal opinion |
| 5 | Instrument involves prohibited or highly regulated underlying (privacy coins, unregistered securities, synthetic derivatives with no physical backing) |

### 10.8 Worked example — AXAU as the reference

AXAU is the reference implementation. Its score at launch was:

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Oracle Risk | 1 | Production Chainlink XAU/USD on Arbitrum One, 2+ year history, 24h heartbeat, 0.5% deviation |
| Custody Risk | 1 | Paxos Trust Company, regulated, PAXG directly redeemable on-chain |
| Liquidity Risk | 2 | PAXG on-chain, but limited AMM depth for AXAU itself at launch; deep gold spot market |
| Reserve Risk | 1 | Physical gold, LBMA accredited, non-perishable, centuries of value preservation |
| Regulatory Risk | 2 | Strong commodity precedent for gold; stablecoin regulatory framework in development; legal review in progress |
| Composite | 7 | APPROVED band (5–10) |

A composite score of 7 places AXAU solidly in the APPROVED band. Future instruments should target a score of 10 or below. Any dimension scoring 4 or 5 requires explicit governance discussion and a remediation commitment before the instrument can proceed.

---

## 11. Launch Readiness Gate

The launch readiness gate is a structured pre-flight checklist that must pass immediately before a commodity reserve instrument goes live. The gate must be re-run in full any time a material change is made to the instrument's oracle, custody arrangement, reserve asset, or automated control layers.

### 11.1 Hard blockers — unconditional no-go conditions

All of the following must be true. Any single failure terminates the launch.

| ID | Gate | Verification method |
|----|------|---------------------|
| HB-01 | A production-grade oracle for the reserve asset exists on the target network and is not stale | Call oracle endpoint; `isStale` must be `false`; `ageSec` must be less than `maxStalenessSec` |
| HB-02 | The NAVEngine (or equivalent) is not degraded | `navEngineDegraded` must be `false`; backing NAV per token must be a valid positive number |
| HB-03 | Coverage ratio is 105% or above | `coverageRatioBps` must be greater than or equal to 10,500 |
| HB-04 | Custody attestation exists from the designated custodian | Signed attestation document with date within 30 days of launch; published on-chain or via a public IPFS CID |
| HB-05 | Liquidity engine is deployed and validated | Phase 2B-equivalent engine returns a valid response with all required fields; NaN/Infinity edge cases tested |
| HB-06 | Commodity disclosure endpoint is live and returns a valid response | `GET /api/<instrument>/commodity-disclosure` returns HTTP 200 with all 10 required sections; `schemaVersion` is correct |
| HB-07 | Commodity disclosure page renders and displays all risk sections | Page at `/<instrument>-disclosure` renders; all six section cards visible; correct risk labels showing |
| HB-08 | No smart contract has been modified since the last security review without a new review | Deployed contract bytecodes match reviewed artifacts; deployment transaction hashes match the LRC |
| HB-09 | Mint and redeem operations have been end-to-end tested on mainnet (not testnet alone) | Test transaction hashes from mainnet staging environment; amounts above the oracle-enforced minimum |
| HB-10 | Deferred rails disclaimer is published | Disclosure endpoint `deferredRails.items` includes all inapplicable redemption paths; page renders the deferred rails card |

### 11.2 Soft gates — conditions requiring a documented waiver

All of the following should be true. A failing soft gate does not terminate the launch but requires a written governance waiver specifying the risk accepted, the expected remediation timeline, and the responsible party.

| ID | Gate | Notes |
|----|------|-------|
| SG-01 | Solvency snapshot cron is running and the latest snapshot is less than 20 minutes old | A stalled cron is a known operational risk; waiver must include an operator monitoring commitment |
| SG-02 | PAXG-equivalent buffer balance covers 100% of pending redemption demand | A partial buffer at launch may be acceptable if total pending demand is zero; must be confirmed |
| SG-03 | A governance-approved runbook for emergency mint/redeem pause exists and has been acknowledged by the operator | Runbook acknowledgment should be recorded on-chain or in the operator console |
| SG-04 | An external security review of the new instrument's automated control layers has been completed | For instruments reusing AXAU's existing contracts without modification, this gate passes by inheritance |
| SG-05 | A user-facing FAQ describing the redemption model and crypto-native nature is published | Must explicitly state: "Redemption returns [reserve asset token], not USD. Fiat conversion is the user's responsibility through a third-party venue." |

### 11.3 Gate re-run triggers

The launch readiness gate must be re-run in full if any of the following occur after initial certification:

- The oracle feed changes (new contract address, new provider, or new deviation threshold)
- The custody arrangement changes (new custodian, new reserve asset token, new custody contract)
- Any automated control layer contract is upgraded or replaced
- The coverage ratio falls below 100% at any time after launch
- The instrument is paused for more than 72 consecutive hours

---

## 12. Deferred and Prohibited Commodity Types

### 12.1 Deferred commodity types

Deferred commodities are technically viable in principle but are out of scope for the current roadmap. They may be re-evaluated when the conditions listed below are met. No deferred commodity is approved, funded, or committed to a timeline.

| Commodity | Reason for deferral | Minimum conditions for re-evaluation |
|-----------|--------------------|-----------------------------------------|
| Silver (XAG) | Viable — awaiting governance prioritization after AXAU establishes the full operational pattern | Governance vote to commence Stage 1; existing Chainlink XAG/USD feed on Arbitrum One already meets oracle standards |
| Platinum (XPT) | Chainlink XPT/USD feed on Arbitrum One has limited history; custody model less established than gold | 12+ months of production Chainlink XPT/USD history on Arbitrum One; qualified custodian issuing on-chain receipt token |
| Palladium (XPD) | High volatility; limited Chainlink feed history on Arbitrum One; thin market depth | Same as platinum; additionally, demonstration of sufficient market depth for a viable liquidity engine |
| Copper (XCU) | No production Chainlink XCU/USD feed on Arbitrum One; market dominated by futures not spot | Production Chainlink XCU/USD feed on Arbitrum One with 12+ months uptime; spot physical custody solution |
| Land-backed reserve unit | Infrastructure partially built (AXLandVault, LandNAVOracle); requires finalized NAV methodology and external attestation | Finalized LandNAVOracle methodology with external attestation; governance-approved update frequency and staleness thresholds; redemption model that does not promise USD |
| Oil (WTI/Brent) | Redemption model challenge: physical oil delivery to a wallet address is not possible in a standard ERC-20 redemption | Qualified custodian issuing a warehouse-receipt ERC-20 token redeemable for physical barrels without USD fiat intermediary; or governance approval of an alternative redemption model |
| Natural gas | Same as oil, compounded by storage and transport infrastructure requirements | Same as oil |
| Agricultural commodities (grain, cotton, coffee, cocoa) | No production oracle; perishability risk; seasonal liquidity; no warehouse-receipt ERC-20 standard established | Production Chainlink feed on Arbitrum One; non-perishable or durability-certified custody model; demonstrated non-fiat redemption path |

### 12.2 Prohibited commodity types

Prohibited commodities are structurally incompatible with this framework. No governance vote may approve a prohibited commodity without first amending this framework through a formal framework revision process (which requires a separate governance vote with a documented constitutional majority threshold).

| Type | Reason for prohibition |
|------|----------------------|
| Algorithmic reserve | A commodity reserve instrument with no physical or on-chain asset backing the circulating supply cannot meet the coverage ratio standard (Section 4.2) or the reserve asset eligibility standard (Section 4.1). Algorithmic stability mechanisms have demonstrated systemic failure modes that are incompatible with the disclosure-grade transparency this framework requires. |
| Uncollateralized instruments | Any instrument where the reserve asset is a future claim (e.g., a promise to deliver a commodity at a future date without current custody) is not a reserve instrument — it is a futures contract. This framework governs only fully-reserved, spot-backed instruments. |
| Privacy coin backing | A reserve asset whose on-chain balance cannot be verified by any party with a standard RPC provider connection (Section 4.1, Requirement 4) cannot meet the independently auditable standard. Privacy coins by design obscure balances. A reserve asset whose backing cannot be independently confirmed in real time is incompatible with the disclosure transparency requirements of this framework. |
| Unregistered securities as backing | A reserve asset that constitutes an unregistered security under applicable law exposes the protocol and its participants to regulatory enforcement risk that cannot be mitigated by disclosure alone. Any reserve asset believed to be a security must first obtain a no-action letter, registered exemption, or equivalent legal clearance before it may be considered as a backing asset. |
| Synthetic derivatives without physical backing | A reserve backed by a leveraged derivative position (e.g., a perpetual futures position, an options contract, or a structured product without physical delivery) introduces mark-to-market volatility, funding rate risk, and liquidation risk that are incompatible with a reserve instrument's stability requirements. The reserve must be a direct claim on a physical or on-chain representation of the commodity, not a derivative of it. |

---

## 13. Relationship to AXAU as the Reference Implementation

### 13.1 AXAU as proof of framework

AXAU (the Axiom Gold Reserve Instrument) is the first commodity reserve instrument deployed on Axiom Protocol and the proof of concept for every standard defined in this framework. Each section of this document was written in direct reference to AXAU's live system design — its oracle architecture, vault structure, NAVEngine, coverage model, redemption mechanism, liquidity engine, and disclosure surface.

AXAU is not a prototype. It is a live, production instrument operating on Arbitrum One. Its on-chain contracts have been verified on Arbiscan. Its commodity disclosure console is publicly accessible at `/axau-disclosure`. Its stabilization report is available to operators at `/api/operator/axau-stabilization-report`. Its liquidity engine (Phase 2B) and commodity disclosure aggregator (Phase 2C) are the reference implementations of the standards defined in Sections 8 and 9 of this document.

### 13.2 AXAU's live system as the baseline

All standards in this framework are expressed in terms that AXAU currently meets or exceeds. Any future commodity instrument must meet all of the same standards. The specific values used by AXAU's system (oracle staleness threshold, coverage ratio floor, buffer minimum, liquidity health thresholds) are defaults — future instruments may adopt different values subject to governance approval and Technical Diligence Report justification.

All contract addresses, threshold values, and operational constants cited in this document reflect the Axiom Protocol system state as of the effective date (2026-05-01). These values are subject to change through governance votes or protocol upgrades. When evaluating a future commodity candidate, always verify current deployed addresses and threshold values against the live on-chain system — not against the static values recorded here. If any value has been updated after this document's effective date, the updated value governs for operational purposes; this document should be revised in the next framework version update (Appendix A).

The relevant AXAU system components are:

| Component | Description | File / Address |
|-----------|-------------|----------------|
| AXAUTokenLite3643 | ERC-3643 compliant reserve instrument token | `0xbcCA4D937d427829914498423aE6E04C846dB0Bb` |
| AXGoldVault | Holds PAXG reserve, exposes `goldSnapshot()` | `0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8` |
| NAVEngine | Computes coverage ratio, backing NAV, mint NAV | `0x80F8634a43B26a2bd403396A42465F138aeCC519` |
| MintRedeemController | Enforces oracle freshness, mint/redeem pausing, fee schedule | `0x682Ed413767b6275e29fc706391474F2C5Cc1A2A` |
| Chainlink XAU/USD | Primary oracle (Arbitrum One) | `0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c` |
| Phase 2A stabilization report | 72-hour aggregate health report | `lib/axau/stabilizationReport.ts` |
| Phase 2B liquidity engine | Read-only price deviation, arbitrage classification, route simulation | `lib/axau/liquidityEngine.ts` |
| Phase 2C commodity disclosure | Public aggregated status console | `lib/axau/commodityDisclosure.ts` |

### 13.3 Framework calibration

Any future revision to AXAU's operational parameters (e.g., changing the staleness threshold, revising the coverage floor, updating the buffer minimum formula) must be evaluated against this framework. If the revision would cause AXAU to fail a gate defined in this document, the gate definition should be reviewed and updated — with governance approval — to reflect operational learning rather than silently allowing AXAU to operate outside its own framework.

This framework is a living governance document. Version updates require a governance vote and must be published with a changelog.

### 13.4 Governance calibration

The risk scoring rubric in Section 10 is calibrated against AXAU's risk profile at launch (composite score: 7, APPROVED). Future commodity expansions may have higher scores in some dimensions due to less mature oracle infrastructure, less established custody models, or less regulatory clarity. The governance community should interpret the score as a relative signal — a score of 12 (CONDITIONAL) for a silver instrument that scores 3 on oracle risk means the oracle risk must be remediated before launch, not that silver is fundamentally unsuitable.

The framework's purpose is to surface risk clearly so governance can make informed decisions — not to prevent expansion, but to ensure that expansion does not compromise the protocol's disclosure-grade transparency or the trust of the participants who rely on it.

---

## Appendix A — Framework Revision Log

| Version | Date | Summary | Governance reference |
|---------|------|---------|----------------------|
| 1.0.0 | 2026-05-01 | Initial framework, calibrated against AXAU Phase 2C | Phase 2D documentation task, Task #415 |

---

## Appendix B — Key Definitions

Reserve instrument: A protocol-issued token whose value is backed by a specific underlying reserve asset held in custody, with coverage measured in real time by an on-chain NAV engine.

Coverage ratio: The ratio of the total USD value of assets held in the protocol's vaults (backing) to the total USD value of the circulating supply of the instrument, expressed in basis points. 10,000 bps = 100% coverage.

NAVEngine: The on-chain automated control layer that computes the backing NAV per token and the mint NAV per token using live oracle prices and vault balances.

Oracle staleness: The condition where the on-chain price feed for the reserve asset has not been updated within the configured staleness threshold. A stale oracle prevents the NAVEngine from computing a valid NAV and triggers an automatic CRITICAL classification in the commodity disclosure console.

Operational buffer: The reserve asset (or a liquid equivalent) held by the protocol deployer to pre-fund pending redemption and mint settlement demand while on-chain settlement processes asynchronously.

Liquidity engine: The read-only computation layer (Phase 2B pattern) that derives an implied instrument price from NAV per token, compares it to the spot commodity price, classifies arbitrage conditions, and simulates deterministic mint/redeem routes. Outputs are simulations only; slippage and pool depth are not modeled.

Commodity disclosure console: The public read-only status page and API endpoint (Phase 2C pattern) that aggregates reserve, NAVEngine, oracle, liquidity, mint/redeem, and solvency snapshot health into a single structured disclosure surface with four-tier risk labels (HEALTHY / WATCH / DEGRADED / CRITICAL).

---

This document is a governance framework. Nothing in this document constitutes investment advice, a solicitation to invest, a representation of current or future performance, a guarantee of any return, or a legal opinion. All commodity candidates listed herein are candidates only and are not launched, approved, or available for purchase unless separately confirmed by a completed governance vote, a passing launch gate, and a live commodity disclosure endpoint.
