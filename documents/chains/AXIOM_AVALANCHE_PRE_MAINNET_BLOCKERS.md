# Axiom Protocol — Avalanche Pre-Mainnet Blockers

**Version:** 1.2.0
**Last updated:** 2026-05-14 — B05 (G12) resolved; all hard pre-deploy blockers cleared
**Verdict: GATES CLEAR — no remaining hard blockers; deploy authorization required (three sign-offs)**

This document lists all items that must be resolved before Avalanche C-Chain mainnet deployment is authorized. It is the operational companion to `AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md`.

---

## Active Hard Blockers

**None.** All hard pre-deploy blockers are resolved. Mainnet deployment requires only the three-party sign-off described in `AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md §Sign-Off Requirements`.

---

## Resolved Blockers

| Blocker | Gate | Resolved | Evidence |
|---|---|---|---|
| B01 — Jurisdiction allowlist not approved | G02 | 2026-05-14 | `AXIOM_AVALANCHE_G02_COMPLIANCE_CONFIRMATION.md` — US only (840) |
| B02 — Transfer cap not approved | G07 | 2026-05-14 | `AXIOM_AVALANCHE_G07_TRANSFER_CAP_APPROVAL.md` — 5,000 AXUSD/day |
| B03 — LIVE TRANSFER not proven on Fuji | G10 | 2026-05-14 | tx `0x412745bf…9353909` block 55332594, status=1 |
| B04 — Incident response plan not accepted | G11 | 2026-05-14 | `INCIDENT_RESPONSE_ACCEPTANCE.md` — accepted by Protocol Operations |
| B05 — G12 reconciliation test run not filed | G12 | 2026-05-14 | `reconciliation-reports/2026-05-14-fuji.json` + `2026-05-14-fuji-analysis.md` — mechanism proven; discrepancy documented as expected testnet baseline |

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
- [x] B05 resolved: G12 Fuji reconciliation test run filed — `reconciliation-reports/2026-05-14-fuji.json`
- [ ] `AVALANCHE_PHASE2_MAINNET_DEPLOY=true` set deliberately (not accidentally)
- [ ] `MULTICHAIN_ENABLED=true` and `CHAIN_AVALANCHE_ENABLED=true` set only in deploy env
- [ ] `AVALANCHE_DEPLOYER_PRIVATE_KEY` is a dedicated mainnet key (not shared with any other env)
- [ ] Second operator present to observe and confirm deploy sequence
- [ ] `deployments/avalanche/mainnet-phase1.json` does not already exist (clean deploy)
- [ ] Post-deploy: Deployer key moved to cold storage immediately
