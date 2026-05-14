# Axiom Protocol — Avalanche Mainnet Readiness Reconciliation

**Version:** 1.0.0
**Last updated:** 2026-05-14
**Verdict: NO-GO**

This document reconciles each Avalanche mainnet promotion gate against the actual codebase and documentation state as of this date. It is the evidence record for the gate summary in `AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md`.

---

## How to Read This Document

Each gate entry contains:
- **Claimed status** — what the promotion gates doc says
- **Evidence** — what files/artifacts support the claim
- **Reconciled verdict** — the honest assessment
- **Remaining action** — what must happen to fully close it

---

## G01 — All Fuji Smoke Tests Pass (15/15)

**Claimed status:** ✓ SATISFIED
**Evidence:**
- `documents/chains/AXIOM_AVALANCHE_FUJI_SMOKE_REPORT.md` — smoke test results on file
- `scripts/vault-sprint-avalanche-fuji.ts` — proof script with invariants A–H
- Gate 5 proof tx: `0xb9f92f69007550443581d17b4b2c98697f731f6bea1c3167947d9075ac34f06a` (Fuji testnet)
**Reconciled verdict:** CONFIRMED SATISFIED
**Remaining action:** None. Smoke tests are a one-time gate; re-run if contracts are modified.

---

## G02 — Replace setAllowAll with Per-Jurisdiction Allowlist

**Claimed status:** ◑ CODE READY — pending compliance counsel
**Evidence:**
- `scripts/deploy/avalanche/deploy-phase1-mainnet.mts` lines 82–98: `rawCodes` reads from `AVALANCHE_MAINNET_COUNTRY_CODES`, defaults to `"840"` (USA only). `setAllowAll` is absent.
- Comment explicitly states: "Does NOT call setAllowAll — that Fuji testnet shortcut is explicitly absent."
- `setAllowedCountry(code, true)` called per-code in the wiring sequence (lines 279–286)
**Reconciled verdict:** CODE CONFIRMED — default is 840 (US only) per master prompt direction. Env var can add countries only with counsel approval.
**Remaining action:** Compliance counsel must confirm `AVALANCHE_MAINNET_COUNTRY_CODES=840` in writing before deploy. This is hard blocker B01.

---

## G03 — Assign DEFAULT_ADMIN Role to Gnosis Safe

**Claimed status:** ✓ DEFERRED — Deployer EOA retained
**Evidence:**
- Decision documented in `AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md` §G03 with accepted risk rationale, compensating controls, and post-launch migration plan
- No Safe deployed on Avalanche mainnet (correct — no mainnet deploy has occurred)
**Reconciled verdict:** DEFERRED CONFIRMED — accepted risk documented; no gate satisfaction claimed
**Remaining action:** Deploy Safe and migrate roles post-launch (before significant TVL).

---

## G04 — Assign AGENT Role to Controlled Operations Address

**Claimed status:** ✓ DEFERRED — Deployer EOA retained
**Evidence:**
- Decision documented in `AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md` §G04
- Deployer EOA will hold AGENT_ROLE at launch; post-launch migration plan on file
**Reconciled verdict:** DEFERRED CONFIRMED
**Remaining action:** Define ops address and migrate AGENT_ROLE post-launch.

---

## G05 — Assign MINTER Role to Controlled Issuance Process

**Claimed status:** ✓ DEFERRED — Deployer EOA retained
**Evidence:**
- Decision documented in `AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md` §G05
- Capinfra audit trail provides compensating control: every mint is a SETTLED record in `cap_settlement_instructions`
- Daily reserve reconciliation (G12) detects unauthorized mints within 24 hours
**Reconciled verdict:** DEFERRED CONFIRMED — compensating controls documented
**Remaining action:** Define issuance process and migrate MINTER_ROLE post-launch.

---

## G06 — Deployer EOA Renounces All Roles

**Claimed status:** ✓ DEFERRED — Pending G03/G04/G05 migration
**Evidence:**
- Decision documented in `AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md` §G06
- Post-launch renunciation checklist on file in that document
- Deployer key goes to cold storage immediately after mainnet deploy
**Reconciled verdict:** DEFERRED CONFIRMED — sequencing correct; cannot renounce before roles are transferred
**Remaining action:** Execute renunciation checklist after G03/G04/G05 migration.

---

## G07 — Set Production TransferLimitModule Cap

**Claimed status:** ◑ CAP DEFINED — pending mainnet deployment
**Evidence:**
- `scripts/deploy/avalanche/deploy-phase1-mainnet.mts` lines 100–115: reads `AVALANCHE_MAINNET_TRANSFER_LIMIT_RAW`, defaults to `100_000_000_000` (100,000 AXUSD/day, 6 decimals)
- Wiring sequence calls `TransferLimitModule.setTransferLimit(MC, limitRaw)` (lines ~295+)
- Transfer limit recorded in deployment manifest
**Reconciled verdict:** CODE CONFIRMED — default value is reasonable; not yet approved
**Remaining action:** Product and compliance must approve 100,000 AXUSD/day default or provide alternate value. Hard blocker B02.

---

## G08 — External Security Review Signed Off

**Claimed status:** ✓ DEFERRED — Internal Gate 6 review as compensating control
**Evidence:**
- `documents/chains/AXIOM_AVALANCHE_GATE6_SECURITY_REVIEW.md` — internal review complete: 16 threats catalogued, 1 medium finding (T03) fixed, 4 accepted-risk items documented
- `lib/capinfra/adapters/avalanche/dispatcher.ts` — T03 fix applied (chainId verification)
- `documents/chains/AXIOM_AVALANCHE_GATE6_THREAT_MODEL.md` — threat model on file
- No external audit report exists (correct — deferred)
**Reconciled verdict:** DEFERRED CONFIRMED — internal review is compensating control only; external audit required before significant TVL
**Remaining action:** Engage external security firm before expanding AXUSD supply. File signed-off report under `documents/audits/`.

---

## G09 — Capinfra AVALANCHE Adapter DRY_RUN Tested

**Claimed status:** ✓ SATISFIED
**Evidence:**
- `documents/chains/AXIOM_AVALANCHE_CAPINFRA_GATE5_REPORT.md` — Gate 5 report on file
- `scripts/vault-sprint-avalanche-fuji.ts` invariants A–B proven DRY_RUN adapter routing
- `lib/capinfra/adapters/avalanche/dispatcher.ts` — adapter present with T03 fix
- `shared/capInfraSchema.ts` — AVALANCHE settlement type defined (migration 0059)
**Reconciled verdict:** CONFIRMED SATISFIED
**Remaining action:** None.

---

## G10 — Capinfra AVALANCHE Adapter LIVE Dispatch Tested

**Claimed status:** ◑ IN PROGRESS — MINT proven; TRANSFER DRY_RUN proven
**Evidence:**
- `scripts/vault-sprint-avalanche-fuji.ts` invariant H implemented and tested in DRY_RUN mode
- LIVE MINT proven on-chain (2× Fuji transactions confirmed in Gate 5 report)
- LIVE TRANSFER: invariant H code exists, DRY_RUN path proven; LIVE execution NOT yet run
**Reconciled verdict:** IN PROGRESS CONFIRMED — LIVE TRANSFER is the only missing proof
**Remaining action:** Run proof script with `AVALANCHE_ADAPTER_MODE=LIVE`. Document tx hash. Hard blocker B03.

---

## G11 — Incident Response Plan Complete

**Claimed status:** ◑ DOCUMENT COMPLETE — pending ops leadership acceptance
**Evidence:**
- `documents/operations/INCIDENT_RESPONSE_PLAN.md` exists and is complete: 6 runbooks, P1–P4 severity levels, escalation chain, monitoring signals table
**Reconciled verdict:** DOCUMENT CONFIRMED COMPLETE — acceptance is the only missing step
**Remaining action:** Operations leadership must formally accept the plan. File acceptance record. Hard blocker B04.

---

## G12 — Reserve and Reconciliation Model Complete

**Claimed status:** ◑ DOCUMENT COMPLETE — pending test reconciliation run
**Evidence:**
- `documents/operations/RESERVE_RECONCILIATION_MODEL.md` exists and is complete: SQL queries, tolerance thresholds (±0.01 AXUSD), daily cron spec, JSON report format
- No `documents/operations/fuji-reconciliation-*.json` output file exists
**Reconciled verdict:** DOCUMENT CONFIRMED COMPLETE — Fuji test run is the only missing step
**Remaining action:** Execute reconciliation script or manual equivalent against Fuji. File output JSON report. Hard blocker B05.

---

## Summary

| Gate | Claimed | Reconciled | Honest Verdict |
|---|---|---|---|
| G01 | SATISFIED | CONFIRMED | Closed |
| G02 | CODE READY | CODE CONFIRMED | Hard blocker — counsel approval |
| G03 | DEFERRED | DEFERRED CONFIRMED | Accepted risk — post-launch |
| G04 | DEFERRED | DEFERRED CONFIRMED | Accepted risk — post-launch |
| G05 | DEFERRED | DEFERRED CONFIRMED | Accepted risk — post-launch |
| G06 | DEFERRED | DEFERRED CONFIRMED | Accepted risk — post-launch |
| G07 | CAP DEFINED | CODE CONFIRMED | Hard blocker — product/compliance approval |
| G08 | DEFERRED | DEFERRED CONFIRMED | Accepted risk — before significant TVL |
| G09 | SATISFIED | CONFIRMED | Closed |
| G10 | IN PROGRESS | IN PROGRESS | Hard blocker — LIVE TRANSFER not proven |
| G11 | DOC COMPLETE | DOC CONFIRMED | Hard blocker — ops acceptance not filed |
| G12 | DOC COMPLETE | DOC CONFIRMED | Hard blocker — Fuji test run not filed |

**Hard blockers before deploy: 5 (G02 counsel, G07 approval, G10 LIVE tx, G11 acceptance, G12 test run)**
**Deferred/accepted: 5 (G03, G04, G05, G06, G08)**
**Fully satisfied: 2 (G01, G09)**
**Mainnet verdict: NO-GO**
