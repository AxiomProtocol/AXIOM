# Axiom Protocol — Avalanche Post-Launch Status

**Document type:** Phase E — Gate Status Correction  
**Network:** Avalanche C-Chain Mainnet (chainId 43114)  
**Created:** 2026-05-14  
**Version:** 1.3.0  
**Status:** POST-LAUNCH RESTRICTED MODE — active  

---

## Current Operational Mode

**AVALANCHE MAINNET: POST-LAUNCH RESTRICTED MODE**

- Mainnet deployment executed: 2026-05-14, block 85375788
- All 8 ERC-3643 contracts live and wired on chainId 43114
- No public user flows activated
- No production minting occurred (totalSupply = 0)
- Deferred controls remain mandatory before meaningful TVL
- Mainnet is NOT fully unrestricted — see gate table below

---

## Gate Status (Corrected — v1.3.0)

> Previous summary language ("12 of 12 CLOSED") was accurate for deploy authorization
> purposes (all gates were either satisfied or formally accepted/deferred before deploy).
> This document corrects the language to reflect actual post-deploy operational status.

| Gate | Description | Status | Evidence / Note |
|---|---|---|---|
| G01 | Fuji smoke tests 15/15 pass | **SATISFIED** | `AXIOM_AVALANCHE_FUJI_SMOKE_REPORT.md` — 15/15, 0 failures |
| G02 | Per-jurisdiction allowlist — US only (840) | **SATISFIED** | On-chain verified 2026-05-14: `isCountryAllowed(MC, 840) = true`; UK/DE = false |
| G03 | DEFAULT_ADMIN role → Gnosis Safe | **DEFERRED_POST_LAUNCH** | Deployer EOA retained. Safe not yet deployed on Avalanche mainnet. |
| G04 | AGENT_ROLE → dedicated ops address | **DEFERRED_POST_LAUNCH** | Deployer EOA is current agent. Migration required before TVL. |
| G05 | MINTER_ROLE → issuance process | **DEFERRED_POST_LAUNCH** | Deployer EOA retains minter role. Migration required before TVL. |
| G06 | Deployer EOA role renunciation | **DEFERRED_POST_LAUNCH** | Blocked by G03/G04/G05. Renunciation executes after all role migrations. |
| G07 | Production transfer cap 5,000 AXUSD/day | **SATISFIED** | On-chain verified 2026-05-14: `getTransferLimit(MC) = 5000000000 raw` |
| G08 | External security audit | **PENDING_EXTERNAL** | Internal Gate 6 review as compensating control. External firm not yet engaged. Required before significant TVL. |
| G09 | Capinfra AVALANCHE adapter dry-run | **SATISFIED** | `AXIOM_AVALANCHE_CAPINFRA_GATE5_REPORT.md` — DRY_RUN confirmed |
| G10 | Capinfra AVALANCHE adapter LIVE dispatch | **SATISFIED** | tx `0x412745bf…9353909` block 55332594 — Fuji LIVE transfer confirmed |
| G11 | Incident response plan accepted | **SATISFIED** | `INCIDENT_RESPONSE_ACCEPTANCE.md` — accepted 2026-05-14 |
| G12 | Reserve reconciliation model complete | **SATISFIED** | Script deployed, Fuji baseline filed. **PENDING_OPERATIONAL**: mainnet cron not yet scheduled. |

---

## Gate Status Counts (Corrected)

| Category | Count | Gates |
|---|---|---|
| SATISFIED | 7 | G01, G02, G07, G09, G10, G11, G12 (baseline) |
| DEFERRED_POST_LAUNCH | 4 | G03, G04, G05, G06 |
| PENDING_EXTERNAL | 1 | G08 |
| PENDING_OPERATIONAL | 1 | G12 (mainnet cron) |
| BLOCKED | 0 | — |

**7 SATISFIED / 4 DEFERRED / 1 PENDING_EXTERNAL / 1 PENDING_OPERATIONAL / 0 BLOCKED**

---

## What "Post-Launch Restricted Mode" Means

| Capability | Status |
|---|---|
| Contracts deployed and wired on mainnet | ✓ ACTIVE |
| Compliance modules enforced (G02, G07) | ✓ ACTIVE |
| Capinfra AVALANCHE adapter live | ✓ ACTIVE |
| Daily reconciliation cron | ✗ NOT YET RUNNING |
| Public user minting flows | ✗ NOT ACTIVATED |
| Role control via Gnosis Safe | ✗ NOT YET DEPLOYED |
| External audit complete | ✗ NOT YET CONDUCTED |
| Snowtrace source verification | ✗ NOT YET SUBMITTED |
| Deployer key in cold storage | ⚠ REQUIRED IMMEDIATELY |

---

## Conditions Required to Exit Restricted Mode

All of the following must be satisfied before Avalanche mainnet exits restricted mode:

1. **R01 — Role migration complete**: DEFAULT_ADMIN, AGENT_ROLE, MINTER_ROLE migrated to Gnosis Safe. Deployer EOA renounces all roles. Closes G03, G04, G05, G06.
2. **R02 — External audit complete**: Signed report from recognized EVM security firm. Closes G08.
3. **R03 — Deployer key cold storage**: Key moved immediately; eliminated from roles via R01.
4. **R04 — Reconciliation cron running**: Daily automated reconciliation at 00:00 UTC against mainnet. Closes G12 operational item.
5. **R05 — Snowtrace verification**: All 8 contracts verified within 7 days.

---

## Immediate Required Actions (Ordered by Priority)

| Priority | Action | Owner | Deadline |
|---|---|---|---|
| P0 | Move `DEPLOYER_PRIVATE_KEY` to cold storage | Operations Lead | TODAY |
| P1 | Schedule daily reconciliation cron against mainnet | Technical Lead | Before first mint |
| P2 | Deploy Gnosis Safe on Avalanche mainnet | Technical Lead | Before TVL |
| P3 | Migrate DEFAULT_ADMIN, AGENT, MINTER roles to Safe | Technical Lead + Ops | Before TVL |
| P4 | Deployer EOA renounces all roles | Technical Lead | After P3 |
| P5 | Engage external EVM security firm | Operations Lead | Before TVL |
| P6 | Submit all 8 contracts to Snowtrace | Technical Lead | Within 7 days |
| P7 | Backfill tx hashes in mainnet-phase1.json | Technical Lead | Within 30 days |

---

## Arbitrum Canonical Behavior

This document covers Avalanche only. Arbitrum One remains the canonical settlement chain for Axiom Protocol. No changes to Arbitrum behavior, contracts, or rails were made as part of the Avalanche mainnet deployment.

---

*Axiom Protocol Internal — supersedes promotion gate summary language as of 2026-05-14*
