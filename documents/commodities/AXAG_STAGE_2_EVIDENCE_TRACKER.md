# AXAG — Stage 2 Evidence Tracker

Document class: Commodity Candidate Evidence Tracker
Framework: Commodity Expansion Framework v1.0.0
Candidate: Axiom Silver (AXAG)
Stage: 2 — Technical Diligence
Tracker status: EXECUTION ACTIVE — 5 IN PROGRESS, 31 ASSIGNED, 0 closed
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

| Item ID | Workstream | Requirement                                                                   | Owner role                 | Assigned owner       | Status        | Evidence link | Blocker notes                                                                                                                                                     | Target date | Last updated |
| ------- | ---------- | ----------------------------------------------------------------------------- | -------------------------- | -------------------- | :-----------: | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------ |
| C-01    | Custody    | Custody RFP final                                                             | Treasury operations lead   | Axiom Treasury Lead  | IN PROGRESS   |               | No custody partner identified. RFP must be drafted and issued before any response can be collected.                                                               |             | 2026-05-01   |
| C-02    | Custody    | Custody RFP responses tabulated against framework Section 6 criteria          | Treasury operations lead   | Axiom Treasury Lead  | IN PROGRESS   |               | Blocked on C-01 closing. Running parallel to C-01 to pre-build the tabulation template and criteria scorecard.                                                    |             | 2026-05-01   |
| C-03    | Custody    | Selected custodian identified (Path A, B, or documented fallback)             | Treasury operations lead   | Axiom Treasury Lead  | ASSIGNED      |               | Blocked on C-02. Path A (PAXG-equivalent silver issuer) currently has no known candidate; Path B (regulated custodian + quarterly PoR) is the expected path. **PRIMARY BOTTLENECK — see Section 10.** |             | 2026-05-01   |
| C-04    | Custody    | Term sheet drafted and attached                                               | Treasury operations lead   | Axiom Treasury Lead  | ASSIGNED      |               | Blocked on C-03.                                                                                                                                                  |             | 2026-05-01   |
| C-05    | Custody    | Vault location, segregation model, and insurance position documented          | Treasury operations lead   | Axiom Treasury Lead  | ASSIGNED      |               | Blocked on C-03.                                                                                                                                                  |             | 2026-05-01   |
| C-06    | Custody    | Attestation cadence agreed (monthly preferred, quarterly minimum)             | Treasury operations lead   | Axiom Treasury Lead  | ASSIGNED      |               | Blocked on C-04. Cadence must appear in the term sheet.                                                                                                           |             | 2026-05-01   |
| C-07    | Custody    | Chain-of-custody model documented from refining to vault                      | Treasury operations lead   | Axiom Treasury Lead  | ASSIGNED      |               | Blocked on C-03. Must cover assay, transport, storage, and audit trail.                                                                                           |             | 2026-05-01   |

Section subtotal: 7 items — 2 IN PROGRESS (C-01, C-02), 5 ASSIGNED

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
Every row must have a named individual (not a role label) before the corresponding workstream may advance to IN PROGRESS. The governance steward reviews and confirms each assignment.

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

| Assigned owner            | Items total | In progress | Assigned | Primary workstream       |
| ------------------------- | :---------: | :---------: | :------: | ------------------------ |
| Axiom Treasury Lead       |      8      |      2      |    6     | Custody diligence        |
| Axiom Risk Lead           |      6      |      0      |    6     | Re-scoring and closeout  |
| Axiom Liquidity Lead      |      6      |      1      |    5     | Liquidity bootstrap      |
| Axiom Protocol Engineer   |      5      |      1      |    4     | Oracle verification      |
| Axiom Compliance Lead     |      4      |      0      |    4     | Reserve standards check  |
| Axiom GC Coordinator      |      3      |      1      |    2     | Legal review             |
| Axiom Communications Lead |      3      |      0      |    3     | Disclosure language      |
| Axiom Governance Steward  |      1      |      0      |    1     | Packet sign-off          |
| **TOTAL**                 |    **36**   |    **5**    |  **31**  |                          |

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

The two dimensions that scored 3 in Stage 1 (Custody and Liquidity) form the critical path. No re-scoring run may be executed until every item in both groups is CLOSED.

### Priority 1 — Critical Path: Custody (C-01 to C-07)

| Item ID | Requirement (short form)                      | Depends on    | Status        | Priority   |
| ------- | --------------------------------------------- | ------------- | :-----------: | :--------: |
| C-01    | Custody RFP final                             | —             | IN PROGRESS   | PRIORITY 1 |
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

| Workstream  | Items      | Status of lead item     | Assigned owner            |
| ----------- | ---------- | ----------------------- | ------------------------- |
| Oracle      | O-01–O-04  | O-01 IN PROGRESS        | Axiom Protocol Engineer   |
| Reserve     | R-01–R-03  | All ASSIGNED (R-01 on C-03) | Axiom Compliance Lead |
| Regulatory  | REG-01–REG-04 | REG-01 IN PROGRESS   | Axiom GC Coord. / Comms  |

### Priority 3 — Process closeout

| Item ID | Status     | Unblocked when                     |
| ------- | :--------: | ---------------------------------- |
| P-01    | ASSIGNED   | Immediately — artifact exists      |
| P-02    | ASSIGNED   | All C, L, O, R, REG items CLOSED   |
| P-03    | ASSIGNED   | All 7 re-scoring triggers met      |
| P-04    | ASSIGNED   | P-03 CLOSED                        |
| P-05    | ASSIGNED   | P-04 CLOSED; no dimension ≥ 3     |

---

## Section 10 — Active Workstreams

All items currently IN PROGRESS as of 2026-05-01.

| Item ID | Workstream  | Requirement (short form)                        | Owner                     | Dependency risk                                                                                                         |
| ------- | ----------- | ----------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| C-01    | Custody     | Custody RFP final                               | Axiom Treasury Lead       | **HIGH** — The entire custody critical path (C-03 through C-07) is gated on the RFP output. Delay here cascades to L-03, R-01, R-02, and ultimately P-03. |
| C-02    | Custody     | RFP responses tabulated (template pre-build)    | Axiom Treasury Lead       | **MEDIUM** — Runs parallel to C-01; tabulation template can be completed before responses arrive, reducing C-02 cycle time after C-01 closes. |
| L-01    | Liquidity   | AMM bootstrap design document                  | Axiom Liquidity Lead      | **HIGH** — L-02, L-05 depend on L-01. L-03 additionally depends on C-04, which is itself blocked on C-03. Liquidity critical path will stall at L-03 until custody resolves. |
| O-01    | Oracle      | XAG/USD Arbitrum One aggregator verified        | Axiom Protocol Engineer   | **MEDIUM** — If the Chainlink feed is absent on Arbitrum One, oracle score must be downgraded from 2 to 3+, which would raise the composite and potentially change the CONDITIONAL band outcome. Resolve quickly. |
| REG-01  | Regulatory  | Legal opinion engagement letter signed          | Axiom GC Coordinator      | **HIGH** — No governance vote may be scheduled until the legal opinion is delivered. Engagement letter is the first gating step. Delay compounds through REG-02, REG-03, and REG-04. |

Total IN PROGRESS: 5 items across 4 workstreams (Custody, Liquidity, Oracle, Regulatory).

Items not yet activated (ASSIGNED, not IN PROGRESS):
- **C-03 through C-07** — blocked on C-02 output
- **L-02 through L-05** — blocked on L-01 output and C-04
- **O-02 through O-04** — blocked on O-01 output
- **R-01 through R-03** — R-01 and R-02 blocked on C-03; R-03 may begin independently
- **REG-02 through REG-04** — blocked on REG-01
- **P-01 through P-05** — all blocked on upstream workstreams

---

## Section 11 — Current Bottleneck

The current primary bottleneck for Stage 2 is **C-03: Custodian Selection**.

### C-03 — Custodian Selection

| Field               | Detail                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| Item ID             | C-03                                                                                                    |
| Workstream          | Custody                                                                                                 |
| Owner               | Axiom Treasury Lead                                                                                     |
| Current status      | ASSIGNED — blocked on C-02 (RFP responses)                                                              |
| Why it is primary   | C-03 is the single node that unblocks C-04, C-05, and C-07 simultaneously, which in turn unblock C-06, L-03, R-01, and R-02. Until C-03 closes, the majority of the tracker remains frozen. |
| Core difficulty     | No PAXG-equivalent regulated silver issuer exists today. Path A (on-chain receipt token) requires identifying or creating a new custodial relationship with a qualified custodian willing to issue a directly redeemable silver token. Path B (regulated custodian + quarterly PoR without on-chain receipt) is the expected path but still requires sourcing a willing counterparty. |
| Items blocked by C-03 | C-04, C-05, C-07, C-06 (via C-04), L-03 (via C-04), L-04 (via L-03), R-01, R-02                      |
| Cascade count       | 8 downstream items gated directly or indirectly on C-03                                                 |
| Mitigation          | C-01 and C-02 are IN PROGRESS to deliver the RFP and response tabulation that feeds C-03. The sooner C-01 issues and C-02 receives responses, the sooner C-03 can close. |
| Risk if delayed     | If C-03 is not resolved, re-scoring cannot proceed, AXAG remains in CONDITIONAL band, and governance vote cannot be scheduled. |

### Secondary bottleneck awareness

| Item    | Risk if delayed                                                                                           |
| ------- | --------------------------------------------------------------------------------------------------------- |
| O-01    | If Chainlink XAG/USD feed is absent on Arbitrum One, oracle score rises from 2 to 3+, raising composite and potentially widening the remediation requirement before Stage 3. |
| REG-01  | Legal opinion delivery is on the governance vote critical path. Engagement letter must be signed now to allow adequate time for counsel's analysis before Stage 3 scheduling. |

---

## Section 12 — Stage 2 Exit Criteria

Stage 2 is complete only when **every one** of the following conditions is met. This section requires dual sign-off (operator and governance steward, OW-08).

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

When all boxes above are checked and dual sign-off is recorded, Stage 2 is formally closed and AXAG advances to Stage 3 (Governance Vote) per the Commodity Expansion Framework v1.0.0, Section 7.

---

## Section 13 — Tracker Summary

| Workstream        | Total | OPEN | ASSIGNED | IN PROGRESS | BLOCKED | CLOSED |
| ----------------- | :---: | :--: | :------: | :---------: | :-----: | :----: |
| Custody           |   7   |  0   |    5     |      2      |    0    |   0    |
| Liquidity         |   5   |  0   |    4     |      1      |    0    |   0    |
| Oracle            |   4   |  0   |    3     |      1      |    0    |   0    |
| Reserve           |   3   |  0   |    3     |      0      |    0    |   0    |
| Regulatory        |   4   |  0   |    3     |      1      |    0    |   0    |
| Process           |   5   |  0   |    5     |      0      |    0    |   0    |
| Owner assignments |   8   |  0   |    8     |      0      |    0    |   0    |
| **TOTAL**         | **36**| **0**| **31**   |    **5**    |  **0**  | **0**  |

Last updated: 2026-05-01. Update this table each time an item changes status.

---

## Section 14 — Explicit Statement

**AXAG IS NOT LIVE AND IS NOT APPROVED FOR DEPLOYMENT.**

Moving items to IN PROGRESS in this tracker means diligence work has begun on documentation and evidence collection only. It does not authorize, schedule, or initiate any deployment, contract publication, token mint, swap pool creation, or banking integration. Closing every item in this tracker does not constitute approval of any AXAG instrument. Final deployment authority rests with a completed governance vote and a passing Stage 4 launch readiness gate, in that order, and not with this document.

No contract has been deployed. No token has been minted. No swap pool has been opened. No banking rail has been enabled. No public claim of AXAG availability is made or implied.

---

End of tracker.
