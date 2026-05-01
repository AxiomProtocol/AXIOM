# AXAG — Stage 2 Evidence Tracker

Document class: Commodity Candidate Evidence Tracker
Framework: Commodity Expansion Framework v1.0.0
Candidate: Axiom Silver (AXAG)
Stage: 2 — Technical Diligence
Tracker status: OPEN — 36 items open, 0 closed
Source packet: documents/commodities/AXAG_STAGE_2_DILIGENCE_PACKET.md
Effective date: 2026-05-01
Last updated: 2026-05-01

---

## Status banner

AXAG is a **candidate only**. AXAG is **not live**, **not approved for deployment**, **not minted**, **not listed**, and **not redeemable**. This tracker governs evidence collection and diligence progress only. No item in this tracker authorizes any deployment, contract publication, token mint, swap pool creation, or banking integration. Closing every item in this tracker does not constitute approval — Stage 3 governance vote and Stage 4 launch readiness gate remain required.

---

## How to use this tracker

| Field             | Instructions                                                                    |
| ----------------- | ------------------------------------------------------------------------------- |
| Item ID           | Stable identifier. Do not change once assigned.                                 |
| Workstream        | Custody / Liquidity / Oracle / Reserve / Regulatory / Process / Owner          |
| Requirement       | Verbatim from the Stage 2 diligence packet evidence checklist or owner table.   |
| Owner role        | Role placeholder from the diligence packet.                                     |
| Assigned owner    | Named individual. Leave blank until assigned.                                   |
| Status            | OPEN / IN PROGRESS / BLOCKED / CLOSED                                           |
| Evidence link     | Path to attached document, URL, or artifact reference. Leave blank until filed. |
| Blocker notes     | Any dependency, constraint, or risk blocking progress.                          |
| Target date       | Leave blank until owner is named and target is agreed.                          |

Status definitions:
- **OPEN** — not started; no owner, no evidence
- **IN PROGRESS** — owner named; work under way; no evidence filed yet
- **BLOCKED** — work cannot proceed; blocker notes required
- **CLOSED** — evidence filed and reviewed by the reviewer named in the Owner table

---

## Section 1 — Custody

Source: Section 7 (Custody) of the diligence packet.
Owner role: Treasury operations lead (reviewer: Compliance lead).
Remediation priority: **HIGH** — Custody Risk scored 3 in Stage 1; must reach ≤ 2 before re-scoring.

| Item ID | Workstream | Requirement                                                                   | Owner role                 | Assigned owner | Status | Evidence link | Blocker notes                                                                        | Target date |
| ------- | ---------- | ----------------------------------------------------------------------------- | -------------------------- | -------------- | :----: | ------------- | ------------------------------------------------------------------------------------ | ----------- |
| C-01    | Custody    | Custody RFP final                                                             | Treasury operations lead   |                |  OPEN  |               | No custody partner identified. RFP must be drafted and issued before any response can be collected. |             |
| C-02    | Custody    | Custody RFP responses tabulated against framework Section 6 criteria          | Treasury operations lead   |                |  OPEN  |               | Blocked on C-01.                                                                     |             |
| C-03    | Custody    | Selected custodian identified (Path A, B, or documented fallback)             | Treasury operations lead   |                |  OPEN  |               | Blocked on C-02. Path A (PAXG-equivalent silver issuer) currently has no known candidate; Path B (regulated custodian + quarterly PoR) is the expected path. |             |
| C-04    | Custody    | Term sheet drafted and attached                                               | Treasury operations lead   |                |  OPEN  |               | Blocked on C-03.                                                                     |             |
| C-05    | Custody    | Vault location, segregation model, and insurance position documented          | Treasury operations lead   |                |  OPEN  |               | Blocked on C-03.                                                                     |             |
| C-06    | Custody    | Attestation cadence agreed (monthly preferred, quarterly minimum)             | Treasury operations lead   |                |  OPEN  |               | Blocked on C-04. Cadence must appear in the term sheet.                              |             |
| C-07    | Custody    | Chain-of-custody model documented from refining to vault                      | Treasury operations lead   |                |  OPEN  |               | Blocked on C-03. Must cover assay, transport, storage, and audit trail.              |             |

Section subtotal: 7 items — 7 OPEN

---

## Section 2 — Liquidity

Source: Section 7 (Liquidity) of the diligence packet.
Owner role: Liquidity operations lead (reviewer: Treasury operations lead).
Remediation priority: **HIGH** — Liquidity Risk scored 3 in Stage 1; must reach ≤ 2 before re-scoring.

| Item ID | Workstream | Requirement                                                                              | Owner role                  | Assigned owner | Status | Evidence link | Blocker notes                                                                                     | Target date |
| ------- | ---------- | ---------------------------------------------------------------------------------------- | --------------------------- | -------------- | :----: | ------------- | ------------------------------------------------------------------------------------------------- | ----------- |
| L-01    | Liquidity  | AMM bootstrap design document (venue, paired asset, fee tier, seed amount, slippage targets) | Liquidity operations lead   |                |  OPEN  |               | No AMM pool exists for tokenized silver on Arbitrum One today. Design must precede any pool action. |             |
| L-02    | Liquidity  | Market-maker arrangement documented, or documented decision not to engage one            | Liquidity operations lead   |                |  OPEN  |               | Depends on L-01. If no market maker engaged, decision must be written and reviewed.               |             |
| L-03    | Liquidity  | Redemption SLA draft (T+0 / T+1 / T+N, identity verification, fee schedule, cancellation policy) | Liquidity operations lead   |                |  OPEN  |               | Depends on C-04 (custody term sheet) to determine achievable settlement window.                   |             |
| L-04    | Liquidity  | Fallback redemption path documented for primary-channel unavailability                   | Liquidity operations lead   |                |  OPEN  |               | Blocked on L-03.                                                                                  |             |
| L-05    | Liquidity  | Projected liquidity depth and turnover with stated assumptions                           | Liquidity operations lead   |                |  OPEN  |               | Blocked on L-01 and L-02. Projections must state assumptions explicitly (seed capital, maker commitment, volume ramp). |             |

Section subtotal: 5 items — 5 OPEN

---

## Section 3 — Oracle

Source: Section 7 (Oracle) of the diligence packet.
Owner role: Protocol engineering lead (reviewer: Risk lead).
Remediation priority: **VERIFY** — Oracle Risk scored 2 in Stage 1; no change to score needed but evidence must be filed.

| Item ID | Workstream | Requirement                                                                                    | Owner role                   | Assigned owner | Status | Evidence link | Blocker notes                                                                                       | Target date |
| ------- | ---------- | ---------------------------------------------------------------------------------------------- | ---------------------------- | -------------- | :----: | ------------- | --------------------------------------------------------------------------------------------------- | ----------- |
| O-01    | Oracle     | Chainlink XAG/USD Arbitrum One aggregator address verified (or absence documented)             | Protocol engineering lead    |                |  OPEN  |               | If the feed does not exist on Arbitrum One, oracle score must be downgraded and a Tier 2 plan filed in its place. |             |
| O-02    | Oracle     | HB-01 freshness probe result captured, or Tier 2 oracle plan attached                         | Protocol engineering lead    |                |  OPEN  |               | Blocked on O-01. If O-01 confirms absence, O-02 becomes the Tier 2 plan.                           |             |
| O-03    | Oracle     | Heartbeat, deviation threshold, and stale-policy documented                                   | Protocol engineering lead    |                |  OPEN  |               | Blocked on O-01. Derived from the aggregator configuration or from the Tier 2 design.               |             |
| O-04    | Oracle     | Oracle failure-mode policy attached (behavior during stale, missing, or out-of-bounds reading) | Protocol engineering lead    |                |  OPEN  |               | Must cover AXAG minting pause, redemption pause, and circuit-breaker reset procedure.               |             |

Section subtotal: 4 items — 4 OPEN

---

## Section 4 — Reserve

Source: Section 7 (Reserve) of the diligence packet.
Owner role: Compliance lead (reviewer: Treasury operations lead).
Remediation priority: **CONFIRM** — Reserve Risk scored 1 in Stage 1; confirm and file evidence to lock the score.

| Item ID | Workstream | Requirement                                                                           | Owner role        | Assigned owner | Status | Evidence link | Blocker notes                                                                             | Target date |
| ------- | ---------- | ------------------------------------------------------------------------------------- | ----------------- | -------------- | :----: | ------------- | ----------------------------------------------------------------------------------------- | ----------- |
| R-01    | Reserve    | LBMA Good Delivery silver bar specification confirmed                                 | Compliance lead   |                |  OPEN  |               | Depends on C-03. Specification must match the custodian's accepted delivery standards.    |             |
| R-02    | Reserve    | Storage location, insurance, and chain-of-custody documentation collected             | Compliance lead   |                |  OPEN  |               | Depends on C-05 and C-07.                                                                 |             |
| R-03    | Reserve    | Volatility floor analysis showing < 40% annualized historical volatility for silver   | Compliance lead   |                |  OPEN  |               | Use at least 36 months of XAG/USD historical data. Note: silver spot vol has historically ranged 25-35% with stress spikes — stress-test the 40% threshold explicitly. |             |

Section subtotal: 3 items — 3 OPEN

---

## Section 5 — Regulatory

Source: Section 7 (Regulatory) of the diligence packet.
Owner role: General counsel coordinator (reviewer: Compliance lead).
Remediation priority: **DOCUMENT** — Regulatory Risk scored 2 in Stage 1; legal opinion is required to hold the score.

| Item ID | Workstream  | Requirement                                                                                      | Owner role                    | Assigned owner | Status | Evidence link | Blocker notes                                                                                                        | Target date |
| ------- | ----------- | ------------------------------------------------------------------------------------------------ | ----------------------------- | -------------- | :----: | ------------- | -------------------------------------------------------------------------------------------------------------------- | ----------- |
| REG-01  | Regulatory  | Outside legal opinion engagement letter signed                                                   | General counsel coordinator   |                |  OPEN  |               | No engagement begun. This is a Stage 2 hard prerequisite — governance vote cannot be scheduled until the opinion is delivered. |             |
| REG-02  | Regulatory  | Scope of work covers commodity (CFTC), securities (Reves/Howey), and money-transmission analyses | General counsel coordinator   |                |  OPEN  |               | Blocked on REG-01. Scope must be confirmed in the engagement letter before work commences.                           |             |
| REG-03  | Regulatory  | Disclosure draft reviewed against lib/glossary.ts                                                | Communications lead           |                |  OPEN  |               | Requires REG-01 and REG-02 to be in progress. Glossary rules in lib/glossary.ts are binding: no "compliant", no APY claims, no "only platform" language, no definitive token-classification conclusions. |             |
| REG-04  | Regulatory  | Glossary alignment check completed and signed off                                                | Communications lead           |                |  OPEN  |               | Blocked on REG-03. Sign-off requires both communications lead and general counsel coordinator.                       |             |

Section subtotal: 4 items — 4 OPEN

---

## Section 6 — Process

Source: Section 7 (Process) of the diligence packet.
Owner role: Risk lead (reviewer: Compliance lead).
Remediation priority: **SEQUENCE** — these items are the closing artifacts that conclude Stage 2.

| Item ID | Workstream | Requirement                                                                 | Owner role       | Assigned owner | Status | Evidence link | Blocker notes                                                                                       | Target date |
| ------- | ---------- | --------------------------------------------------------------------------- | ---------------- | -------------- | :----: | ------------- | --------------------------------------------------------------------------------------------------- | ----------- |
| P-01    | Process    | Stage 1 scoring report attached to this packet                              | Risk lead        |                |  OPEN  |               | Report is complete. Owner must formally attach the artifact to the packet.                          |             |
| P-02    | Process    | Stage 2 diligence packet completed and reviewed                             | Risk lead        |                |  OPEN  |               | Requires all C, L, O, R, REG items to be CLOSED before this item can close.                         |             |
| P-03    | Process    | Re-scoring run executed against the validated engine                        | Risk lead        |                |  OPEN  |               | Blocked on all seven re-scoring trigger conditions in packet Section 9. Engine: pages/api/operator/commodity-risk-score.ts (operator-gated). |             |
| P-04    | Process    | Re-scoring result (JSON artifact) attached                                  | Risk lead        |                |  OPEN  |               | Blocked on P-03.                                                                                    |             |
| P-05    | Process    | Stage 3 governance vote scheduling decision recorded                        | Risk lead        |                |  OPEN  |               | Blocked on P-04. May only be scheduled if re-scoring shows no dimension scoring 3 or above and all governance vote readiness conditions in packet Section 10 are met. |             |

Section subtotal: 5 items — 5 OPEN

---

## Section 7 — Owner Assignments

Source: Section 8 of the diligence packet.
Every owner slot is a role placeholder. Named individuals must be assigned before any item in the corresponding workstream moves to IN PROGRESS.

| Item ID | Workstream            | Role responsible             | Reviewer                   | Assigned owner | Status | Assigned date | Notes                                                                   |
| ------- | --------------------- | ---------------------------- | -------------------------- | -------------- | :----: | ------------- | ----------------------------------------------------------------------- |
| OW-01   | Custody diligence     | Treasury operations lead     | Compliance lead            |                |  OPEN  |               | Must be named before C-01 can begin.                                    |
| OW-02   | Liquidity bootstrap   | Liquidity operations lead    | Treasury operations lead   |                |  OPEN  |               | Must be named before L-01 can begin.                                    |
| OW-03   | Oracle verification   | Protocol engineering lead    | Risk lead                  |                |  OPEN  |               | Must be named before O-01 can begin.                                    |
| OW-04   | Legal review          | General counsel coordinator  | Compliance lead            |                |  OPEN  |               | Must be named before REG-01 can begin.                                  |
| OW-05   | Reserve standards     | Compliance lead              | Treasury operations lead   |                |  OPEN  |               | Must be named before R-01 can begin.                                    |
| OW-06   | Disclosure language   | Communications lead          | General counsel coord.     |                |  OPEN  |               | Must be named before REG-03 can begin.                                  |
| OW-07   | Re-scoring run        | Risk lead                    | Compliance lead            |                |  OPEN  |               | Must be named before P-03 can begin.                                    |
| OW-08   | Packet sign-off       | Operator (named)             | Governance steward         |                |  OPEN  |               | Final sign-off gate. Must be named; "Operator" is not a sufficient name. |

Section subtotal: 8 items — 8 OPEN

---

## Section 8 — Stage 2 Exit Criteria

Stage 2 is complete only when **every one** of the following conditions is met. This section is a checklist that may not be marked complete by any individual — it requires dual sign-off (operator and governance steward, OW-08).

### Evidence checklist closure

- [ ] All 7 Custody items (C-01 through C-07) are CLOSED with evidence attached
- [ ] All 5 Liquidity items (L-01 through L-05) are CLOSED with evidence attached
- [ ] All 4 Oracle items (O-01 through O-04) are CLOSED with evidence attached
- [ ] All 3 Reserve items (R-01 through R-03) are CLOSED with evidence attached
- [ ] All 4 Regulatory items (REG-01 through REG-04) are CLOSED with evidence attached
- [ ] All 5 Process items (P-01 through P-05) are CLOSED with evidence attached

### Owner assignment closure

- [ ] All 8 owner assignment rows (OW-01 through OW-08) are CLOSED with named individuals recorded

### Re-scoring closure

- [ ] Re-scoring run has been executed by the risk lead (P-03 CLOSED)
- [ ] Re-scoring JSON artifact is attached (P-04 CLOSED)
- [ ] Re-scoring result shows no dimension scoring 3 or above
- [ ] Re-scoring result is reviewed and accepted by the compliance lead

### Governance scheduling closure

- [ ] Governance vote scheduling decision is recorded (P-05 CLOSED)
- [ ] Scheduling memo is published to the governance forum

### Dual sign-off

- [ ] Operator (named individual, OW-08) has signed off on Stage 2 exit
- [ ] Governance steward has signed off on Stage 2 exit
- [ ] Date of dual sign-off recorded here: _______________

When all boxes above are checked and dual sign-off is recorded, Stage 2 is formally closed and AXAG advances to Stage 3 (Governance Vote) per the Commodity Expansion Framework v1.0.0, Section 7.

---

## Section 9 — Tracker Summary

| Workstream        | Total items | OPEN | IN PROGRESS | BLOCKED | CLOSED |
| ----------------- | :---------: | :--: | :---------: | :-----: | :----: |
| Custody           |      7      |  7   |      0      |    0    |   0    |
| Liquidity         |      5      |  5   |      0      |    0    |   0    |
| Oracle            |      4      |  4   |      0      |    0    |   0    |
| Reserve           |      3      |  3   |      0      |    0    |   0    |
| Regulatory        |      4      |  4   |      0      |    0    |   0    |
| Process           |      5      |  5   |      0      |    0    |   0    |
| Owner assignments |      8      |  8   |      0      |    0    |   0    |
| **TOTAL**         |   **36**    | **36** |    **0**  |  **0**  | **0**  |

Last updated: 2026-05-01. Update this table each time an item changes status.

---

## Section 10 — Explicit Statement

**AXAG IS NOT LIVE AND IS NOT APPROVED FOR DEPLOYMENT.**

This tracker is a governance and evidence-management document only. Closing every item in this tracker does not constitute approval of any AXAG instrument, token, contract, or reserve arrangement. Final deployment authority rests with a completed governance vote and a passing Stage 4 launch readiness gate, in that order, and not with this document.

No contract has been deployed. No token has been minted. No swap pool has been opened. No banking rail has been enabled. No public claim of AXAG availability is made or implied.

---

End of tracker.
