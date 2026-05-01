# AXAG — Stage 2 Technical Diligence Packet

Document class: Commodity Candidate Diligence Packet
Framework: Commodity Expansion Framework v1.0.0
Candidate: Axiom Silver (AXAG)
Stage: 2 — Technical Diligence
Status: OPEN — diligence in progress
Effective date: 2026-05-01

---

## Status banner

AXAG is a **candidate only**. AXAG is **not live**, **not approved for deployment**, **not minted**, **not listed**, and **not redeemable**. No contract has been deployed. No swap pool has been opened. No banking rail has been enabled. No public claim of AXAG availability has been made or is implied by this document. This packet governs documentation and diligence planning only.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Stage 1 Scoring Result](#2-stage-1-scoring-result)
3. [Custody Diligence Plan](#3-custody-diligence-plan)
4. [Liquidity Bootstrap Plan](#4-liquidity-bootstrap-plan)
5. [Oracle Verification Plan](#5-oracle-verification-plan)
6. [Legal Review Plan](#6-legal-review-plan)
7. [Evidence Checklist](#7-evidence-checklist)
8. [Owner / Responsible Party Table](#8-owner--responsible-party-table)
9. [Re-Scoring Trigger Conditions](#9-re-scoring-trigger-conditions)
10. [Governance Vote Readiness Conditions](#10-governance-vote-readiness-conditions)
11. [Explicit Statement](#11-explicit-statement)

---

## 1. Executive Summary

The Axiom Silver (AXAG) candidate completed Stage 1 (Candidate Submission) with a composite risk score of **11 — CONDITIONAL band**. The Stage 1 report identified two dimensions scoring 3 (Custody Risk and Liquidity Risk) that must be remediated before AXAG can be re-scored or considered for governance vote.

This packet defines the Stage 2 diligence work required to close those gaps, verify the dimensions that scored 1 or 2, and assemble the evidence base needed for a credible re-scoring run.

The packet covers four remediation preconditions identified in the Stage 1 report:

1. Custody RFP completed with a signed term sheet
2. Liquidity bootstrap plan documented and reviewed
3. Chainlink XAG/USD Arbitrum One deployment independently verified (or a Tier 2 oracle plan documented in its place)
4. Outside legal opinion engagement letter attached to the candidate packet

This packet does not authorize any deployment, contract publication, swap pool creation, banking integration, or public marketing of AXAG. Stage 2 produces documents and evidence only.

---

## 2. Stage 1 Scoring Result

The following scoring result was produced by the validated Commodity Risk Scoring Engine (`lib/commodity/riskScoring.ts`) on 2026-05-01 and is reproduced here as the Stage 1 artifact.

### Scoring table

| Dimension       | Score | Multiplier | Weighted | Remediation required |
| --------------- | :---: | :--------: | :------: | :------------------: |
| Oracle Risk     |   2   |    1.0     |   2.0    |        verify        |
| Custody Risk    |   3   |    1.0     |   3.0    |       **yes**        |
| Liquidity Risk  |   3   |    1.0     |   3.0    |       **yes**        |
| Reserve Risk    |   1   |    1.0     |   1.0    |        confirm       |
| Regulatory Risk |   2   |    1.0     |   2.0    |        document      |
| **Composite**   |  11   |     —      |   11.0   |          —           |

### Band

**CONDITIONAL** (composite 11–16). AXAG sits at the low edge of CONDITIONAL, six points above AXAU's reference composite of 5.

### Band outcome (engine output, verbatim)

> May proceed to Stage 3 with a documented remediation plan addressing each dimension scoring 3 or above.

### Engine remediation notes (verbatim)

- Custody Risk score 3 (remediation required): Exchange-grade multi-party authorization arrangement with independent audit, no regulated custodian.
- Liquidity Risk score 3 (remediation required): Reserve asset has moderate spot market (daily volume $1M – $10M) or redemption requires T+1 settlement.
- CONDITIONAL band requires a documented remediation plan for each dimension scoring 3 or above before Stage 3 governance vote.

### Engine launch gate warnings (verbatim)

- Launch readiness gate must be re-run in full after each remediation item is closed (Section 11.3).

### Engine advisory (verbatim)

- Scoring result is advisory and does not replace governance vote.

---

## 3. Custody Diligence Plan

### Objective

Move Custody Risk from score 3 to score ≤ 2 by establishing a contractual relationship with a custody partner whose model meets or exceeds the criteria in Section 6 of the framework.

### Target outcome

A signed custody term sheet with one or more of the following models:

- **Path A — Qualified-custodian on-chain receipt model** (would map to score 1). Requires a regulated, qualified custodian to issue an on-chain redeemable silver receipt token analogous to PAXG. No such issuer is known to exist for silver today; pursuing this path requires sourcing a new issuer relationship.
- **Path B — Regulated custodian with quarterly proof-of-reserves** (would map to score 2). A regulated custodian holding silver in a segregated account with attestable proof-of-reserves at quarterly cadence, but without a directly redeemable on-chain receipt.
- **Path C — Exchange-grade vault with independent audit** (current score 3 baseline). Acceptable only as a fallback documented alongside an upgrade path to A or B.

### Diligence steps (documentation only)

1. Draft custody RFP describing AXAG reserve scope, attestation requirements, audit cadence, insurance expectations, and on-chain reporting integration points.
2. Issue RFP to candidate counterparties identified through the framework's approved-vendor research pipeline.
3. Collect and tabulate responses against Section 6 standards.
4. Score each response against the rubric in Section 10 of the framework.
5. Draft term sheet for the highest-scoring respondent that meets Path A or Path B criteria.
6. Attach term sheet, RFP, and tabulated comparison to this packet.

### Out of scope for this stage

- Signing a custody agreement (Stage 4 prerequisite).
- Transferring any silver reserves to any custodian.
- Onboarding any custody API into production systems.

### Acceptance criteria

The custody section of this packet is closed when all of the following are attached:

- [ ] Final RFP document
- [ ] All responses received, with a tabulated comparison against framework Section 6
- [ ] A draft term sheet aligned with Path A or Path B
- [ ] A documented attestation cadence (monthly preferred, quarterly minimum)
- [ ] A documented insurance position
- [ ] A documented chain-of-custody model from refining to vault

---

## 4. Liquidity Bootstrap Plan

### Objective

Move Liquidity Risk from score 3 to score ≤ 2 by documenting a credible on-chain liquidity model and a credible redemption model.

### Target outcome

A liquidity plan that demonstrates either:

- **On-chain liquidity Path A** — a credible AMM bootstrap with documented seed depth, market-maker arrangement, and projected daily volume sufficient to map to score 1 or 2 in framework Section 8, **or**
- **Redemption liquidity Path B** — a redemption SLA capable of T+1 settlement against physical silver, with the custody partner's vault location, settlement bank, and reconciliation cadence documented.

### Diligence steps (documentation only)

1. Draft AMM bootstrap design: paired asset, fee tier, initial seed amount, slippage targets, and liquidity-mining policy if any. Identify the venue (Camelot, Uniswap V3, or other Arbitrum One AMM).
2. Document any market-maker engagement: counterparty name, depth commitment, spread commitment, and term length.
3. Draft redemption SLA: initiation channel, identity verification requirements, settlement window (T+0 / T+1 / T+N), cancellation and partial-fill policy, fee schedule.
4. Document fallback redemption path in the event the primary redemption channel is unavailable.
5. Attach all of the above to this packet.

### Out of scope for this stage

- Opening an AMM pool.
- Funding any pool with reserves.
- Engaging market makers under binding contract.
- Activating any redemption channel.

### Acceptance criteria

- [ ] AMM bootstrap design document
- [ ] Market-maker term sheet (if applicable) or documented decision not to engage one
- [ ] Redemption SLA draft
- [ ] Fallback redemption path documented
- [ ] Projected liquidity depth and turnover, with stated assumptions

---

## 5. Oracle Verification Plan

### Objective

Confirm that the dimension scored at 2 in Stage 1 is supported by current observable evidence on Arbitrum One, or downgrade the score and document a Tier 2 oracle plan.

### Target outcome

Either:

- **Path A — verified primary oracle**: a Chainlink XAG/USD aggregator deployment on Arbitrum One mainnet with documented address, deployment date, heartbeat, deviation threshold, and observed `isStale` behavior under the framework's HB-01 freshness probe, **or**
- **Path B — Tier 2 oracle plan**: a documented secondary oracle architecture (multi-source median, signed feed bundle, or cross-chain bridged feed) that meets framework Section 5 standards independently of Chainlink.

### Diligence steps (documentation only)

1. Verify the existence of a Chainlink XAG/USD aggregator on Arbitrum One mainnet using public block explorer evidence. Record the address, deployment block, and current configuration.
2. If verified, run the HB-01 freshness probe (read-only) against the aggregator and capture the result.
3. If not verified, document a Tier 2 oracle architecture specifying source feeds, aggregation logic, freshness rules, and circuit-breaker behavior.
4. Document the oracle failure mode policy: what AXAG redemption and minting flows are expected to do when the oracle is stale, missing, or returns an out-of-bounds value.
5. Attach all of the above to this packet.

### Out of scope for this stage

- Subscribing to any commercial feed.
- Deploying any oracle adapter contract.
- Wiring the oracle into any production code path.

### Acceptance criteria

- [ ] Aggregator address verified or absence documented
- [ ] HB-01 freshness probe result attached, or Tier 2 plan attached
- [ ] Oracle failure-mode policy attached
- [ ] Heartbeat and deviation thresholds documented

---

## 6. Legal Review Plan

### Objective

Document the regulatory analysis required to support the Stage 1 Regulatory Risk score of 2, and obtain an outside legal opinion specific to AXAG.

### Target outcome

A signed engagement letter with outside counsel, a documented work plan covering instrument classification under U.S. federal law, and a draft disclosure package aligned with the language rules in `lib/glossary.ts`.

### Diligence steps (documentation only)

1. Draft scope of work for outside counsel covering:
   - Commodity classification (CFTC analysis, comparison to silver futures and physical silver).
   - Securities classification analysis (Reves and Howey).
   - Money-transmission analysis under state law.
   - Comparison to PAXG-style instruments and any relevant no-action precedent.
   - Disclosure language review against the canonical glossary.
2. Solicit fee proposals from candidate firms with prior tokenized-commodity experience.
3. Sign engagement letter with the selected firm.
4. Attach engagement letter and scope of work to this packet.
5. Track legal opinion delivery as a Stage 3 prerequisite.

### Disclosure language rules (binding)

All AXAG disclosure copy drafted under this packet must comply with the rules already encoded in `lib/glossary.ts`:

- No absolutist positioning ("only", "sole", "the standard").
- No wealth outcome promises ("guaranteed returns", "APY" as a claim — use "Variable").
- No unqualified "compliant" language. Use "designed to align with" where applicable.
- No definitive legal conclusions about token classification — those are reserved for outside counsel's signed opinion.
- No public claim that AXAG is live, available, redeemable, or listed.

### Out of scope for this stage

- Filing any registration or notice with any regulator.
- Issuing any public-facing AXAG marketing.
- Publishing any disclosure document as final.

### Acceptance criteria

- [ ] Scope of work for outside counsel drafted
- [ ] Fee proposals collected and evaluated
- [ ] Engagement letter signed and attached
- [ ] Draft disclosure package reviewed against `lib/glossary.ts`
- [ ] Legal opinion delivery date scheduled

---

## 7. Evidence Checklist

The following evidence items are required to consider the Stage 2 packet complete. Items map to the Stage 1 report's "Evidence still required before any deployment" section.

### Custody

- [ ] Custody RFP final
- [ ] Custody RFP responses tabulated
- [ ] Selected custodian identified
- [ ] Term sheet drafted and attached
- [ ] Vault location, segregation model, insurance position documented
- [ ] Attestation cadence agreed (monthly preferred)
- [ ] Chain-of-custody model documented from refining to vault

### Liquidity

- [ ] AMM bootstrap design document
- [ ] Market-maker arrangement documented (or documented decision not to engage)
- [ ] Redemption SLA draft (T+0 / T+1 / T+N)
- [ ] Fallback redemption path documented
- [ ] Projected liquidity depth and turnover with stated assumptions

### Oracle

- [ ] Chainlink XAG/USD Arbitrum One aggregator address verified, or absence documented
- [ ] HB-01 freshness probe result captured, or Tier 2 oracle plan attached
- [ ] Heartbeat, deviation threshold, and stale-policy documented
- [ ] Oracle failure-mode policy attached

### Reserve

- [ ] LBMA Good Delivery silver bar specification confirmed
- [ ] Storage location, insurance, and chain-of-custody documentation collected
- [ ] Volatility floor analysis showing < 40% annualized historical vol

### Regulatory

- [ ] Outside legal opinion engagement letter signed
- [ ] Scope of work covers commodity, securities, money-transmission analyses
- [ ] Disclosure draft reviewed against `lib/glossary.ts`
- [ ] Glossary alignment check completed

### Process

- [ ] Stage 1 scoring report attached
- [ ] This Stage 2 packet completed and reviewed
- [ ] Re-scoring run executed against the validated engine
- [ ] Re-scoring result attached
- [ ] Stage 3 governance vote scheduling decision recorded

---

## 8. Owner / Responsible Party Table

The owner names below are role placeholders. They must be filled with named individuals before this packet is considered active. No work item starts until an owner is named.

| Workstream                  | Role responsible              | Reviewer                  | Status |
| --------------------------- | ----------------------------- | ------------------------- | :----: |
| Custody diligence           | Treasury operations lead      | Compliance lead           |  open  |
| Liquidity bootstrap         | Liquidity operations lead     | Treasury operations lead  |  open  |
| Oracle verification         | Protocol engineering lead     | Risk lead                 |  open  |
| Legal review                | General counsel coordinator   | Compliance lead           |  open  |
| Reserve standards check     | Compliance lead               | Treasury operations lead  |  open  |
| Disclosure language audit   | Communications lead           | General counsel coord.    |  open  |
| Re-scoring run              | Risk lead                     | Compliance lead           |  open  |
| Packet sign-off             | Operator (named)              | Governance steward        |  open  |

---

## 9. Re-Scoring Trigger Conditions

A re-scoring run is the formal step that produces the Stage 2 closing artifact. It must be triggered only when **all** of the following conditions are met:

1. Every "yes" remediation item in the Stage 1 scoring table has a documented and reviewed remediation plan attached.
2. The custody RFP has produced a draft term sheet aligned with Path A or Path B in Section 3.
3. The liquidity bootstrap plan has produced a documented AMM design and a redemption SLA draft, per Section 4.
4. The oracle verification plan has produced either a verified aggregator with HB-01 results or a documented Tier 2 architecture, per Section 5.
5. The legal review plan has produced a signed engagement letter, per Section 6.
6. The Reserve Risk and Regulatory Risk dimensions have their evidence items checked off in Section 7.
7. The Owner table in Section 8 has named individuals for every workstream, not role placeholders.

When all seven conditions are met, the risk lead executes the re-scoring run against the validated engine at `pages/api/operator/commodity-risk-score.ts` using the operator-gated UI at `pages/operator/commodity-risk-score.tsx`. The re-scoring result is attached to this packet as the Stage 2 closing artifact.

The re-scoring run does not deploy anything, mint anything, or list anything. It is a documentation step that produces a JSON scoring artifact.

---

## 10. Governance Vote Readiness Conditions

Stage 3 (Governance Vote) may be scheduled only when **all** of the following conditions are met. None of these conditions authorizes deployment — Stage 4 (Launch Readiness Gate) remains a separate, subsequent step.

1. The Stage 2 re-scoring run has produced a composite score with no dimension scoring 3 or above. AXAG must demonstrate movement out of the CONDITIONAL band's remediation triggers.
2. All evidence checklist items in Section 7 are marked complete.
3. The legal opinion has been delivered and reviewed.
4. The custody term sheet has been signed (not merely drafted).
5. The disclosure draft has been reviewed and signed off by general counsel and the communications lead.
6. The Stage 2 packet has been signed off by the operator and the governance steward (Section 8).
7. The governance steward has confirmed in writing that no remediation plan substitutes for completed evidence.
8. A scheduling memo has been published to the governance forum naming the proposed vote window, the proposal text, and the artifacts attached to the proposal.

A passing governance vote does not deploy AXAG. A passing governance vote authorizes initiation of Stage 4 (Launch Readiness Gate) per framework Section 11. Section 11 hard blockers HB-01 through HB-10 remain in force and must be independently satisfied.

---

## 11. Explicit Statement

**AXAG IS NOT LIVE AND IS NOT APPROVED FOR DEPLOYMENT.**

This document is a diligence packet only. It does not authorize, schedule, deploy, mint, list, or in any way enable any AXAG instrument. No contract has been deployed under this packet. No swap pool has been opened under this packet. No banking rail has been enabled under this packet. No public claim of AXAG availability is made or implied by this packet.

Final deployment authority rests with a completed governance vote and a passing launch readiness gate, and not with this document.

---

End of packet.
