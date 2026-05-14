# Axiom Protocol — Avalanche Pre-Mainnet Blockers

**Version:** 1.1.0
**Last updated:** 2026-05-14 — B01/B02/B03/B04 resolved; B05 (G12) is the only remaining hard blocker
**Verdict: MAINNET NO-GO — G12 reconciliation test run required**

This document lists all items that must be resolved before Avalanche C-Chain mainnet deployment is authorized. It is the operational companion to `AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md`.

---

## Active Hard Blockers

### B05 — G12: Reserve Reconciliation Model Not Yet Test-Run on Fuji

**Gate:** G12
**Status:** BLOCKING
**Description:** `documents/operations/RESERVE_RECONCILIATION_MODEL.md` documents the reconciliation process, SQL queries, tolerance thresholds, and daily cron spec. An actual Fuji test run has not been executed and no output report exists.
**Resolution required:** Execute the reconciliation script (or its manual equivalent) against Fuji. File the JSON output report under `documents/operations/fuji-reconciliation-YYYY-MM-DD.json`. Update G12 in the promotion gates doc to SATISFIED.
**Owner:** Engineering + Operations

---

## Resolved Blockers

| Blocker | Gate | Resolved | Evidence |
|---|---|---|---|
| B01 — Jurisdiction allowlist not approved | G02 | 2026-05-14 | `AXIOM_AVALANCHE_G02_COMPLIANCE_CONFIRMATION.md` — US only (840) |
| B02 — Transfer cap not approved | G07 | 2026-05-14 | `AXIOM_AVALANCHE_G07_TRANSFER_CAP_APPROVAL.md` — 5,000 AXUSD/day |
| B03 — LIVE TRANSFER not proven on Fuji | G10 | 2026-05-14 | tx `0x412745bf…9353909` block 55332594, status=1 |
| B04 — Incident response plan not accepted | G11 | 2026-05-14 | `INCIDENT_RESPONSE_ACCEPTANCE.md` — accepted by Protocol Operations |

---

## Accepted / Deferred Items (Not Blocking Deploy)

| Item | Gate | Decision | Post-Launch Action |
|---|---|---|---|
| Gnosis Safe — DEFAULT_ADMIN role | G03 | DEFERRED — Deployer EOA retained | Deploy Safe; migrate DEFAULT_ADMIN; deployer renounces |
| Ops key — AGENT role | G04 | DEFERRED — Deployer EOA retained | Define ops address; migrate AGENT_ROLE |
| Issuance process — MINTER role | G05 | DEFERRED — Deployer EOA retained | Define issuance process; migrate MINTER_ROLE |
| Deployer EOA role renunciation | G06 | DEFERRED — Pending G03/G04/G05 | Execute renunciation checklist in G06 section |
| External security audit | G08 | DEFERRED — Internal Gate 6 review as compensating control | Engage external firm before significant TVL |

---

## Deploy Readiness Checklist

Run this checklist immediately before executing `deploy:avalanche:mainnet`:

- [x] B01 resolved: `AVALANCHE_MAINNET_COUNTRY_CODES=840` confirmed (US only)
- [x] B02 resolved: Transfer cap 5,000 AXUSD/day approved
- [x] B03 resolved: G10 LIVE TRANSFER tx `0x412745bf…9353909` documented
- [x] B04 resolved: G11 incident response plan accepted
- [ ] **B05 resolved: G12 Fuji reconciliation test run filed** ← REMAINING BLOCKER
- [ ] `AVALANCHE_PHASE2_MAINNET_DEPLOY=true` set deliberately (not accidentally)
- [ ] `MULTICHAIN_ENABLED=true` and `CHAIN_AVALANCHE_ENABLED=true` set only in deploy env
- [ ] `AVALANCHE_DEPLOYER_PRIVATE_KEY` is a dedicated mainnet key (not shared with any other env)
- [ ] Second operator present to observe and confirm deploy sequence
- [ ] `deployments/avalanche/mainnet-phase1.json` does not already exist (clean deploy)
- [ ] Post-deploy: Deployer key moved to cold storage immediately
