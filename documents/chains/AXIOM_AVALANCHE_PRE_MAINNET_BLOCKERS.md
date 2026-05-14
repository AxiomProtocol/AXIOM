# Axiom Protocol — Avalanche Pre-Mainnet Blockers

**Version:** 1.0.0
**Last updated:** 2026-05-14
**Verdict: MAINNET NO-GO**

This document lists all items that must be resolved before Avalanche C-Chain mainnet deployment is authorized. It is the operational companion to `AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md`. Update this file as blockers are resolved.

---

## Hard Blockers (Deploy Cannot Proceed)

These items must be resolved and confirmed before `deploy:avalanche:mainnet` is run with `AVALANCHE_PHASE2_MAINNET_DEPLOY=true`.

### B01 — G02: Jurisdiction Allowlist Not Yet Approved

**Gate:** G02
**Status:** BLOCKING
**Description:** The mainnet deploy script defaults to country code `840` (United States of America only). This must be confirmed in writing by compliance counsel before mainnet deployment.
**Resolution required:** Compliance counsel confirms `AVALANCHE_MAINNET_COUNTRY_CODES=840` is approved, or provides a modified list with written justification. List is set in the deploy environment before running the script.
**Owner:** Compliance counsel
**Note:** setAllowAll is not present in the deploy script. Additional countries cannot be added without a separate compliance approval.

---

### B02 — G07: Production Transfer Cap Not Approved

**Gate:** G07
**Status:** BLOCKING
**Description:** The mainnet deploy script defaults to `AVALANCHE_MAINNET_TRANSFER_LIMIT_RAW=100_000_000_000` (100,000 AXUSD per wallet per day). This must be confirmed by product and compliance teams before deployment.
**Resolution required:** Product and compliance sign off on the 100,000 AXUSD/day default or provide an alternate value. Value is set in the deploy environment before running the script.
**Owner:** Product + Compliance

---

### B03 — G10: LIVE TRANSFER Not Proven on Fuji

**Gate:** G10
**Status:** BLOCKING
**Description:** LIVE MINT has been proven on Fuji (2× on-chain tx). LIVE TRANSFER has been coded (invariant H in the proof script) but not yet executed in LIVE mode. The gate requires a confirmed on-chain TRANSFER tx.
**Resolution required:** Run the proof script with `AVALANCHE_ADAPTER_MODE=LIVE` and `AVALANCHE_ADAPTER_LIVE_ALLOWLIST` including the AXUSD-FUJI contract. Record the tx hash and Snowtrace link in the G10 section of the promotion gates doc.
**Command:**
```
AVALANCHE_ADAPTER_MODE=LIVE \
AVALANCHE_ADAPTER_LIVE_ALLOWLIST=AXUSD-FUJI \
AVALANCHE_RPC_URL=<fuji-rpc> \
MULTICHAIN_ENABLED=true CHAIN_AVALANCHE_ENABLED=true \
ADMIN_SOLVENCY_KEY=<key> npx tsx scripts/vault-sprint-avalanche-fuji.ts
```
**Owner:** Engineering

---

### B04 — G11: Incident Response Plan Not Accepted by Operations Leadership

**Gate:** G11
**Status:** BLOCKING
**Description:** `documents/operations/INCIDENT_RESPONSE_PLAN.md` is complete. It has not been formally accepted by operations leadership. The plan cannot be treated as operational until accepted.
**Resolution required:** Route the document to operations leadership for review and sign-off. File acceptance confirmation (email, signed memo, or internal approval record) and update the G11 section of the promotion gates doc with the acceptance date and approver name.
**Owner:** Operations leadership

---

### B05 — G12: Reserve Reconciliation Model Not Yet Test-Run on Fuji

**Gate:** G12
**Status:** BLOCKING
**Description:** `documents/operations/RESERVE_RECONCILIATION_MODEL.md` documents the reconciliation process, SQL queries, tolerance thresholds, and daily cron spec. An actual Fuji test run has not been executed and no output report exists.
**Resolution required:** Execute the reconciliation script (or its manual equivalent) against Fuji. File the JSON output report under `documents/operations/fuji-reconciliation-YYYY-MM-DD.json`. Update G12 in the promotion gates doc.
**Owner:** Engineering + Operations

---

## Accepted / Deferred Items (Not Blocking Deploy)

These items were formally deferred. They do not block mainnet deploy but must be resolved before significant TVL.

| Item | Gate | Decision | Post-Launch Action |
|---|---|---|---|
| Gnosis Safe — DEFAULT_ADMIN role | G03 | DEFERRED — Deployer EOA retained | Deploy Safe; migrate DEFAULT_ADMIN; deployer renounces |
| Ops key — AGENT role | G04 | DEFERRED — Deployer EOA retained | Define ops address; migrate AGENT_ROLE |
| Issuance process — MINTER role | G05 | DEFERRED — Deployer EOA retained | Define issuance process; migrate MINTER_ROLE |
| Deployer EOA role renunciation | G06 | DEFERRED — Pending G03/G04/G05 | Execute renunciation checklist in G06 section |
| External security audit | G08 | DEFERRED — Internal Gate 6 review as compensating control | Engage external firm; remediate all critical/high findings; file report under `documents/audits/` |

---

## Deploy Readiness Checklist

Run this checklist immediately before executing `deploy:avalanche:mainnet`:

- [ ] B01 resolved: `AVALANCHE_MAINNET_COUNTRY_CODES` confirmed by compliance counsel
- [ ] B02 resolved: Transfer cap value approved by product and compliance
- [ ] B03 resolved: G10 LIVE TRANSFER tx hash documented
- [ ] B04 resolved: G11 incident response plan accepted — approver and date on file
- [ ] B05 resolved: G12 Fuji reconciliation test run filed
- [ ] `AVALANCHE_PHASE2_MAINNET_DEPLOY=true` set deliberately (not accidentally)
- [ ] `MULTICHAIN_ENABLED=true` and `CHAIN_AVALANCHE_ENABLED=true` set only in deploy env
- [ ] `AVALANCHE_DEPLOYER_PRIVATE_KEY` is a dedicated mainnet key (not shared with any other env)
- [ ] Second operator present to observe and confirm deploy sequence
- [ ] `deployments/avalanche/mainnet-phase1.json` does not already exist (clean deploy)
- [ ] Post-deploy: Deployer key moved to cold storage immediately
