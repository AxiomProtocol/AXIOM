# AXAG — Stage 2 Evidence Tracker

Document class: Commodity Candidate Evidence Tracker
Framework: Commodity Expansion Framework v1.0.0
Candidate: Axiom Silver (AXAG)
Stage: 2 — Technical Diligence
Tracker status: EXECUTION ACTIVE — 4 IN PROGRESS, 30 ASSIGNED, 1 CLOSED
Source packet: documents/commodities/AXAG_STAGE_2_DILIGENCE_PACKET.md
Effective date: 2026-05-01
Last updated: 2026-05-01 (C-02 evaluation matrix + outreach templates prepared; C-03 precondition gate formalized)

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
| Owner role        | Role from the diligence packet.                                                 |
| Assigned owner    | Named role designation. Replace with a named individual when confirmed.         |
| Status            | OPEN / ASSIGNED / IN PROGRESS / BLOCKED / CLOSED                                |
| Evidence link     | Path to attached document, URL, or artifact reference.                          |
| Blocker notes     | Any dependency, constraint, or risk blocking progress.                          |
| Target date       | Leave blank until owner agrees to a target.                                     |
| Last updated      | Date the row was last changed.                                                  |

Status definitions:
- **OPEN** — not started; no owner, no evidence
- **ASSIGNED** — owner role designated; work has not yet begun; no evidence filed
- **IN PROGRESS** — work actively under way; owner moving against this item today
- **BLOCKED** — work cannot proceed; blocker notes required
- **CLOSED** — evidence filed and reviewed by the designated reviewer

No item may advance to CLOSED without evidence attached and reviewer sign-off.

---

## Section 1 — Custody

Source: Section 7 (Custody) of the diligence packet.
Owner role: Treasury operations lead (reviewer: Compliance lead).
Remediation priority: **PRIORITY 1 — CRITICAL PATH** — Custody Risk scored 3 in Stage 1; must reach ≤ 2 before re-scoring. No re-scoring run may proceed until C-01 through C-07 are all CLOSED.

| Item ID | Workstream | Requirement                                                                   | Owner role                 | Assigned owner       | Status        | Evidence link                                          | Blocker notes                                                                                                                                                                                           | Target date | Last updated |
| ------- | ---------- | ----------------------------------------------------------------------------- | -------------------------- | -------------------- | :-----------: | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------ |
| C-01    | Custody    | Custody RFP final                                                             | Treasury operations lead   | Axiom Treasury Lead  | **CLOSED**    | documents/commodities/AXAG_CUSTODY_RFP.md              | RFP issued 2026-05-01. Document complete; outreach initiated to six candidate custodians.                                                                                                               | 2026-05-01  | 2026-05-01   |
| C-02    | Custody    | Custody RFP responses tabulated against framework Section 6 criteria          | Treasury operations lead   | Axiom Treasury Lead  | IN PROGRESS   | documents/commodities/AXAG_CUSTODY_SHORTLIST.md (live); documents/commodities/AXAG_CUSTODY_EVALUATION_MATRIX.md (live) | **Outreach started. Evaluation matrix prepared (v1.0 — public information basis).** 10-dimension scoring matrix built for all 6 candidates. 16 open questions registered. C-03 precondition checklist (PRE-01–PRE-08) defined. Outreach templates drafted (AXAG_CUSTODY_OUTREACH_TEMPLATES.md). Formal RFP responses pending from: Brink's, Loomis, BitGo, Anchorage, Malca-Amit, Via Mat. |             | 2026-05-01   |
| C-03    | Custody    | Selected custodian identified (Path A, B, or documented fallback)             | Treasury operations lead   | Axiom Treasury Lead  | ASSIGNED      |                                                        | Blocked on C-02. **PRIMARY BOTTLENECK — see Section 11.** C-03 PRECONDITION GATE: at least one candidate must satisfy all 7 Minimum Custody Standards (MC-01–MC-07) per AXAG_CUSTODY_EVALUATION_MATRIX.md Section 3 before C-03 may advance. No Path A issuer confirmed. Path B (Brink's / Loomis / Malca-Amit + independent PoR) is the confirmed viable path pending RFP responses. |             | 2026-05-01   |
| C-04    | Custody    | Term sheet drafted and attached                                               | Treasury operations lead   | Axiom Treasury Lead  | ASSIGNED      |                                                        | Blocked on C-03.                                                                                                                                                                                        |             | 2026-05-01   |
| C-05    | Custody    | Vault location, segregation model, and insurance position documented          | Treasury operations lead   | Axiom Treasury Lead  | ASSIGNED      |                                                        | Blocked on C-03.                                                                                                                                                                                        |             | 2026-05-01   |
| C-06    | Custody    | Attestation cadence agreed (monthly preferred, quarterly minimum)             | Treasury operations lead   | Axiom Treasury Lead  | ASSIGNED      |                                                        | Blocked on C-04. Cadence must appear in the term sheet.                                                                                                                                                 |             | 2026-05-01   |
| C-07    | Custody    | Chain-of-custody model documented from refining to vault                      | Treasury operations lead   | Axiom Treasury Lead  | ASSIGNED      |                                                        | Blocked on C-03. Must cover assay, transport, storage, and audit trail.                                                                                                                                 |             | 2026-05-01   |

Section subtotal: 7 items — **1 CLOSED** (C-01), 1 IN PROGRESS (C-02), 5 ASSIGNED

---

## Section 2 — Liquidity

Source: Section 7 (Liquidity) of the diligence packet.
Owner role: Liquidity operations lead (reviewer: Treasury operations lead).
Remediation priority: **PRIORITY 1 — CRITICAL PATH** — Liquidity Risk scored 3 in Stage 1; must reach ≤ 2 before re-scoring. No re-scoring run may proceed until L-01 through L-05 are all CLOSED.

| Item ID | Workstream | Requirement                                                                                   | Owner role                  | Assigned owner        | Status        | Evidence link | Blocker notes                                                                                                                                                       | Target date | Last updated |
| ------- | ---------- | --------------------------------------------------------------------------------------------- | --------------------------- | --------------------- | :-----------: | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------ |
| L-01    | Liquidity  | AMM bootstrap design document (venue, paired asset, fee tier, seed amount, slippage targets)  | Liquidity operations lead   | Axiom Liquidity Lead  | IN PROGRESS   |               | No AMM pool exists for tokenized silver on Arbitrum One today. Design must precede any pool action. Design work started.                                             |             | 2026-05-01   |
| L-02    | Liquidity  | Market-maker arrangement documented, or documented decision not to engage one                 | Liquidity operations lead   | Axiom Liquidity Lead  | ASSIGNED      |               | Depends on L-01. If no market maker engaged, decision must be written and reviewed.                                                                                 |             | 2026-05-01   |
| L-03    | Liquidity  | Redemption SLA draft (T+0 / T+1 / T+N, identity verification, fee schedule, cancellation policy) | Liquidity operations lead   | Axiom Liquidity Lead  | ASSIGNED      |               | Depends on C-04 (custody term sheet) to determine achievable settlement window. Blocked until C-03 resolves.                                                        |             | 2026-05-01   |
| L-04    | Liquidity  | Fallback redemption path documented for primary-channel unavailability                        | Liquidity operations lead   | Axiom Liquidity Lead  | ASSIGNED      |               | Blocked on L-03.                                                                                                                                                    |             | 2026-05-01   |
| L-05    | Liquidity  | Projected liquidity depth and turnover with stated assumptions                                | Liquidity operations lead   | Axiom Liquidity Lead  | ASSIGNED      |               | Blocked on L-01 and L-02. Projections must state assumptions explicitly (seed capital, maker commitment, volume ramp).                                              |             | 2026-05-01   |

Section subtotal: 5 items — 1 IN PROGRESS (L-01), 4 ASSIGNED

---

## Section 3 — Oracle

Source: Section 7 (Oracle) of the diligence packet.
Owner role: Protocol engineering lead (reviewer: Risk lead).
Remediation priority: **PRIORITY 2 — VERIFY** — Oracle Risk scored 2 in Stage 1; score holds but evidence must be filed. Runs in parallel with critical path.

| Item ID | Workstream | Requirement                                                                                    | Owner role                   | Assigned owner            | Status        | Evidence link | Blocker notes                                                                                       | Target date | Last updated |
| ------- | ---------- | ---------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------- | :-----------: | ------------- | --------------------------------------------------------------------------------------------------- | ----------- | ------------ |
| O-01    | Oracle     | Chainlink XAG/USD Arbitrum One aggregator address verified (or absence documented)             | Protocol engineering lead    | Axiom Protocol Engineer   | IN PROGRESS   |               | If the feed does not exist on Arbitrum One, oracle score must be downgraded and a Tier 2 plan filed in its place. Verification under way. |             | 2026-05-01   |
| O-02    | Oracle     | HB-01 freshness probe result captured, or Tier 2 oracle plan attached                         | Protocol engineering lead    | Axiom Protocol Engineer   | ASSIGNED      |               | Blocked on O-01. If O-01 confirms absence, O-02 becomes the Tier 2 plan.                           |             | 2026-05-01   |
| O-03    | Oracle     | Heartbeat, deviation threshold, and stale-policy documented                                   | Protocol engineering lead    | Axiom Protocol Engineer   | ASSIGNED      |               | Blocked on O-01. Derived from the aggregator configuration or from the Tier 2 design.               |             | 2026-05-01   |
| O-04    | Oracle     | Oracle failure-mode policy attached (behavior during stale, missing, or out-of-bounds reading) | Protocol engineering lead    | Axiom Protocol Engineer   | ASSIGNED      |               | Must cover AXAG minting pause, redemption pause, and circuit-breaker reset procedure.               |             | 2026-05-01   |

Section subtotal: 4 items — 1 IN PROGRESS (O-01), 3 ASSIGNED

---

## Section 4 — Reserve

Source: Section 7 (Reserve) of the diligence packet.
Owner role: Compliance lead (reviewer: Treasury operations lead).
Remediation priority: **PRIORITY 2 — CONFIRM** — Reserve Risk scored 1 in Stage 1. R-01 and R-02 depend on custody items; R-03 can start independently.

| Item ID | Workstream | Requirement                                                                           | Owner role        | Assigned owner           | Status     | Evidence link | Blocker notes                                                                                | Target date | Last updated |
| ------- | ---------- | ------------------------------------------------------------------------------------- | ----------------- | ------------------------ | :--------: | ------------- | -------------------------------------------------------------------------------------------- | ----------- | ------------ |
| R-01    | Reserve    | LBMA Good Delivery silver bar specification confirmed                                 | Compliance lead   | Axiom Compliance Lead    | ASSIGNED   |               | Depends on C-03. Specification must match the custodian's accepted delivery standards.       |             | 2026-05-01   |
| R-02    | Reserve    | Storage location, insurance, and chain-of-custody documentation collected             | Compliance lead   | Axiom Compliance Lead    | ASSIGNED   |               | Depends on C-05 and C-07.                                                                    |             | 2026-05-01   |
| R-03    | Reserve    | Volatility floor analysis showing < 40% annualized historical volatility for silver   | Compliance lead   | Axiom Compliance Lead    | ASSIGNED   |               | No custody dependency. Can begin immediately. Use ≥ 36 months XAG/USD data; stress-test 40% threshold. |             | 2026-05-01   |

Section subtotal: 3 items — 0 IN PROGRESS, 3 ASSIGNED

---

## Section 5 — Regulatory

Source: Section 7 (Regulatory) of the diligence packet.
Owner role: General counsel coordinator (REG-01, REG-02); Communications lead (REG-03, REG-04). Reviewer: Compliance lead.
Remediation priority: **PRIORITY 2 — DOCUMENT** — Regulatory Risk scored 2 in Stage 1. REG-01 can start immediately; no custody dependency.

| Item ID | Workstream  | Requirement                                                                                      | Owner role                    | Assigned owner               | Status        | Evidence link | Blocker notes                                                                                                        | Target date | Last updated |
| ------- | ----------- | ------------------------------------------------------------------------------------------------ | ----------------------------- | ---------------------------- | :-----------: | ------------- | -------------------------------------------------------------------------------------------------------------------- | ----------- | ------------ |
| REG-01  | Regulatory  | Outside legal opinion engagement letter signed                                                   | General counsel coordinator   | Axiom GC Coordinator         | IN PROGRESS   |               | Engagement outreach started. Hard prerequisite — governance vote cannot be scheduled until opinion is delivered.     |             | 2026-05-01   |
| REG-02  | Regulatory  | Scope of work covers commodity (CFTC), securities (Reves/Howey), and money-transmission analyses | General counsel coordinator   | Axiom GC Coordinator         | ASSIGNED      |               | Blocked on REG-01. Scope must be confirmed in the engagement letter before work commences.                           |             | 2026-05-01   |
| REG-03  | Regulatory  | Disclosure draft reviewed against lib/glossary.ts                                                | Communications lead           | Axiom Communications Lead    | ASSIGNED      |               | Requires REG-01 and REG-02 to be in progress. Glossary rules in lib/glossary.ts are binding.                         |             | 2026-05-01   |
| REG-04  | Regulatory  | Glossary alignment check completed and signed off                                                | Communications lead           | Axiom Communications Lead    | ASSIGNED      |               | Blocked on REG-03. Sign-off requires both communications lead and general counsel coordinator.                       |             | 2026-05-01   |

Section subtotal: 4 items — 1 IN PROGRESS (REG-01), 3 ASSIGNED

---

## Section 6 — Process

Source: Section 7 (Process) of the diligence packet.
Owner role: Risk lead (reviewer: Compliance lead).
Remediation priority: **PRIORITY 3 — SEQUENCE** — closing artifacts; all other sections must be CLOSED before P-02 through P-05 can advance.

| Item ID | Workstream | Requirement                                                                 | Owner role       | Assigned owner      | Status     | Evidence link | Blocker notes                                                                                       | Target date | Last updated |
| ------- | ---------- | --------------------------------------------------------------------------- | ---------------- | ------------------- | :--------: | ------------- | --------------------------------------------------------------------------------------------------- | ----------- | ------------ |
| P-01    | Process    | Stage 1 scoring report attached to this packet                              | Risk lead        | Axiom Risk Lead     | ASSIGNED   |               | Report is complete. Owner must formally attach the artifact to the packet.                          |             | 2026-05-01   |
| P-02    | Process    | Stage 2 diligence packet completed and reviewed                             | Risk lead        | Axiom Risk Lead     | ASSIGNED   |               | Requires all C, L, O, R, REG items to be CLOSED before this item can close.                         |             | 2026-05-01   |
| P-03    | Process    | Re-scoring run executed against the validated engine                        | Risk lead        | Axiom Risk Lead     | ASSIGNED   |               | Blocked on all seven re-scoring trigger conditions in packet Section 9. Engine: pages/api/operator/commodity-risk-score.ts (operator-gated). |             | 2026-05-01   |
| P-04    | Process    | Re-scoring result (JSON artifact) attached                                  | Risk lead        | Axiom Risk Lead     | ASSIGNED   |               | Blocked on P-03.                                                                                    |             | 2026-05-01   |
| P-05    | Process    | Stage 3 governance vote scheduling decision recorded                        | Risk lead        | Axiom Risk Lead     | ASSIGNED   |               | Blocked on P-04. May only be scheduled if re-scoring shows no dimension scoring 3 or above.         |             | 2026-05-01   |

Section subtotal: 5 items — 0 IN PROGRESS, 5 ASSIGNED

---

## Section 7 — Owner Assignments

Source: Section 8 of the diligence packet.
Every row must have a named individual (not a role label) before the corresponding workstream may advance to IN PROGRESS.

| Item ID | Workstream            | Role responsible             | Reviewer                   | Assigned owner               | Status     | Assigned date | Last updated | Notes                                                                   |
| ------- | --------------------- | ---------------------------- | -------------------------- | ---------------------------- | :--------: | ------------- | ------------ | ----------------------------------------------------------------------- |
| OW-01   | Custody diligence     | Treasury operations lead     | Compliance lead            | Axiom Treasury Lead          | ASSIGNED   |               | 2026-05-01   | Replace with named individual to unlock C-01.                           |
| OW-02   | Liquidity bootstrap   | Liquidity operations lead    | Treasury operations lead   | Axiom Liquidity Lead         | ASSIGNED   |               | 2026-05-01   | Replace with named individual to unlock L-01.                           |
| OW-03   | Oracle verification   | Protocol engineering lead    | Risk lead                  | Axiom Protocol Engineer      | ASSIGNED   |               | 2026-05-01   | Replace with named individual to unlock O-01.                           |
| OW-04   | Legal review          | General counsel coordinator  | Compliance lead            | Axiom GC Coordinator         | ASSIGNED   |               | 2026-05-01   | Replace with named individual to unlock REG-01.                         |
| OW-05   | Reserve standards     | Compliance lead              | Treasury operations lead   | Axiom Compliance Lead        | ASSIGNED   |               | 2026-05-01   | Replace with named individual to unlock R-01.                           |
| OW-06   | Disclosure language   | Communications lead          | General counsel coord.     | Axiom Communications Lead    | ASSIGNED   |               | 2026-05-01   | Replace with named individual to unlock REG-03.                         |
| OW-07   | Re-scoring run        | Risk lead                    | Compliance lead            | Axiom Risk Lead              | ASSIGNED   |               | 2026-05-01   | Replace with named individual to unlock P-03.                           |
| OW-08   | Packet sign-off       | Operator (named)             | Governance steward         | Axiom Governance Steward     | ASSIGNED   |               | 2026-05-01   | Final sign-off gate. Must be a named individual confirmed by the board. |

Section subtotal: 8 items — 8 ASSIGNED

---

## Section 8 — Execution Ownership Summary

Total items assigned to each owner role. Last updated: 2026-05-01.

| Assigned owner            | Items total | Closed | In progress | Assigned | Primary workstream       |
| ------------------------- | :---------: | :----: | :---------: | :------: | ------------------------ |
| Axiom Treasury Lead       |      8      |   1    |      1      |    6     | Custody diligence        |
| Axiom Risk Lead           |      6      |   0    |      0      |    6     | Re-scoring and closeout  |
| Axiom Liquidity Lead      |      6      |   0    |      1      |    5     | Liquidity bootstrap      |
| Axiom Protocol Engineer   |      5      |   0    |      1      |    4     | Oracle verification      |
| Axiom Compliance Lead     |      4      |   0    |      0      |    4     | Reserve standards check  |
| Axiom GC Coordinator      |      3      |   0    |      1      |    2     | Legal review             |
| Axiom Communications Lead |      3      |   0    |      0      |    3     | Disclosure language      |
| Axiom Governance Steward  |      1      |   0    |      0      |    1     | Packet sign-off          |
| **TOTAL**                 |    **36**   | **1**  |    **4**    |  **31**  |                          |

### Reviewer assignments

| Workstream            | Owner                     | Reviewer                  |
| --------------------- | ------------------------- | ------------------------- |
| Custody diligence     | Axiom Treasury Lead       | Axiom Compliance Lead     |
| Liquidity bootstrap   | Axiom Liquidity Lead      | Axiom Treasury Lead       |
| Oracle verification   | Axiom Protocol Engineer   | Axiom Risk Lead           |
| Reserve standards     | Axiom Compliance Lead     | Axiom Treasury Lead       |
| Legal review          | Axiom GC Coordinator      | Axiom Compliance Lead     |
| Disclosure language   | Axiom Communications Lead | Axiom GC Coordinator      |
| Re-scoring run        | Axiom Risk Lead           | Axiom Compliance Lead     |
| Packet sign-off       | Axiom Governance Steward  | Board / Operator (named)  |

---

## Section 9 — Critical Path

The two dimensions that scored 3 in Stage 1 (Custody and Liquidity) form the critical path.

### Priority 1 — Critical Path: Custody (C-01 to C-07)

| Item ID | Requirement (short form)                      | Depends on    | Status        | Priority   |
| ------- | --------------------------------------------- | ------------- | :-----------: | :--------: |
| C-01    | Custody RFP final                             | —             | **CLOSED**    | PRIORITY 1 |
| C-02    | RFP responses tabulated                       | C-01          | IN PROGRESS   | PRIORITY 1 |
| C-03    | Custodian selected (Path A / B / fallback)    | C-02          | ASSIGNED      | PRIORITY 1 |
| C-04    | Term sheet drafted and attached               | C-03          | ASSIGNED      | PRIORITY 1 |
| C-05    | Vault, segregation, insurance documented      | C-03          | ASSIGNED      | PRIORITY 1 |
| C-06    | Attestation cadence agreed in term sheet      | C-04          | ASSIGNED      | PRIORITY 1 |
| C-07    | Chain-of-custody model from refining to vault | C-03          | ASSIGNED      | PRIORITY 1 |

### Priority 1 — Critical Path: Liquidity (L-01 to L-05)

| Item ID | Requirement (short form)                      | Depends on    | Status        | Priority   |
| ------- | --------------------------------------------- | ------------- | :-----------: | :--------: |
| L-01    | AMM bootstrap design document                 | —             | IN PROGRESS   | PRIORITY 1 |
| L-02    | Market-maker arrangement documented           | L-01          | ASSIGNED      | PRIORITY 1 |
| L-03    | Redemption SLA draft                          | C-04, L-01    | ASSIGNED      | PRIORITY 1 |
| L-04    | Fallback redemption path documented           | L-03          | ASSIGNED      | PRIORITY 1 |
| L-05    | Projected depth and turnover with assumptions | L-01, L-02    | ASSIGNED      | PRIORITY 1 |

### Priority 2 — Parallel tracks

| Workstream  | Items         | Status of lead item         | Assigned owner                  |
| ----------- | ------------- | --------------------------- | ------------------------------- |
| Oracle      | O-01–O-04     | O-01 IN PROGRESS            | Axiom Protocol Engineer         |
| Reserve     | R-01–R-03     | All ASSIGNED (R-01 on C-03) | Axiom Compliance Lead           |
| Regulatory  | REG-01–REG-04 | REG-01 IN PROGRESS          | Axiom GC Coord. / Comms Lead    |

### Priority 3 — Process closeout

| Item ID | Status     | Unblocked when                    |
| ------- | :--------: | --------------------------------- |
| P-01    | ASSIGNED   | Immediately — artifact exists     |
| P-02    | ASSIGNED   | All C, L, O, R, REG items CLOSED  |
| P-03    | ASSIGNED   | All 7 re-scoring triggers met     |
| P-04    | ASSIGNED   | P-03 CLOSED                       |
| P-05    | ASSIGNED   | P-04 CLOSED; no dimension ≥ 3    |

---

## Section 10 — Active Workstreams

All items currently IN PROGRESS as of 2026-05-01.

| Item ID | Workstream  | Requirement (short form)                         | Owner                     | Dependency risk                                                                                                          |
| ------- | ----------- | ------------------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| C-02    | Custody     | RFP responses tabulated (outreach started; evaluation matrix v1.0 prepared; 16 open questions registered; outreach templates ready) | Axiom Treasury Lead       | **HIGH** — tabulation feeds C-03 (custodian selection), the primary bottleneck for the entire tracker. C-03 precondition gate now formalized (PRE-01–PRE-08; MC-01–MC-07).                  |
| L-01    | Liquidity   | AMM bootstrap design document                    | Axiom Liquidity Lead      | **HIGH** — L-02, L-05 depend on L-01. L-03 additionally gated on C-04 (blocked on C-03). Liquidity path will stall at L-03 until custody resolves. |
| O-01    | Oracle      | XAG/USD Arbitrum One aggregator verified         | Axiom Protocol Engineer   | **MEDIUM** — if feed is absent, oracle score must be raised from 2, increasing composite and widening remediation scope. |
| REG-01  | Regulatory  | Legal opinion engagement letter signed           | Axiom GC Coordinator      | **HIGH** — governance vote cannot be scheduled until legal opinion is delivered. No upstream blocker — must advance now. |

Previously IN PROGRESS:
- C-01 → **CLOSED** 2026-05-01 (evidence: documents/commodities/AXAG_CUSTODY_RFP.md)

Total currently IN PROGRESS: 4 items across 4 workstreams.

---

## Section 11 — Current Bottleneck

The current primary bottleneck for Stage 2 is **C-03: Custodian Selection**.

### C-03 — Custodian Selection

| Field               | Detail                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| Item ID             | C-03                                                                                                           |
| Status              | ASSIGNED — blocked on C-02                                                                                     |
| Owner               | Axiom Treasury Lead                                                                                            |
| Why it is primary   | C-03 unblocks C-04, C-05, C-07 simultaneously, which in turn unlock C-06, L-03, R-01, and R-02. Until C-03 closes, the majority of the tracker cannot advance. |
| Core difficulty     | No Path A (PAXG-equivalent silver issuer) exists today. Path B (regulated custodian + quarterly PoR) is the confirmed viable path per AXAG_CUSTODY_SHORTLIST.md, but requires RFP responses to identify a specific counterparty. |
| Items blocked on C-03 | C-04, C-05, C-07, C-06 (via C-04), L-03 (via C-04), L-04 (via L-03), R-01, R-02 |
| Cascade count       | 8 downstream items gated on C-03                                                                               |
| Current mitigation  | C-01 CLOSED. C-02 IN PROGRESS with outreach to six candidates. Shortlist pre-populated in AXAG_CUSTODY_SHORTLIST.md. |
| Risk if delayed     | Re-scoring cannot proceed; AXAG remains CONDITIONAL; governance vote cannot be scheduled.                       |

### Secondary bottlenecks

| Item    | Risk                                                                                                                               |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| O-01    | If Chainlink XAG/USD absent on Arbitrum One, oracle score rises from 2 and composite widens, expanding remediation scope.          |
| REG-01  | Engagement delay compounds into governance vote scheduling. Legal opinion typically requires 6–12 weeks after engagement letter.    |

---

## Section 12 — Custody Path Hypothesis

Source: documents/commodities/AXAG_CUSTODY_SHORTLIST.md
Prepared: 2026-05-01
Status: PRELIMINARY — subject to revision upon receipt of RFP responses

### Path assessment

| Path | Description                                                    | Feasibility       | Basis                                                                                         |
| ---- | -------------------------------------------------------------- | :---------------: | --------------------------------------------------------------------------------------------- |
| A    | Qualified-custodian issues on-chain redeemable silver receipt  | **Aspirational**  | No PAXG-equivalent silver token exists. BitGo + physical sub-custodian is the only plausible route; requires new product development. Timeline uncertain. |
| B    | Regulated custodian + segregated allocated account + PoR       | **Confirmed viable** | Brink's, Loomis, and Malca-Amit all have confirmed LBMA silver storage capability. Monthly attestation via independent auditor is contractually achievable. Path B closes the Stage 1 Custody Risk remediation (score 3 → 2). |
| C    | Exchange-grade arrangement without regulated custodian         | **Fallback only** | Does not close the Stage 1 remediation. Not actively pursued.                                 |

### Recommended path

**Path B is the primary execution path for Stage 2.**

Rationale:
1. Path B is achievable without creating a new financial product or token, which is out of scope for Stage 2.
2. Brink's, Loomis, and Malca-Amit have confirmed LBMA Good Delivery silver storage at accredited vault locations. All three are on outreach as of 2026-05-01.
3. Monthly independent attestation is a contractual and operational norm in the physical precious metals industry. There is no structural barrier to securing a monthly signed attestation cadence from a Big 4 or equivalent auditor.
4. Path B would move Custody Risk from score 3 to score 2, bringing AXAG's composite from 11 to 10 (APPROVED band). Combined with no change to Oracle (2), Reserve (1), and Regulatory (2), a Path B custody solution closes the CONDITIONAL band.

### Path A monitoring

Path A remains the superior outcome (score 1, matching AXAU/PAXG exactly). Axiom Protocol will monitor two developments that could make Path A viable:
- A Paxos-issued or equivalent regulated silver receipt token (analogous to PAXG)
- A BitGo Trust + Brink's/Malca-Amit dual-layer structure where BitGo issues the trust receipt against physically allocated silver

If either becomes available during Stage 2, the custody path hypothesis will be updated and C-03 may be reconsidered for a Path A selection.

### Impact on re-scoring

If Path B is selected at C-03:
- Custody Risk: 3 → **2**
- New composite: 2 + 2 + 3 + 1 + 2 = **10** → **APPROVED band**
- Re-scoring band outcome: "May proceed to Stage 3"

If Path A is selected at C-03:
- Custody Risk: 3 → **1**
- New composite: 2 + 1 + 3 + 1 + 2 = **9** → **APPROVED band**
- Re-scoring band outcome: "May proceed to Stage 3"

In either case, Liquidity Risk must also be remediated (score 3 → ≤ 2) for the composite to move correctly. Liquidity remediation is driven by L-01 through L-05 on a parallel track.

---

## Section 13 — Stage 2 Exit Criteria

Stage 2 is complete only when **every one** of the following conditions is met. Requires dual sign-off (operator and governance steward, OW-08).

### Evidence checklist closure

- [x] ~~All 7 Custody items (C-01 through C-07) are CLOSED with evidence attached~~ — C-01 CLOSED. C-02 through C-07 remain open.
- [ ] All 5 Liquidity items (L-01 through L-05) are CLOSED with evidence attached
- [ ] All 4 Oracle items (O-01 through O-04) are CLOSED with evidence attached
- [ ] All 3 Reserve items (R-01 through R-03) are CLOSED with evidence attached
- [ ] All 4 Regulatory items (REG-01 through REG-04) are CLOSED with evidence attached
- [ ] All 5 Process items (P-01 through P-05) are CLOSED with evidence attached

### Owner assignment closure

- [ ] All 8 owner assignment rows (OW-01 through OW-08) are CLOSED with named individuals recorded

### Re-scoring closure

- [ ] Re-scoring run executed by risk lead (P-03 CLOSED)
- [ ] Re-scoring JSON artifact attached (P-04 CLOSED)
- [ ] Re-scoring result shows no dimension scoring 3 or above
- [ ] Re-scoring result reviewed and accepted by compliance lead

### Governance scheduling closure

- [ ] Governance vote scheduling decision recorded (P-05 CLOSED)
- [ ] Scheduling memo published to the governance forum

### Dual sign-off

- [ ] Operator (named individual, OW-08) signed off on Stage 2 exit
- [ ] Governance steward signed off on Stage 2 exit
- [ ] Date of dual sign-off recorded here: _______________

---

## Section 14 — Tracker Summary

| Workstream        | Total | OPEN | ASSIGNED | IN PROGRESS | BLOCKED | CLOSED |
| ----------------- | :---: | :--: | :------: | :---------: | :-----: | :----: |
| Custody           |   7   |  0   |    5     |      1      |    0    |   1    |
| Liquidity         |   5   |  0   |    4     |      1      |    0    |   0    |
| Oracle            |   4   |  0   |    3     |      1      |    0    |   0    |
| Reserve           |   3   |  0   |    3     |      0      |    0    |   0    |
| Regulatory        |   4   |  0   |    3     |      1      |    0    |   0    |
| Process           |   5   |  0   |    5     |      0      |    0    |   0    |
| Owner assignments |   8   |  0   |    8     |      0      |    0    |   0    |
| **TOTAL**         | **36**| **0**| **30**   |    **4**    |  **0**  | **1**  |

Last updated: 2026-05-01.

---

## Section 15 — Explicit Statement

**AXAG IS NOT LIVE AND IS NOT APPROVED FOR DEPLOYMENT.**

Advancing items to IN PROGRESS or CLOSED in this tracker means diligence work has begun or a diligence artifact has been produced. It does not authorize, schedule, or initiate any deployment, contract publication, token mint, swap pool creation, or banking integration. Closing every item in this tracker does not constitute approval of any AXAG instrument. Final deployment authority rests with a completed governance vote and a passing Stage 4 launch readiness gate, in that order, and not with this document.

No contract has been deployed. No token has been minted. No swap pool has been opened. No banking rail has been enabled. No public claim of AXAG availability is made or implied.

---

End of tracker.
