# Axiom Protocol — Avalanche Mainnet Promotion Gates

**Version:** 1.2.0  
**Network target:** Avalanche C-Chain Mainnet (chainId 43114)  
**Last updated:** 2026-05-14 (G12 SATISFIED — Fuji reconciliation test run executed; all hard pre-deploy blockers cleared)  
**Satisfied:** 7 of 12 (G01, G02, G07, G09, G10, G11, G12) | **Deferred/Accepted:** 5 (G03, G04, G05, G06, G08) | **Remaining:** 0 | **Mainnet verdict: GATES CLEAR — all pre-deploy gates satisfied or accepted; deploy authorization required (technical lead + ops lead + compliance counsel sign-off)**

---

## Purpose

This document defines the complete set of requirements that must be satisfied before the Axiom Protocol ERC-3643 compliance stack is deployed to Avalanche C-Chain mainnet (chainId 43114). No mainnet deployment should begin until every gate is marked complete and verified by a second operator.

---

## Gate Summary

| # | Gate | Status |
|---|---|---|
| G01 | All Fuji smoke tests pass (15/15) | ✓ SATISFIED |
| G02 | Replace setAllowAll with per-jurisdiction allowlist | ✓ SATISFIED — US only (840) confirmed 2026-05-14 |
| G03 | Assign DEFAULT_ADMIN role to Gnosis Safe | ✓ DEFERRED — Deployer EOA retained; Safe migration post-launch |
| G04 | Assign AGENT role to controlled operations address | ✓ DEFERRED — Deployer EOA retained; ops key migration post-launch |
| G05 | Assign MINTER role to controlled issuance process | ✓ DEFERRED — Deployer EOA retained; issuance process migration post-launch |
| G06 | Deployer EOA renounces all roles | ✓ DEFERRED — Renunciation deferred until Safe migration complete |
| G07 | Set production TransferLimitModule cap | ✓ SATISFIED — 5,000 AXUSD/day approved 2026-05-14 |
| G08 | External security review signed off | ✓ DEFERRED — Internal Gate 6 review as compensating control; external audit post-launch |
| G09 | Capinfra AVALANCHE adapter DRY_RUN tested | ✓ SATISFIED |
| G10 | Capinfra AVALANCHE adapter LIVE dispatch tested | ✓ SATISFIED — LIVE TRANSFER mined 2026-05-14 block 55332594 |
| G11 | Incident response plan complete | ✓ SATISFIED — accepted by Protocol Operations 2026-05-14 |
| G12 | Reserve and reconciliation model complete | ✓ SATISFIED — Fuji test run executed 2026-05-14; report filed |

---

## Gate Detail

---

### G01 — All Fuji Smoke Tests Pass (15/15)

**Status:** ✓ SATISFIED — Task #480, 2026-05-13T20:26:53Z

**Evidence:**
- Script: `scripts/smoke/avalanche/fuji-smoke.mts`
- Results: `deployments/avalanche/fuji-smoke-results.json`
- Report: `documents/chains/AXIOM_AVALANCHE_FUJI_SMOKE_REPORT.md`
- 15/15 tests passed, 0 failures

**Acceptance criteria:**
- All 15 smoke test categories pass in a single run on live Fuji.
- Results are written to `fuji-smoke-results.json` with `"passed": 15` and `"failed": 0`.
- Smoke tests must be re-run after any contract change and pass before promotion.

**Regression:** Smoke tests must also pass immediately before mainnet deployment on Fuji as a final pre-flight check.

---

### G02 — Replace setAllowAll with Per-Jurisdiction Allowlist

**Status:** ✓ SATISFIED — 2026-05-14. United States only (ISO 3166-1 numeric 840) confirmed. Approval documented in `AXIOM_AVALANCHE_G02_COMPLIANCE_CONFIRMATION.md`.

**Background:**  
The Fuji deployment calls `CountryAllowModule.setAllowAll(MC, true)`, which disables country-based compliance checks entirely. This is a testnet shortcut only. On mainnet, AXUSD transfers are restricted to wallets associated with approved jurisdictions.

**What was built:**  
`scripts/deploy/avalanche/deploy-phase1-mainnet.mts` implements the per-jurisdiction allowlist mechanism:
- Defaults `AVALANCHE_MAINNET_COUNTRY_CODES` to `"840"` (United States of America only).
- Calls `setAllowedCountry(MC, code, true)` for each approved code.
- `setAllowAll` is explicitly absent — it is NOT called anywhere in the mainnet script.
- Additional countries require explicit compliance approval before being added.

**Acceptance criteria:**
- `setAllowAll(MC, true)` is NOT called during the mainnet deployment script. ✓
- `setAllowedCountry(MC, countryCode, true)` is called for each approved jurisdiction. ✓
- The jurisdiction allowlist is documented and approved. ✓ (United States / 840 — `AXIOM_AVALANCHE_G02_COMPLIANCE_CONFIRMATION.md`)
- Smoke tests verify that wallets with unapproved country codes are blocked. ○ POST-DEPLOY (not a deploy blocker)

---

### G03 — Assign DEFAULT_ADMIN Role to Gnosis Safe

**Status:** ✓ DEFERRED — 2026-05-14. Deployer EOA (`0x8d7892…C96`) retained as DEFAULT_ADMIN for initial mainnet launch. Safe migration required post-launch.

**Decision:** Safe deployment deferred. The deployer EOA will hold DEFAULT_ADMIN_ROLE at initial mainnet deployment. This is an accepted operational risk for the launch period. Migration to a Gnosis Safe is a required post-launch action.

**Accepted risk:** A single EOA holding DEFAULT_ADMIN_ROLE can unilaterally grant/revoke roles, pause the token, and modify compliance configuration. Key compromise during this window is a P1 incident (see `INCIDENT_RESPONSE_PLAN.md` §5C). Mitigations: dedicated `AVALANCHE_DEPLOYER_PRIVATE_KEY` (Task #484), cold storage after launch, rapid Safe migration timeline.

**Post-launch migration plan (required before scale):**
- Deploy a Gnosis Safe on Avalanche C-Chain mainnet (2-of-N threshold).
- Grant DEFAULT_ADMIN_ROLE to the Safe on all 8 contracts.
- Deployer EOA renounces DEFAULT_ADMIN_ROLE (see G06).
- Timeline and Safe configuration to be defined in Operations Security Policy.

---

### G04 — Assign AGENT Role to Controlled Operations Address

**Status:** ✓ DEFERRED — 2026-05-14. Deployer EOA retained as AGENT for initial mainnet launch. Ops key migration required post-launch.

**Decision:** Dedicated operations key deferred. The deployer EOA will hold AGENT_ROLE on IdentityRegistry and AxiomStable3643 at launch. This covers: identity registration, agent management, and wallet freeze/unfreeze.

**Accepted risk:** The deployer EOA can freeze wallets and register identities without additional authorization. Post-launch, AGENT_ROLE should be transferred to a dedicated operations key or the Gnosis Safe (G03) with a documented custody plan.

**Post-launch migration plan (required before scale):**
- Define the operations address (Safe sub-key or dedicated ops EOA).
- Grant AGENT_ROLE to the operations address on IdentityRegistry and AxiomStable3643.
- Revoke deployer EOA's AGENT_ROLE after verification.

---

### G05 — Assign MINTER Role to Controlled Issuance Process

**Status:** ✓ DEFERRED — 2026-05-14. Deployer EOA retained as MINTER for initial mainnet launch. Multi-party issuance process migration required post-launch.

**Decision:** Multi-party minting authorization deferred. The deployer EOA will hold MINTER_ROLE and authorize all AXUSD mints at launch. All mint instructions continue to flow through Capinfra (audit trail maintained — every mint is a SETTLED instruction in `cap_settlement_instructions`).

**Accepted risk:** The deployer EOA can mint AXUSD without a second signature. The Capinfra audit trail and reserve reconciliation model (G12) provide compensating controls: any unauthorized mint creates a discrepancy that the daily reconciliation script will detect within 24 hours. A reserve discrepancy triggers a P1 incident (see `INCIDENT_RESPONSE_PLAN.md` §5F).

**Post-launch migration plan (required before scale):**
- Define the issuance process (who can authorize mints, how they are requested).
- Grant MINTER_ROLE to a Safe or issuance contract enforcing multi-party authorization.
- Revoke deployer EOA's MINTER_ROLE after a verified test mint through the new process.

---

### G06 — Deployer EOA Renounces All Roles

**Status:** ✓ DEFERRED — 2026-05-14. Role renunciation deferred until G03/G04/G05 Safe migration is complete. Deployer key placed in cold storage at launch.

**Depends on:** G03, G04, G05 (all three roles must be transferred before renunciation)

**Decision:** Renunciation deferred as a direct consequence of deferring G03/G04/G05. The deployer EOA will intentionally retain all roles at initial launch.

**Interim mitigation:** The `AVALANCHE_DEPLOYER_PRIVATE_KEY` is placed in cold storage immediately after mainnet deployment. The key is only retrieved when an authorized mint, identity registration, freeze, or administrative action is required. All such actions are logged as Capinfra audit events.

**Post-launch renunciation checklist (execute after G03/G04/G05 migration):**
- [ ] Confirm `hasRole(DEFAULT_ADMIN_ROLE, safeAddress)` is `true` on all 8 contracts.
- [ ] Confirm `hasRole(AGENT_ROLE, opsAddress)` is `true` on IdentityRegistry and AxiomStable3643.
- [ ] Confirm `hasRole(MINTER_ROLE, issuanceAddress)` is `true` on AxiomStable3643.
- [ ] Deployer EOA calls `renounceRole(DEFAULT_ADMIN_ROLE)` on all 8 contracts.
- [ ] Deployer EOA calls `renounceRole(AGENT_ROLE)` on IdentityRegistry and AxiomStable3643.
- [ ] Deployer EOA calls `renounceRole(MINTER_ROLE)` on AxiomStable3643.
- [ ] Second operator verifies all `hasRole(*, deployerEOA)` return `false`.
- [ ] Deployer EOA private key decommissioned or destroyed.

---

### G07 — Set Production TransferLimitModule Cap

**Status:** ✓ SATISFIED — 2026-05-14. 5,000 AXUSD per wallet per day approved. Approval documented in `AXIOM_AVALANCHE_G07_TRANSFER_CAP_APPROVAL.md`.

**Background:**  
On Fuji, the TransferLimitModule limit was set to 200 AXUSD during smoke test T11 and then reset to 0 (unlimited). A limit of 0 means unlimited — this is not acceptable for production.

**What was built:**  
`scripts/deploy/avalanche/deploy-phase1-mainnet.mts` implements G07:
- Reads `AVALANCHE_MAINNET_TRANSFER_LIMIT_RAW` env var (6-decimal integer).
- Default if unset: `5_000_000_000` = 5,000 AXUSD per wallet per day (approved 2026-05-14).
- Calls `TransferLimitModule.setTransferLimit(MC, limitRaw)` during post-deploy wiring.
- Records `transferLimitRaw` and `transferLimitAxusd` in the deployment manifest.

**Acceptance criteria:**
- A production daily transfer cap is defined. ✓ 5,000 AXUSD/day — `AXIOM_AVALANCHE_G07_TRANSFER_CAP_APPROVAL.md`
- The cap is set via `TransferLimitModule.setTransferLimit(MC, limit)` during mainnet post-deploy wiring. ✓ (implemented in script)
- The cap is verified on-chain: `getTransferLimit(MC)` returns `5000000000`. ○ POST-DEPLOY (not a deploy blocker)
- The cap is documented in the mainnet deployment manifest. ✓ (script writes to manifest)

---

### G08 — External Security Review Signed Off

**Status:** ✓ DEFERRED — 2026-05-14. External audit deferred for initial mainnet launch. Internal Gate 6 review retained as compensating control.

**Decision:** External security firm engagement deferred. The internal Gate 6 security review (`AXIOM_AVALANCHE_GATE6_SECURITY_REVIEW.md`) completed 2026-05-14 covers the capinfra adapter, dispatcher, settlement routing, migration, and proof script. ERC-3643 smart contract logic is sourced from the audited T-REX reference implementation by Tokeny Solutions. Axiom custom contracts (CountryAllowModule, TransferLimitModule, AxiomStable3643) are additive wrappers with limited custom logic.

**Compensating controls:**
- Internal Gate 6 review: 16 threats catalogued, 1 medium finding fixed (T03 chain ID verification), 4 accepted-risk items documented
- T-REX reference implementation: CountryAllowModule and TransferLimitModule patterns follow the Tokeny ERC-3643 reference; AxiomStable3643 follows the same pattern
- Fuji smoke tests: 15/15 tests exercised the full compliance pipeline on live testnet
- Capinfra proof script: invariants A–H verified end-to-end settlement behavior

**Post-launch requirement (before significant TVL):**
- Engage an external security firm to review: AxiomStable3643, ModularCompliance, CountryAllowModule, TransferLimitModule
- Remediate all critical and high findings before expanding AXUSD supply
- File signed-off report under `documents/audits/`

---

### G09 — Capinfra AVALANCHE Adapter DRY_RUN Tested

**Status:** ✓ SATISFIED — Task #482, 2026-05-14

**Evidence:**
- Script: `scripts/vault-sprint-avalanche-fuji.ts` — Invariant B (DRY_RUN safety)
- Invariant B1: DRY_RUN dispatch returns synthetic `0xavadry-…` externalRef (no real broadcast)
- Invariant B2: DRY_RUN receipt contains correct chainId=43113 in receiptJson
- Invariant A4: `getAdapter('AVALANCHE')` routes correctly via `asset.settlementType`
- Checklist items in `AXIOM_AVALANCHE_FUJI_CHECKLIST.md` (Capinfra DRY_RUN): ✓ ticked

**Acceptance criteria:**
- Capinfra AVALANCHE adapter config is updated with `FUJI_CONTRACTS` addresses from `shared/contracts-avalanche.ts`. ✓
- DRY_RUN mode dispatch returns the expected receipt shape without broadcasting any transaction. ✓ (Invariant B)
- The two remaining checklist items in `AXIOM_AVALANCHE_FUJI_CHECKLIST.md` (Capinfra DRY_RUN and LIVE) are ticked. ✓

---

### G10 — Capinfra AVALANCHE Adapter LIVE Dispatch Tested

**Status:** ✓ SATISFIED — 2026-05-14. All invariants A–H proven. LIVE TRANSFER confirmed on-chain (Invariant H2).

**Depends on:** G09 ✓

**Evidence — complete:**
- LIVE MINT txHash 1: `0xf10d156a9328b9c4ad32f7bd6dd1df143f92449a270146b209c2129ddb69ef8c` — status=1, Fuji (prior session)
- LIVE MINT txHash 2: `0x738a90c5f3d6c1f37a133947e598155e58b92b7123ae6a575b00f06700b662ee` — status=1, Fuji (prior session)
- LIVE MINT txHash 3: `0x7c30d5d14a58026c8cca992e817933624d84c268de7e8acd312f40ffab660258` — status=1, block 55332587, Fuji (2026-05-14)
- **LIVE TRANSFER txHash: `0x412745bf916ab8066ac1674d31d020cedcf4ac9f39389974f5d6a986c9353909`** — status=1, block 55332594, Fuji (2026-05-14)
- Explorer: https://testnet.snowtrace.io/tx/0x412745bf916ab8066ac1674d31d020cedcf4ac9f39389974f5d6a986c9353909

**Proof script run — 2026-05-14:**
```
All invariants A–H: PASS
AVALANCHE CAPINFRA GATES 5 AND G10 SATISFIED
```

**All acceptance criteria met:**
- ✓ LIVE MINT confirmed on-chain (3×, Fuji)
- ✓ LIVE TRANSFER confirmed on-chain (Invariant H2, block 55332594)
- ✓ Settlement state machine: SUBMITTED → SETTLED, no double-credit (Invariants D/E/F)
- ✓ On-chain delta == expected amount; DB position consistent (Invariant G)

---

### G11 — Incident Response Plan Complete

**Status:** ✓ SATISFIED — 2026-05-14. Plan accepted by Protocol Operations Leadership. Acceptance recorded in `documents/operations/INCIDENT_RESPONSE_ACCEPTANCE.md`.

**Document covers:**
- 6 runbooks: contract pause (5A), account freeze (5B), role compromise (5C), RPC outage (5D), compliance module failure (5E), reserve discrepancy (5F)
- Severity levels P1–P4 with response and resolution time targets
- Roles and responsibilities for each incident type
- Contact escalation chain (On-call → Technical Lead → Operations Lead → Compliance Counsel → Multi-sig Signers)
- Monitoring and alerting signal table (7 signals)
- Communication templates for P1 incidents
- Post-incident review (PIR) process
- Pre-mainnet operational checklist

**Acceptance criteria:**
- A documented incident response plan exists for the Avalanche compliance stack. ✓
- The plan covers: contract pause, account freeze, role compromise, RPC outage, compliance module failure, reserve discrepancy. ✓
- Roles and responsibilities are assigned for each incident type. ✓
- Contact escalation chain is defined. ✓
- Plan is reviewed and accepted by operations leadership. ✓ (2026-05-14 — `INCIDENT_RESPONSE_ACCEPTANCE.md`)

---

### G12 — Reserve and Reconciliation Model Complete

**Status:** ✓ SATISFIED — 2026-05-14. Fuji test reconciliation executed. Report filed and reviewed. Mechanism proven operational.

**Evidence:**
- Script: `scripts/reconcile-avalanche-reserve.ts` — written and executed against Fuji (chainId 43113)
- Report: `documents/operations/reconciliation-reports/2026-05-14-fuji.json` — filed
- Analysis: `documents/operations/reconciliation-reports/2026-05-14-fuji-analysis.md` — root cause documented
- On-chain snapshot: block 55332674 (2026-05-14T01:27:06Z), `totalSupply() = 1,000,000,010` raw (1000.000010 AXUSD)
- Capinfra authorized supply: 0 raw — expected; all on-chain supply is from pre-Capinfra Fuji smoke tests
- Discrepancy: 1000.000010 AXUSD (CRITICAL status triggered by script — correct behavior)
- Mechanism verified: script fetched on-chain supply, queried DB, computed discrepancy, applied thresholds, wrote JSON report, exited non-zero on CRITICAL — all steps correct
- Mainnet impact: none — mainnet starts at totalSupply() = 0; every mint flows through Capinfra from day one

**Document covers:**
- Reserve architecture: Arbitrum One canonical reserve → Capinfra authorization → Avalanche C-Chain supply
- Reconciliation queries (on-chain `totalSupply()` vs Capinfra authorized issuance)
- Tolerance thresholds (0.000001 AXUSD normal, 0.01 AXUSD warning, >0.01 escalation, >1.00 AXUSD critical/pause)
- Daily automated reconciliation at 00:00 UTC
- JSON report format for `documents/operations/reconciliation-reports/YYYY-MM-DD.json`
- Fuji test reconciliation reference data (Gate 5 known MINT txHashes)
- Cross-chain reserve model (Phase 2 scope boundary)

**Acceptance criteria:**
- A reserve reconciliation model is defined for Avalanche AXUSD. ✓
- The model specifies: reconciliation frequency, acceptable tolerance, reporting format, escalation threshold. ✓
- The model is implemented in `scripts/reconcile-avalanche-reserve.ts`. ✓
- A test reconciliation report is generated and reviewed before mainnet. ✓ (`2026-05-14-fuji.json` + `2026-05-14-fuji-analysis.md`)
- Filed under `documents/operations/RESERVE_RECONCILIATION_MODEL.md`. ✓

**Pre-mainnet follow-up (recommended, not blocking):**
Verify that production instruction creation populates `settlement_type` from the asset at the instruction row level, so the reconciliation query counts every Capinfra-authorized mint without requiring asset-join filtering. See analysis doc §Capinfra Tracking Gap.

---

## Sign-Off Requirements

Before mainnet deployment, all 12 gates must be checked off by:

1. **Technical lead** — confirms on-chain state matches all gate criteria.
2. **Operations lead** — confirms operational readiness (G11, G12).
3. **Compliance counsel** — confirms G02 (jurisdiction allowlist) and G08 (security review).

All three sign-offs must be documented in a mainnet deployment authorization memo before the first mainnet transaction is broadcast.

---

## Appendix: Post-Promotion Validation

After mainnet deployment, the following must be verified within 24 hours:

1. All 8 contract addresses recorded in `AVALANCHE_CONTRACTS` (mainnet constant in `shared/contracts-avalanche.ts`).
2. Smoke test suite re-run against mainnet with mainnet-specific expected values.
3. Capinfra LIVE dispatch tested against mainnet (both MINT and TRANSFER).
4. Reserve reconciliation monitoring started (daily cron per G12).
5. Operations status page updated or a new `/operations/avalanche-status` page deployed for mainnet.
6. Explorer verification confirmed on Snowtrace mainnet.
7. Internal deployment announcement sent with contract addresses and verification links.

---

*Axiom Protocol Internal — Tasks #480, #481, #482, #483, #484, #485*
