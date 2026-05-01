# AXAG Silver Reserve Instrument — Stage 2 Options Package

Document class: Strategic Options Package
Framework: Commodity Expansion Framework v1.0.0
Candidate: Axiom Silver (AXAG)
Stage: 2 — Technical Diligence
Version: 1.0
Prepared: 2026-05-01
Status: ACTIVE — for internal evaluation only. No custodian selected. No deployment authorized.

---

## AXAG IS NOT LIVE AND IS NOT APPROVED FOR DEPLOYMENT UNTIL GOVERNANCE VOTE AND LAUNCH GATE SIGN-OFF.

This document is a planning and evaluation tool. It does not authorize, initiate, or imply the deployment of any AXAG instrument, automated control layer, token, liquidity pool, or banking integration. No custodian has been selected. No term sheet has been executed. Stage 3 governance vote and Stage 4 launch readiness gate remain required before any AXAG instrument may go live.

---

## Table of Contents

A. [Executive Summary](#a-executive-summary)
B. [Option 1 — Path B Immediate Execution](#b-option-1--path-b-immediate-execution)
C. [Option 2 — Path A Strategic Upgrade](#c-option-2--path-a-strategic-upgrade)
D. [Option 3 — Hybrid Path](#d-option-3--hybrid-path)
E. [Redemption Model Design](#e-redemption-model-design)
F. [RFP Tracking and Scoring Update System](#f-rfp-tracking-and-scoring-update-system)
G. [Decision Tree](#g-decision-tree)
H. [Recommended Strategy](#h-recommended-strategy)

---

## A. Executive Summary

### A.1 Current AXAG status

AXAG (Axiom Silver) is a candidate reserve instrument in Stage 2 Technical Diligence under the Commodity Expansion Framework v1.0.0. AXAG is not live, not minted, not listed, and not redeemable. Stage 2 is an evidence-collection and evaluation phase. The current tracker status is:

- 1 item CLOSED (C-01 — Custody RFP issued)
- 4 items IN PROGRESS (C-02 custody evaluation, L-01 liquidity design, O-01 oracle verification, REG-01 legal engagement)
- 30 items ASSIGNED — awaiting upstream resolution
- 1 item is the primary bottleneck: C-03 (custodian selection), which unblocks 8 downstream items

### A.2 Stage 1 composite score recap

AXAG was scored at the conclusion of Stage 1 using the validated risk scoring engine (lib/commodity/riskScoring.ts, 48/48 tests passing). The composite score is **11 — CONDITIONAL band**.

| Dimension         | Score | Rubric band description (CEF v1.0.0 Section 10)                        |
| ----------------- | :---: | ----------------------------------------------------------------------- |
| Oracle Risk       |   2   | Production Chainlink feed; 12–24 months history or 24–48h heartbeat   |
| Custody Risk      |   3   | Exchange-grade arrangement; no regulated custodian confirmed            |
| Liquidity Risk    |   3   | Moderate spot market or T+1 redemption; no functioning AMM pool        |
| Reserve Risk      |   1   | Physical commodity; non-perishable; LBMA standard; centuries of value  |
| Regulatory Risk   |   2   | Strong regulatory analogy; legal review in progress                    |
| **Composite**     | **11**| **CONDITIONAL — May proceed to Stage 3 with documented remediation**   |

AXAU reference (score 7, APPROVED): Oracle 1, Custody 1, Liquidity 2, Reserve 1, Regulatory 2.

### A.3 Why custody and liquidity are the gating dimensions

The two dimensions that scored 3 are the exclusive blockers for Stage 3 advancement:

**Custody (score 3):** Assigned because no regulated custodian with a segregated allocated silver account has been confirmed. The CEF rubric requires a confirmed Path B or better arrangement (score ≤ 2) before re-scoring. Score 3 reflects the current absence of any custody contract, term sheet, or counterparty confirmation.

**Liquidity (score 3):** Assigned because AXAG has no functioning AMM pool on Arbitrum One, no documented on-chain redemption path, and no confirmed redemption SLA. CEF Section 10.5 requires either a liquid spot market with on-chain redemption (score 2) or better. Physical silver's global spot market exceeds $100M daily volume, but without an AXAG-specific redemption model and on-chain path, the instrument defaults to score 3.

**Re-scoring target:** Both dimensions must reach score ≤ 2. If both succeed at score 2, the new composite is 2+2+2+1+2 = **9 — APPROVED band**. If custody reaches score 1 (Path A), the composite would be 2+1+2+1+2 = **8 — APPROVED band**.

### A.4 Re-scoring bands

| Custody outcome | Liquidity outcome | New composite | Band      |
| --------------- | ----------------- | :-----------: | --------- |
| Path A (→ 1)    | Remediated (→ 2)  |       8       | APPROVED  |
| Path B (→ 2)    | Remediated (→ 2)  |       9       | APPROVED  |
| Path B (→ 2)    | Not remediated (→3)|      10       | APPROVED  |
| No change (→ 3) | Remediated (→ 2)  |      10       | APPROVED  |
| No change (→ 3) | Not remediated (→3)|      11       | CONDITIONAL |

Note: Any single-dimension remediation to score 2 (or better) moves the composite from 11 to 10, which is the APPROVED band ceiling. Both dimensions do not need to reach score 1 for Stage 3 to become eligible. However, any dimension still scoring 3 requires a documented remediation plan attached to the Stage 3 governance vote — it does not block the vote itself.

### A.5 Explicit statement

**AXAG IS NOT LIVE AND IS NOT APPROVED FOR DEPLOYMENT UNTIL GOVERNANCE VOTE AND LAUNCH GATE SIGN-OFF.**

---

## B. Option 1 — Path B Immediate Execution

### B.1 Definition

Path B: Regulated physical custodian holding allocated, segregated LBMA Good Delivery silver bars, with independent periodic proof-of-reserves attestation, but without an on-chain silver receipt token. Axiom Protocol holds AXAG against silver in the vault; redemption returns physical silver bars (or in-vault title transfer to a designated LBMA member account), not an on-chain token.

**CEF Custody Risk score at Path B: 2**

### B.2 Best-fit candidates for Path B

Based on the AXAG_CUSTODY_EVALUATION_MATRIX.md weighted scoring (pre-response, public information basis):

| Candidate   | Pre-response score | Physical silver | LBMA vault | PoR readiness | Feasibility |
| ----------- | :----------------: | :-------------: | :--------: | :-----------: | :---------: |
| Brink's     | 3.25               | 4 / Exceeds     | 4          | 3             | HIGH        |
| Malca-Amit  | 2.90               | 4 / Exceeds     | 4          | 2             | HIGH        |
| Loomis      | 2.95               | 4 / Exceeds     | 4          | 2             | HIGH        |

All three are Path B capable and have received RFP outreach. Path B execution requires selecting one as primary custodian (C-03) and negotiating a term sheet (C-04).

### B.3 Pros

| Pro | Detail |
| --- | ------ |
| Fastest to execution | No new product development required; these are existing institutional services |
| Proven operational model | Brink's, Loomis, and Malca-Amit have institutional silver clients today |
| Closes the CEF custody remediation | Path B moves Custody Risk 3→2; composite 11→9 or 10 (APPROVED) |
| LBMA standard assurance | All three operate LBMA-accredited vaults; LBMA Good Delivery silver is standard |
| Independent attestation achievable | Monthly attestation by an independent auditor is a contractual arrangement; no new technology required |
| Insolvency-remote structure | Allocated storage provides off-balance-sheet asset treatment in each jurisdiction |
| Insurance available | All three carry institutional precious metals insurance; Malca-Amit holds Lloyd's coverage |

### B.4 Cons

| Con | Detail |
| --- | ------ |
| No on-chain receipt token | Custody Risk stays at 2, not 1; AXAU analogy is imperfect |
| Digital PoR is bespoke | No candidate has a ready-made cryptographically signed PoR API; bespoke arrangement required |
| Slower re-scoring upgrade | Moving from Path B to Path A in the future requires a new governance vote and custody restructuring |
| Redemption is physical-layer only | No direct digital redemption; all redemptions go through the custodian's physical settlement process |
| Private company risk (Malca-Amit) | Malca-Amit is privately held; balance sheet opacity is a diligence gap that does not affect Path B scoring but affects counterparty analysis |

### B.5 Time-to-readiness estimate

| Phase | Activity | Estimated duration |
| ----- | --------- | ------------------ |
| RFP response receipt | Candidates respond to AXAG_CUSTODY_RFP.md | 3–6 weeks post-outreach |
| Evaluation and scoring | Update evaluation matrix v2.0; confirm MC-01–MC-07 for at least one candidate | 1–2 weeks |
| C-03 custodian selection | Treasury Lead selects primary + alternate; governance review | 1–2 weeks |
| C-04 term sheet negotiation | Draft; negotiate; execute LOI or term sheet | 4–8 weeks |
| C-05, C-07 documentation | Vault, segregation, insurance, chain-of-custody documented | 2–4 weeks |
| C-06 attestation agreement | Appoint independent auditor; agree cadence; first attestation | 6–12 weeks from term sheet |
| **Path B total (optimistic)** | | **~4–5 months from RFP response** |
| **Path B total (conservative)** | | **~6–8 months from RFP response** |

### B.6 Required evidence for C-03 advancement

All eight preconditions (PRE-01 through PRE-08) in AXAG_CUSTODY_EVALUATION_MATRIX.md Section 9 must be met, plus:
- Formal RFP response from the selected candidate addressing all 7 Minimum Custody Standards (MC-01–MC-07)
- Treasury Lead recommendation memo identifying primary and alternate candidates
- Compliance Lead sign-off on segregation model and regulatory posture
- Governance steward notification that C-03 selection is being prepared

### B.7 C-03 selection criteria (Path B)

A Path B candidate must demonstrate:
1. Physical LBMA Good Delivery silver capability at an accredited vault location (MC-01)
2. Allocated, segregated account model (MC-02, MC-03)
3. Willingness to provide monthly independent attestation by a Big 4 or equivalent auditor (MC-04)
4. Regulated entity status in at least one major jurisdiction (MC-05)
5. No material enforcement action in the past 5 years (MC-06)
6. Documented fee schedule (MC-07)
7. Agreement to unannounced inspection rights with reasonable notice
8. Willingness to provide a machine-readable (or structured) monthly PoR report — or agreement to cooperate with an Axiom-appointed auditor who will produce one

### B.8 Expected scoring impact

| Dimension | Current | After Path B | Change |
| --------- | :-----: | :----------: | :----: |
| Oracle Risk | 2 | 2 | 0 |
| Custody Risk | 3 | **2** | **-1** |
| Liquidity Risk | 3 | 3 (unchanged by custody alone) | 0 |
| Reserve Risk | 1 | 1 | 0 |
| Regulatory Risk | 2 | 2 | 0 |
| **Composite** | **11** | **10** | **-1** |
| **Band** | CONDITIONAL | **APPROVED** | |

Note: Composite 10 is in the APPROVED band (5–10). Stage 3 becomes eligible once all Stage 2 evidence items are closed, even if Liquidity Risk remains at 3 with a documented remediation plan.

---

## C. Option 2 — Path A Strategic Upgrade

### C.1 Definition

Path A: A regulated qualified custodian (trust company or bank) issues or co-issues an on-chain silver receipt token, directly redeemable against physically allocated LBMA Good Delivery silver bars held by a physical vault sub-custodian. This mirrors the AXAU/PAXG structure exactly: Paxos Trust (issuer) + Brink's London (vault).

**CEF Custody Risk score at Path A: 1**

No existing silver issuer meets this description today. Path A requires new product development.

### C.2 Possible structures

**Structure P-A1: BitGo Trust + Brink's**

| Layer | Entity | Role |
| ----- | ------ | ---- |
| Issuer / trust | BitGo Trust Company (SD trust) | Issues on-chain silver receipt token; holds title in trust; provides PoR API |
| Physical vault | Brink's Company (London) | Holds physical LBMA silver bars; provides bar-serial inventory data to BitGo |

Analogy to AXAU: BitGo ≈ Paxos; Brink's silver ≈ Brink's gold (already established).
Key dependency: BitGo must be willing to develop a silver trust product (OQ-06).

**Structure P-A2: BitGo Trust + Malca-Amit**

| Layer | Entity | Role |
| ----- | ------ | ---- |
| Issuer / trust | BitGo Trust Company (SD trust) | Same as above |
| Physical vault | Malca-Amit (London or Geneva) | Holds physical LBMA silver; specialist silver operator; Lloyd's insurance |

Advantage over P-A1: Malca-Amit's silver specialization and Lloyd's insurance are stronger on the physical layer than Brink's for a pure-silver product. Relationship with Malca-Amit is new for both BitGo and Axiom Protocol.

**Structure P-A3: BitGo Trust + Loomis**

| Layer | Entity | Role |
| ----- | ------ | ---- |
| Issuer / trust | BitGo Trust Company (SD trust) | Same as above |
| Physical vault | Loomis International (London or Zurich) | LBMA-accredited; European regulatory framework |

Advantage over P-A1: Zurich jurisdiction provides Swiss asset-protection precedent. Lower digital integration footprint than Brink's but Loomis parent relationship with Via Mat enables multi-location coverage.

**Structure P-A4: Anchorage Digital Bank + Brink's or Malca-Amit** *(long-timeline only)*

| Layer | Entity | Role |
| ----- | ------ | ---- |
| Issuer / bank | Anchorage Digital Bank (OCC charter) | Issues silver receipt against trust held under federal banking law |
| Physical vault | Brink's or Malca-Amit | LBMA physical custody |

OCC charter provides the highest regulatory standing of any Path A structure — higher than BitGo Trust. However, OCC physical commodity custody guidance is evolving (OQ-08), making the timeline less predictable than BitGo.

### C.3 Pros

| Pro | Detail |
| --- | ------ |
| Matches AXAU/PAXG reference exactly | Custody Risk moves to score 1; composite reaches 8 or 9 (APPROVED) |
| On-chain redeemability | Token holders have a direct right to redeem for physical silver; equivalent to PAXG model |
| Strongest PoR capability | BitGo's existing PoR infrastructure + physical sub-custodian data = complete on-chain attestation chain |
| Trust or bank legal protection | BitGo trust or Anchorage bank charter provides the strongest legal insolvency-remote model |
| Future-proof architecture | Path A is the governance-optimal model; no upgrade path required after launch |
| Existing BitGo relationship | BitGo CaaS already deployed for AXAU; commercial relationship reduces onboarding friction |

### C.4 Cons

| Con | Detail |
| --- | ------ |
| Requires new product from BitGo (or Anchorage) | No silver trust product exists; development timeline is uncertain |
| Longer lead time | Estimated 12–24 months from product development commitment to a live silver receipt token |
| Sub-custodian integration required | BitGo + physical vault requires a three-party structure and an integration layer between BitGo's PoR tooling and the vault's inventory system |
| Commercial uncertainty | BitGo may require minimum AUM, upfront development fees, or decline to build the product |
| OCC uncertainty (Anchorage P-A4) | OCC physical commodity custody posture may limit or constrain a bank-issued silver receipt token |
| Path A only relevant if BitGo / Anchorage says yes | If OQ-06 and OQ-08 both resolve negatively, Path A is not available with any current candidate |

### C.5 Time-to-readiness estimate

| Phase | Activity | Estimated duration |
| ----- | --------- | ------------------ |
| BitGo product appetite confirmation | OQ-06 response; internal product decision | 4–8 weeks post-RFP response |
| Sub-custodian selection | Select physical vault partner (Brink's, Malca-Amit, or Loomis) | In parallel with above |
| Product development | BitGo develops silver trust product and issues receipt token | 6–18 months (highly uncertain) |
| Integration | BitGo PoR tooling integrated with physical vault inventory data | 2–4 months |
| Legal and regulatory | Silver trust product legal review; trust agreement; custody agreement | 3–6 months |
| First attestation | First signed attestation issued under new product | After above |
| **Path A total (optimistic)** | | **~12–15 months from BitGo YES** |
| **Path A total (conservative)** | | **~18–24 months from BitGo YES** |

### C.6 Required evidence

Beyond Path B evidence requirements, Path A additionally requires:
- BitGo written confirmation of willingness to develop a silver trust product (OQ-06 resolved YES)
- Sub-custodian agreement (physical vault term sheet, C-04)
- Trust product legal opinion on the silver receipt token structure
- Integration specification for PoR data flow between vault and BitGo
- OCC guidance confirmation (if Anchorage structure P-A4 is selected)

### C.7 Key blocker

**OQ-06 is the Path A gate.** If BitGo responds affirmatively to the silver trust product question, Path A becomes the target architecture. If BitGo declines, Path A is not available with any current candidate unless a new issuer-layer entity is identified (e.g., Paxos or a new trust company entrant).

The Path A decision gate is binary:
- BitGo YES → Pursue P-A1, P-A2, or P-A3 based on physical vault partner preference
- BitGo NO + Anchorage YES → Pursue P-A4 (longer timeline; OCC posture confirmation needed)
- Both NO → Path A not available; execute Path B immediately

### C.8 Expected scoring impact

| Dimension | Current | After Path A | Change |
| --------- | :-----: | :----------: | :----: |
| Oracle Risk | 2 | 2 | 0 |
| Custody Risk | 3 | **1** | **-2** |
| Liquidity Risk | 3 | Dependent on redemption model | variable |
| Reserve Risk | 1 | 1 | 0 |
| Regulatory Risk | 2 | 2 | 0 |
| **Composite** | **11** | **8 or 9** | **-2 or -3** |
| **Band** | CONDITIONAL | **APPROVED** | |

---

## D. Option 3 — Hybrid Path

### D.1 Definition

Execute Path B as the immediate launch architecture and simultaneously design a formal upgrade path to Path A. AXAG launches with a regulated physical custodian (Path B, Custody Risk → 2), then migrates to a trust-layer receipt model (Path A, Custody Risk → 1) when a qualified issuer is ready and governance approves the upgrade.

This is the model used in many institutional product launches: start with the viable path, architect for the optimal path.

### D.2 How the hybrid works

**Phase 1 — Launch with Path B (custody score 2):**
- Select Brink's, Malca-Amit, or Loomis as primary physical custodian
- Execute term sheet; secure monthly independent attestation agreement
- Pass all Stage 2 evidence items; run re-scoring (composite → 9 or 10, APPROVED)
- Complete Stage 3 governance vote and Stage 4 launch readiness gate
- AXAG launches with physical custody; no on-chain silver receipt token

**Phase 2 — Design Path A upgrade (concurrent with Phase 1):**
- Pursue OQ-06 with BitGo in parallel with Phase 1 custody execution
- If BitGo confirms YES, begin product development discussion
- Design the trust product structure, sub-custodian arrangement, and PoR integration
- Draft governance proposal for the custody upgrade

**Phase 3 — Upgrade to Path A (after launch):**
- Execute the upgrade under a governance-approved upgrade plan
- Migrate from physical-custody-only model to trust + on-chain receipt model
- Re-run launch readiness gate (mandatory; CEF Section 11.3)
- Custody Risk moves from 2 → 1; new composite moves from 9 → 8

### D.3 Transition risks

| Risk | Description | Mitigation |
| ---- | ----------- | ---------- |
| Custody continuity | During transition from Phase 1 custodian to Path A sub-custodian, silver bars must be physically transferred or title-transferred between entities | Overlap period: keep Phase 1 custodian active until Path A arrangement is fully live; use in-vault title transfer where custodians are connected |
| Token holder disruption | If AXAG token holders are using the Phase 1 redemption model, the Phase 3 upgrade changes the redemption mechanism | Governance must approve a transition plan with at minimum 30-day notice to token holders before the switch |
| Re-attestation gap | First Phase 3 attestation must be issued by the new Path A trust before Phase 1 attestation program ends | Overlap both attestation programs for at least one quarter |
| Legal complexity | Phase 1 custody agreement must include termination rights exercisable without penalty on governance vote | Include clause in Phase 1 term sheet (C-04): "Agreement terminates on 90-day notice at governance direction, without penalty" |
| BitGo product delay | Phase 2 development may take longer than Phase 1 execution | Phase 1 launch is not gated on Phase 2; AXAG launches on Path B regardless of BitGo timeline |
| Re-scoring required | Custody upgrade requires a full re-scoring run and re-run of the launch readiness gate | Build this into the Phase 3 governance proposal from the outset |

### D.4 Governance approvals required

| Approval | Stage | Requirement |
| -------- | ----- | ----------- |
| Path B custody selection | Stage 3 (Part 1) | Governance vote approving selected custodian, term sheet summary, and attestation arrangement |
| AXAG launch | Stage 4 | Launch readiness gate sign-off by operator + governance steward |
| Path A upgrade proposal | Post-launch | Separate governance vote; upgrade plan must document transition risks, token holder impact, and re-attestation schedule |
| Path A custody activation | Post-approval | Launch readiness gate re-run required; HB-04 (custody attestation) re-verified |

### D.5 Recommended triggers for Path A upgrade

The upgrade from Phase 1 (Path B) to Phase 3 (Path A) should be triggered when ALL of the following are true:

1. BitGo (or equivalent) has confirmed in writing that a silver trust product is ready for client onboarding
2. A physical sub-custodian has been selected and the vault agreement is executed
3. The PoR data integration between the trust layer and vault layer has been tested for at least one full attestation cycle
4. The legal opinion on the silver receipt token structure has been issued
5. A governance vote on the upgrade plan has passed
6. The upgrade plan includes a minimum 30-day notice period to AXAG token holders
7. A transition plan with specific dates for Phase 1 attestation wind-down and Phase 3 attestation start has been published

---

## E. Redemption Model Design

The liquidity score (currently 3) is partially gated on the redemption model. Documenting a viable redemption model is required to close L-03 (Redemption SLA draft) and is a prerequisite for the liquidity score to move from 3 toward 2. Each model below is evaluated for its impact on the liquidity score.

### E.1 Scoring context for liquidity

Per CEF Section 10.5:
- Score 2: Liquid spot market ($10M–$100M daily volume) + on-chain redemption path + limited AMM depth
- Score 3: Moderate spot market ($1M–$10M daily) OR redemption requires T+1
- Score 1: Deep spot market (>$100M) + instant on-chain redemption + functioning AMM pool

Silver (XAG) global spot market averages $4B–$8B daily volume — comfortably above the $100M threshold for dimension score 1. The limiting factor for AXAG is not the silver spot market but the absence of: (a) an on-chain redemption path from AXAG to physical silver, and (b) a functioning AMM pool on Arbitrum One for AXAG.

A documented and operable redemption model (even T+1 institutional) satisfies the "on-chain redemption path" criterion if the initiation is on-chain. A functioning AMM pool (L-01 workstream) addresses the AMM depth criterion.

---

### Model R1 — Large-Lot Physical Silver Redemption

**Model description:** Institutional-only. Redemption of whole bars (750–1,100 troy ounce minimum per redemption). Redeemer receives physical LBMA Good Delivery silver bars delivered to an LBMA-accredited vault of their choice (in-vault title transfer) or physical delivery.

| Field | Detail |
| ----- | ------ |
| Minimum redemption size | 1 LBMA Good Delivery bar (750 troy oz minimum ≈ $19,500–$27,000 at XAG $26–$36/oz) |
| Settlement window | T+1 for in-vault title transfer; T+3 to T+5 for physical delivery |
| Initiation | On-chain redemption transaction signed by a KYC-verified wallet; instruction transmitted to custodian via authenticated API |
| Authentication | Multi-party authorization (at least 2-of-N signers); logged with timestamped record |
| Logistics | In-vault: custodian transfers title to named LBMA member account. Physical delivery: custodian arranges insured transport via LBMA-standard carrier |
| Cost responsibility | Redeemer bears transport, insurance, and delivery fees. Storage fee prorated to redemption date. |
| User disclosure | "Redemption returns LBMA Good Delivery silver bars, not USD or stablecoins. Fiat conversion is the redeemer's responsibility through a third-party exchange or commodity dealer. Minimum redemption is one full bar (750 troy ounces). Settlement at T+1 for in-vault title transfer or T+3 to T+5 for physical delivery." |
| Operational burden | Moderate: requires custodian API integration, KYC verification of redeemer wallet, and coordination with LBMA carrier network. One-time setup; per-redemption operational cost is low. |
| Regulatory risk | Low: physical commodity delivery is a well-precedented commercial arrangement. CFTC commodity delivery rules apply; no securities analysis triggered for the delivery itself. |
| Liquidity score impact | Moves Liquidity Risk 3 → **2** if on-chain initiation is implemented and AMM pool is operational (L-01). The spot market volume ($4B+ daily) alone satisfies the score-2 threshold. |
| Fit score | **HIGH** — cleanest institutional model; lowest regulatory risk; matches the PAXG redemption analogy |

---

### Model R2 — Custodian-Directed Delivery

**Model description:** Axiom Protocol (not the token holder directly) holds the redemption relationship with the custodian. Token holders redeem AXAG tokens on-chain for AXUSD at the prevailing NAV. Axiom Protocol periodically directs the custodian to deliver or sell silver to manage the reserve, returning AXUSD proceeds to the reserve pool.

| Field | Detail |
| ----- | ------ |
| Minimum redemption size | None from the token holder's perspective (AXUSD returned); physical rebalancing happens at Axiom Protocol's discretion at bar-lot sizes |
| Settlement window | Instant to T+0 for AXUSD return to the redeemer; T+1 to T+5 for physical silver movement (backstage, not visible to token holder) |
| Initiation | Token holder burns AXAG on-chain; Axiom Protocol's reserve management system determines when to instruct custodian to sell or deliver physical bars |
| Authentication | Token holder: on-chain burn; Axiom Protocol → custodian: multi-party authorization |
| Logistics | Custodian receives periodic instructions from Axiom Protocol for reserve rebalancing. Physical delivery or sale occurs at Axiom Protocol direction, not at token holder direction. |
| Cost responsibility | Axiom Protocol absorbs operational costs; may be passed through as a redemption fee to token holders |
| User disclosure | "Redemption returns AXUSD at the prevailing NAV. AXUSD is not USD. Axiom Protocol manages the physical silver reserve; individual token holders do not have a direct claim on specific silver bars. Reserve management is conducted at Axiom Protocol's discretion." |
| Operational burden | Low per-redemption for token holders; higher operational burden on Axiom Protocol for reserve management and custodian instruction |
| Regulatory risk | **Higher than R1.** This model may create a continuous commercial relationship between Axiom Protocol and the token holder that closer resembles a managed fund than a commodity instrument. Legal review is required before selecting this model. Potential Reves/Howey analysis implications. |
| Liquidity score impact | Moves Liquidity Risk 3 → **2** (AXUSD is an on-chain redemption path; spot market volume is high). Does not require AMM pool for score 2. |
| Fit score | **MEDIUM** — simpler for token holders; higher regulatory risk; requires legal review |

---

### Model R3 — Internal Queue and Scheduled Settlement

**Model description:** Redemptions are queued on-chain. AXAG token holders submit burn requests. Requests are batched and settled on a defined schedule (e.g., bi-weekly or monthly). Each settlement cycle, Axiom Protocol instructs the custodian to move silver or return AXUSD from the reserve buffer. Queued redeemers receive AXUSD or silver claim at the next settlement window.

| Field | Detail |
| ----- | ------ |
| Minimum redemption size | Configurable (e.g., 1 troy oz equivalent minimum for AXUSD queue; full bar for physical) |
| Settlement window | Next scheduled settlement date (bi-weekly or monthly cycle); worst-case 30-day wait |
| Initiation | On-chain queue entry by token holder; AXAG tokens held in escrow until settlement |
| Authentication | On-chain smart contract queue; multi-party authorization for settlement instruction to custodian |
| Logistics | Custodian instructed at each settlement cycle; settlement proceeds distributed from reserve pool |
| Cost responsibility | Gas fees for queue entry (token holder); operational settlement fee (Axiom Protocol, may be passed through) |
| User disclosure | "Redemptions are processed on a bi-weekly / monthly settlement cycle. AXAG tokens are locked when a redemption request is submitted and cannot be transferred until the request is cancelled or settled. Settlement returns AXUSD at the NAV as of the settlement date, which may differ from NAV at the time of request submission." |
| Operational burden | Moderate: requires queue management contract, settlement automation, and custodian coordination at each cycle. Lower continuous burden than R2 but requires reliable automation. |
| Regulatory risk | Moderate: the queue and lock-up mechanism may be analyzed as a participation lockup (consistent with glossary) or as a restriction on withdrawal that regulators may scrutinize. Legal review recommended. |
| Liquidity score impact | Moves Liquidity Risk 3 → **2** only if the settlement cycle is bi-weekly or shorter and the on-chain queue constitutes an "on-chain redemption path" per CEF. Monthly settlement may not satisfy CEF score 2 criteria. |
| Fit score | **MEDIUM** — manages operational load; creates withdrawal timing risk for token holders; regulatory analysis required |

---

### Model R4 — No Direct Retail Redemption; Institutional Only

**Model description:** No direct retail redemption channel. Only accredited, KYC-verified institutional counterparties may initiate a redemption. Retail token holders access liquidity exclusively through secondary market (AMM or OTC). Axiom Protocol manages physical reserve separately from any retail redemption obligation.

| Field | Detail |
| ----- | ------ |
| Minimum redemption size | Institutional minimum only (e.g., 5,000 troy oz or $130,000+ equivalent) |
| Settlement window | Negotiated per institutional counterparty; T+1 to T+5 |
| Initiation | Institutional counterparty submits redemption instruction via authenticated channel; KYC and counterparty agreement required |
| Authentication | Multi-party authorization; institutional agreement pre-signed |
| Logistics | Custodian coordinates directly with institutional counterparty; in-vault title transfer or physical delivery |
| Cost responsibility | Institutional counterparty bears all delivery costs; storage fee prorated |
| User disclosure | "AXAG does not support direct retail redemption. Retail token holders may access liquidity through the secondary market (AMM or OTC venue). Redemption of physical silver is available only to accredited institutional counterparties meeting Axiom Protocol's eligibility requirements. Retail token holders have no direct claim on the underlying silver reserve." |
| Operational burden | Low continuous burden; high compliance burden (accredited investor verification; counterparty agreement management) |
| Regulatory risk | **Highest of all models.** Restricting redemption to institutional counterparties while offering a public token may create Reves "note" analysis risks. The absence of a retail redemption path is a material disclosure that must appear prominently in all public-facing documentation and the commodity disclosure endpoint. Legal opinion is required before this model is adopted. |
| Liquidity score impact | May NOT move Liquidity Risk to score 2 if the CEF "on-chain redemption path" requires retail accessibility. Risk of remaining at score 3. Legal review required. |
| Fit score | **LOW for primary model** — highest regulatory risk; retail liquidity depends entirely on AMM depth; not recommended as primary redemption model |

---

### E.2 Redemption model comparison

| Field | R1 (Large-lot physical) | R2 (Custodian-directed) | R3 (Queue + scheduled) | R4 (Institutional only) |
| ----- | :---------------------: | :---------------------: | :---------------------: | :---------------------: |
| Min redemption | 1 bar (750 oz) | None (AXUSD) | Configurable | 5,000 oz institutional |
| Settlement | T+1–T+5 | Instant (AXUSD) | Bi-weekly or monthly | T+1–T+5 (negotiated) |
| Retail accessible | Partial (high min) | Yes | Yes | No |
| Legal risk | Low | Medium-High | Medium | Highest |
| Operational burden | Medium | Medium-High | Medium | Low continuous |
| Regulatory review req. | No | Yes | Yes | Yes — mandatory |
| Liquidity score impact | → 2 | → 2 | → 2 (if bi-weekly) | → 2 (uncertain) |
| AMM dependency | Low | Low | Low | High |
| Fit score | **HIGH** | **MEDIUM** | **MEDIUM** | **LOW** |

### E.3 Redemption model and liquidity score linkage

Selecting and documenting a redemption model (L-03) is required before the Liquidity Risk score can be re-evaluated. The model selected must be confirmed as "on-chain redemption path" compliant by the risk lead before re-scoring. The L-01 AMM bootstrap design (currently IN PROGRESS) addresses the AMM pool dimension of liquidity independently of the redemption model.

**Recommended model:** R1 as the primary redemption model (institutional, large-lot, physical). R2 as an optional supplementary path for smaller institutional counterparties using the AXUSD reserve buffer. R4 is not recommended as a primary model. R3 is a fallback if R1 operational complexity is prohibitive at launch.

---

## F. RFP Tracking and Scoring Update System

This section defines the structure for tracking RFP responses. The live tracking document is AXAG_RFP_RESPONSE_TRACKER.md.

### F.1 Master tracking table structure

Each candidate has one row per RFP communication cycle. Columns are divided into five groups:

**Group 1 — Outreach status**

| Column | Description |
| ------ | ----------- |
| Candidate | Entity name |
| Outreach status | OUTREACH READY / CONTACTED / AWAITING RESPONSE / RESPONSE RECEIVED / FOLLOW-UP SENT / COMPLETE |
| Date contacted | ISO 8601 date of Template 1 email |
| Response received | Yes / No |
| Response date | ISO 8601 date response received |
| Follow-up sent | Yes / No |
| PoR template sent | Yes / No |

**Group 2 — Path and minimum standard gate**

| Column | Description |
| ------ | ----------- |
| Path A / B / C | Confirmed path from RFP response |
| MC-01 through MC-07 | Pass / Fail / Pending for each minimum custody standard |
| MC gate overall | PASS (all 7 pass) / FAIL (any fail) / PENDING |

**Group 3 — Precondition gate**

| Column | Description |
| ------ | ----------- |
| PRE-01 through PRE-08 | Met / Not Met / N/A for each precondition |
| PRE gate overall | MET / NOT MET / PENDING |

**Group 4 — Open question status**

| Column | Description |
| ------ | ----------- |
| OQ-01 through OQ-16 | Answered / Unanswered / N/A per candidate |
| OQ coverage | Percentage of applicable OQs answered |

**Group 5 — Scoring impact and selection readiness**

| Column | Description |
| ------ | ----------- |
| Custody score impact | Expected change to Custody Risk score if selected |
| New composite | Expected composite score if candidate selected and custody closes |
| Liquidity score impact | Any liquidity-relevant commitments from the candidate |
| Re-score readiness | READY (all C items closeable) / NOT READY (gaps remain) |
| Selection readiness | READY / NOT READY / CONDITIONAL |
| Notes | Free text |

### F.2 Scoring update protocol

When a formal RFP response is received:

1. File the response document in the C-02 evidence folder
2. Update the candidate's row in AXAG_RFP_RESPONSE_TRACKER.md
3. Score each MC (MC-01 through MC-07): Pass / Fail
4. Score each applicable OQ: Answered / Unanswered
5. Update the evaluation matrix to version 2.0 for that candidate
6. Update the pre-response score to a post-response score using the weighted dimension scoring
7. Update re-score readiness and selection readiness columns
8. Report to Treasury Lead and Compliance Lead

Re-scoring of the AXAG composite (via pages/api/operator/commodity-risk-score.ts) may only be run after:
- All 7 C items (C-01 through C-07) are CLOSED
- At least one candidate has MC gate PASS and PRE gate MET
- Treasury Lead and Compliance Lead have both signed off on the evaluation

---

## G. Decision Tree

All branches are evaluated after formal RFP responses are received (following C-02 completion).

```
START: RFP responses received from candidates
│
├─ BitGo responds to OQ-06
│   │
│   ├─ YES → BitGo willing to develop silver trust product
│   │   │
│   │   ├─ Physical sub-custodian confirmed (Brink's or Malca-Amit)
│   │   │   ├─ PURSUE Path A (P-A1 or P-A2)
│   │   │   └─ While Path A builds: execute Path B in parallel (Hybrid — Option 3)
│   │   │
│   │   └─ No physical sub-custodian willing
│   │       └─ PURSUE Path B immediately; revisit Path A with Loomis or Via Mat
│   │
│   └─ NO → BitGo will not develop silver trust product
│       │
│       └─ Anchorage responds to OQ-08
│           │
│           ├─ YES → OCC permits physical silver custody
│           │   └─ PURSUE Path A (P-A4) — long timeline; execute Path B in parallel
│           │
│           └─ NO or UNCLEAR → Path A not available with current candidates
│               └─ EXECUTE Path B immediately (Option 1)
│
├─ Malca-Amit responds to OQ-10
│   │
│   ├─ YES → Willing to commit to monthly signed attestation + unannounced inspection
│   │   └─ Malca-Amit advances to PRIMARY Path B candidate (highest physical score)
│   │
│   └─ NO or PARTIAL → Attestation cadence limited or inspection rights refused
│       └─ Malca-Amit moves to ALTERNATE; Brink's or Loomis becomes PRIMARY
│
├─ Brink's responds to OQ-01
│   │
│   ├─ YES → Brink's can provide direct signed PoR feed without Paxos intermediary
│   │   └─ Brink's PoR score upgrades to 4; Brink's becomes strongest Path B candidate overall
│   │
│   └─ NO → PoR feed requires an issuer intermediary or independent auditor
│       └─ Brink's remains strong on physical; Axiom Protocol appoints independent auditor
│
├─ No candidate satisfies MC-01 through MC-07
│   │
│   └─ ESCALATE to Treasury Lead and Governance Steward
│       ├─ Review MC definitions; consider whether any MC can be amended by governance
│       ├─ Expand outreach to additional candidates
│       └─ Stage 2 cannot close; C-03 blocked; governance notified
│
├─ Custody resolves (C-03 through C-07 close) but Liquidity does not (L-01 through L-05 still open)
│   │
│   └─ Stage 2 packet proceeds to P-02 review with documented liquidity remediation plan
│       ├─ Re-scoring may be run; composite reaches APPROVED if custody closes to score ≤ 2
│       ├─ Stage 3 governance vote may proceed with liquidity remediation plan documented
│       └─ Launch gate (Stage 4) will require L-01 through L-05 to close before AXAG goes live
│
└─ Oracle verification (O-01) fails — Chainlink XAG/USD absent on Arbitrum One
    │
    ├─ Oracle Risk score must be raised from 2 to 3 or higher
    │   └─ New composite: 3 + custody_score + liquidity_score + 1 + 2 (elevated)
    │
    ├─ Tier 2 oracle plan required (O-02): design Pyth or API3 aggregator for XAG/USD
    │
    └─ If Tier 2 oracle is confirmable → Oracle Risk → 4 (no Chainlink; Tier 2 only)
        └─ New composite at best: 4 + 2 + 2 + 1 + 2 = 11 (CONDITIONAL still)
           → Re-scoring does not move to APPROVED until oracle is addressed
           → Oracle resolution becomes Priority 1 co-equal with custody
```

---

## H. Recommended Strategy

### H.1 Best immediate path

**Option 1 (Path B) — Immediate execution with Brink's or Malca-Amit as primary custodian.**

Rationale:
- Path B requires no new product development and can close C-03 through C-07 within 4–6 months of RFP responses
- Custody Risk moves from 3 to 2; composite moves from 11 to 10 (APPROVED band)
- AXAG may proceed to Stage 3 governance vote once all Stage 2 items close
- Brink's has the strongest operational analogy (PAXG); Malca-Amit has the strongest silver specialization and Lloyd's insurance

Selection tie-breaker (if both respond affirmatively to all MCs):
- Select Malca-Amit as primary if OQ-10 resolves YES (monthly attestation + unannounced inspection)
- Select Brink's as primary if OQ-01 resolves YES (direct signed PoR feed available)
- If both OQ-10 and OQ-01 resolve YES: select based on fee schedule and term sheet negotiation outcome

### H.2 Best long-term path

**Option 2 (Path A) — BitGo Trust + Malca-Amit dual-layer, pursued in parallel with Path B execution.**

Rationale:
- Path A moves Custody Risk from 3 to 1; composite from 11 to 8–9
- Matches the AXAU/PAXG architecture exactly
- BitGo CaaS relationship already exists for AXAU; this is an extension, not a new relationship
- Malca-Amit's silver specialization and Lloyd's insurance provide the strongest physical layer
- Pursue OQ-06 in parallel with all Path B activity; the two are not mutually exclusive

Monitoring trigger: If BitGo confirms YES on OQ-06 at any point before the Phase 1 custody agreement is signed, evaluate whether to defer Path B selection and wait for Path A timeline. If BitGo confirms YES after the Phase 1 agreement is signed, initiate the Hybrid Path (Option 3) governance process.

### H.3 Fallback path

**Option 1 (Path B) — Loomis as primary custodian, if Brink's and Malca-Amit both decline or fail MC gate.**

Loomis has confirmed LBMA silver capability in London and Zurich. European regulatory framework. Lower digital integration score, but Path B only requires an independent auditor for attestation — Loomis's cooperation with scheduled attestations is sufficient.

If all three Path B candidates (Brink's, Malca-Amit, Loomis) fail MC or decline:
- Expand outreach to additional LBMA-accredited vault operators
- Evaluate Perth Mint (Australian government-backed; LBMA accredited; has a gold certificate program)
- Evaluate Royal Canadian Mint (government-backed; silver products)
- Consider Via Mat as a last-resort Path B candidate despite lower weighted score

### H.4 No-go condition

**AXAG must not advance to Stage 3 if any of the following is true:**

| No-go ID | Condition | Consequence |
| -------- | --------- | ----------- |
| NG-01 | No candidate satisfies all 7 Minimum Custody Standards (MC-01–MC-07) | C-03 cannot close; Stage 2 stalls; governance must be notified |
| NG-02 | Oracle verification (O-01) finds that Chainlink XAG/USD does not exist on Arbitrum One AND no Tier 2 oracle plan is approved | Oracle Risk rises to 4 or 5; composite reaches 12+ (CONDITIONAL); Stage 3 requires additional oracle remediation plan |
| NG-03 | Legal opinion engagement (REG-01) does not result in a completed opinion by Stage 3 vote | Governance vote cannot be scheduled without legal opinion on commodity, securities, and money-transmission analysis |
| NG-04 | Re-scoring shows any dimension at score 4 or 5 | CEF requires explicit governance discussion and remediation commitment before Stage 3 proceeds |
| NG-05 | Redemption model legal review (required for R2, R3, R4) identifies a securities law issue | Redemption model must be revised or replaced with R1 (physical delivery) before re-scoring |
| NG-06 | Launch readiness gate (Stage 4) fails any hard blocker (HB-01 through HB-10) | AXAG does not launch; gate re-run required after remediation |

**In any no-go condition, AXAG remains NOT LIVE and NOT APPROVED FOR DEPLOYMENT.**

---

## Evidence artifact linkage

| Tracker item | Status | This document's role |
| ------------ | :----: | -------------------- |
| C-02 | IN PROGRESS | Supplementary — options framework for C-03 preparation |
| C-03 | ASSIGNED | Section B/C/D/H define selection criteria and decision gates |
| L-03 | ASSIGNED | Section E defines redemption model options feeding L-03 |
| P-03 | ASSIGNED | Section A.2 defines re-scoring scenario table |

AXAG IS NOT LIVE AND IS NOT APPROVED FOR DEPLOYMENT. This options package does not authorize, initiate, or imply the deployment of any AXAG instrument, token, pool, or banking integration.

---

End of options package.
