# Axiom Protocol — Avalanche C-Chain Mainnet Deploy Authorization

**Document type:** Deploy Authorization Memo  
**Network:** Avalanche C-Chain Mainnet (chainId 43114)  
**Created:** 2026-05-14  
**Status:** PENDING SIGN-OFF — awaiting three-party authorization  
**Required before:** First transaction broadcast on Avalanche C-Chain mainnet

---

## Purpose

This memo constitutes the formal authorization to proceed with the Avalanche C-Chain mainnet deployment of the Axiom Protocol ERC-3643 compliance stack. Per `AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md §Sign-Off Requirements`, three sign-offs are required before any mainnet transaction is broadcast:

1. **Technical Lead** — confirms on-chain state matches all gate criteria
2. **Operations Lead** — confirms operational readiness (G11, G12)
3. **Compliance Counsel** — confirms G02 (jurisdiction allowlist) and G08 (security review)

No mainnet deploy command should be executed until all three sign-offs are recorded below.

---

## Gate Attestation Summary

All 12 Avalanche mainnet promotion gates are satisfied or formally accepted. The full evidence record is in `AXIOM_AVALANCHE_MAINNET_READINESS_RECONCILIATION.md`.

| Gate | Description | Status | Evidence |
|---|---|---|---|
| G01 | Fuji smoke tests 15/15 | ✓ SATISFIED | `AXIOM_AVALANCHE_FUJI_SMOKE_REPORT.md` — 15/15, 0 failures |
| G02 | Per-jurisdiction allowlist — US only (840) | ✓ SATISFIED | `AXIOM_AVALANCHE_G02_COMPLIANCE_CONFIRMATION.md` |
| G03 | DEFAULT_ADMIN → Gnosis Safe | ✓ DEFERRED | Deployer EOA retained; Safe migration post-launch |
| G04 | AGENT role → ops address | ✓ DEFERRED | Deployer EOA retained; migration post-launch |
| G05 | MINTER role → issuance process | ✓ DEFERRED | Deployer EOA retained; migration post-launch |
| G06 | Deployer EOA role renunciation | ✓ DEFERRED | Pending G03/G04/G05 migration |
| G07 | Production transfer cap 5,000 AXUSD/day | ✓ SATISFIED | `AXIOM_AVALANCHE_G07_TRANSFER_CAP_APPROVAL.md` |
| G08 | External security audit | ✓ DEFERRED | Internal Gate 6 review as compensating control; external audit before significant TVL |
| G09 | Capinfra AVALANCHE adapter DRY_RUN | ✓ SATISFIED | `AXIOM_AVALANCHE_CAPINFRA_GATE5_REPORT.md` |
| G10 | Capinfra AVALANCHE adapter LIVE dispatch | ✓ SATISFIED | tx `0x412745bf…9353909` block 55332594 |
| G11 | Incident response plan | ✓ SATISFIED | `INCIDENT_RESPONSE_ACCEPTANCE.md` — accepted 2026-05-14 |
| G12 | Reserve reconciliation model | ✓ SATISFIED | `reconciliation-reports/2026-05-14-fuji.json` + analysis |

---

## Deploy Configuration

The following configuration will be used for the mainnet deployment. Any deviation from these values requires this memo to be updated and re-signed.

| Parameter | Value | Approved by |
|---|---|---|
| `AVALANCHE_MAINNET_COUNTRY_CODES` | `840` (United States only) | G02 — Compliance Counsel |
| `AVALANCHE_MAINNET_TRANSFER_LIMIT_RAW` | `5000000000` (5,000 AXUSD/day at 6 decimals) | G07 — Product + Compliance |
| `AVALANCHE_PHASE2_MAINNET_DEPLOY` | `true` (set only at time of deploy) | This memo |
| `MULTICHAIN_ENABLED` | `true` (set only at time of deploy) | This memo |
| `CHAIN_AVALANCHE_ENABLED` | `true` (set only at time of deploy) | This memo |
| `AVALANCHE_DEPLOYER_PRIVATE_KEY` | Dedicated mainnet key (distinct from `DEPLOYER_PRIVATE_KEY`) | Operations Lead |
| Deploy script | `scripts/deploy/avalanche/deploy-phase1-mainnet.mts` | Technical Lead |
| Output manifest | `deployments/avalanche/mainnet-phase1.json` | Technical Lead |

---

## Pre-Deploy Checklist

Complete all items immediately before executing the deploy command. Do not proceed if any item is unchecked.

**Technical:**
- [ ] Fuji smoke tests re-run immediately before deploy — all 15/15 pass (G01 regression)
- [ ] `AVALANCHE_DEPLOYER_PRIVATE_KEY` is set and is distinct from `DEPLOYER_PRIVATE_KEY`
- [ ] `deployments/avalanche/mainnet-phase1.json` does NOT exist (clean deploy)
- [ ] Deploy script dry-run passes: `npm run deploy:avalanche:mainnet` (without the unlock flag)
- [ ] Deployer EOA has sufficient AVAX balance for 8 contract deploys + wiring transactions (estimate 0.5–1.5 AVAX at standard gas)

**Operational:**
- [ ] Second operator is present and observing the deploy sequence
- [ ] Incident response plan is accessible (`documents/operations/INCIDENT_RESPONSE_PLAN.md`)
- [ ] On-call engineer confirmed available for the 2 hours following deploy
- [ ] Capinfra AVALANCHE adapter is active and will record the first mainnet MINT as a SETTLED instruction

**Post-deploy (within 24 hours):**
- [ ] All 8 contract addresses recorded in `AVALANCHE_CONTRACTS` in `shared/contracts-avalanche.ts`
- [ ] Mainnet smoke tests run against deployed contracts
- [ ] Capinfra daily reconciliation cron registered (G12 — `scripts/reconcile-avalanche-reserve.ts`)
- [ ] Deployer key moved to cold storage immediately after deploy and wiring confirmed
- [ ] Explorer verification confirmed on Snowtrace mainnet
- [ ] Internal deployment announcement sent with contract addresses

---

## Deferred Gate Commitments

By signing this memo, the signatories confirm that the following post-launch actions are REQUIRED before Axiom Protocol expands AXUSD supply on Avalanche beyond the initial launch period:

1. **G03/G04/G05/G06 — Role migration:** Deploy a Gnosis Safe; migrate DEFAULT_ADMIN, AGENT, and MINTER roles; deployer EOA renounces all roles. Timeline: before 30 days post-launch or before AXUSD supply exceeds 500,000 AXUSD on Avalanche, whichever comes first.
2. **G08 — External audit:** Engage an external security firm to review AxiomStable3643, ModularCompliance, CountryAllowModule, and TransferLimitModule. Timeline: before AXUSD supply on Avalanche exceeds 1,000,000 AXUSD.

---

## Sign-Off Record

### Sign-Off 1 — Technical Lead

**Attestation:** I confirm that all satisfied gates (G01, G02, G07, G09, G10, G11, G12) are evidenced by the artifacts listed above, that the deploy script configuration matches this memo, and that the codebase is in a state ready for mainnet deployment.

| Field | Value |
|---|---|
| Name | |
| Role | Technical Lead |
| Date | |
| Signature / initials | |

---

### Sign-Off 2 — Operations Lead

**Attestation:** I confirm that the incident response plan (G11) and reserve reconciliation model (G12) are operationally sound, that an on-call engineer is available for the deploy window, and that the deployer key custody plan is in place.

| Field | Value |
|---|---|
| Name | |
| Role | Operations Lead |
| Date | |
| Signature / initials | |

---

### Sign-Off 3 — Compliance Counsel

**Attestation:** I confirm that the jurisdiction allowlist (G02 — United States only, code 840) is approved for the initial mainnet launch, that the deferred external audit (G08) is understood and scheduled, and that the AXUSD issuance on Avalanche is authorized under the current compliance framework.

| Field | Value |
|---|---|
| Name | |
| Role | Compliance Counsel |
| Date | |
| Signature / initials | |

---

## Deploy Command

Once all three sign-offs are recorded above, execute from the repository root:

```bash
AVALANCHE_PHASE2_MAINNET_DEPLOY=true \
MULTICHAIN_ENABLED=true \
CHAIN_AVALANCHE_ENABLED=true \
AVALANCHE_DEPLOYER_PRIVATE_KEY=<dedicated-mainnet-key> \
npm run deploy:avalanche:mainnet
```

**Do not execute this command until:**
1. All three sign-offs above are completed
2. All pre-deploy checklist items above are checked
3. A second operator is present

---

*Axiom Protocol Internal — Deploy Authorization — 2026-05-14*
