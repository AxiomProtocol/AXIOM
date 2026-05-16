# Axiom Protocol — Avalanche Mainnet Promotion Gates

**Version:** 1.0.0  
**Network target:** Avalanche C-Chain Mainnet (chainId 43114)  
**Last updated:** 2026-05-13 (Task #482)  
**Current status:** 1 of 12 gates satisfied (Fuji smoke tests)  

---

## Purpose

This document defines the complete set of requirements that must be satisfied before the Axiom Protocol ERC-3643 compliance stack is deployed to Avalanche C-Chain mainnet (chainId 43114). No mainnet deployment should begin until every gate is marked complete and verified by a second operator.

---

## Gate Summary

| # | Gate | Status |
|---|---|---|
| G01 | All Fuji smoke tests pass (15/15) | ✓ SATISFIED |
| G02 | Replace setAllowAll with per-jurisdiction allowlist | ○ OPEN |
| G03 | Assign DEFAULT_ADMIN role to Gnosis Safe | ○ OPEN |
| G04 | Assign AGENT role to controlled operations address | ○ OPEN |
| G05 | Assign MINTER role to controlled issuance process | ○ OPEN |
| G06 | Deployer EOA renounces all roles | ○ OPEN |
| G07 | Set production TransferLimitModule cap | ○ OPEN |
| G08 | External security review signed off | ○ OPEN |
| G09 | Capinfra AVALANCHE adapter DRY_RUN tested | ○ OPEN |
| G10 | Capinfra AVALANCHE adapter LIVE dispatch tested | ○ OPEN |
| G11 | Incident response plan complete | ○ OPEN |
| G12 | Reserve and reconciliation model complete | ○ OPEN |

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

**Status:** ○ OPEN

**Background:**  
The Fuji deployment calls `CountryAllowModule.setAllowAll(MC, true)`, which disables country-based compliance checks entirely. This is a testnet shortcut only. On mainnet, AXUSD transfers must be restricted to wallets associated with approved jurisdictions.

**Acceptance criteria:**
- `setAllowAll(MC, true)` is NOT called during the mainnet deployment script.
- `setAllowedCountry(MC, countryCode, true)` is called for each approved jurisdiction (using ISO 3166-1 numeric codes).
- The jurisdiction allowlist is documented and approved by compliance counsel.
- Smoke tests verify that wallets with unapproved country codes are blocked.

**Dependencies:** Legal/compliance team must define the jurisdiction allowlist before this gate can be satisfied.

---

### G03 — Assign DEFAULT_ADMIN Role to Gnosis Safe

**Status:** ○ OPEN

**Background:**  
On Fuji, the deployer EOA (`0x8d7892…C96`) holds DEFAULT_ADMIN_ROLE on all 8 contracts. This gives a single key the ability to grant or revoke any role, pause the token, and modify compliance configuration. This is not acceptable for mainnet.

**Acceptance criteria:**
- A Gnosis Safe is deployed on Avalanche C-Chain mainnet.
- The Safe address is documented and confirmed operational (at least one test transaction signed).
- DEFAULT_ADMIN_ROLE is granted to the Safe on all 8 contracts.
- Each grant is confirmed on-chain and verified via `hasRole(ADMIN_ROLE, safeAddress)`.
- Deployer EOA renounces DEFAULT_ADMIN_ROLE on all 8 contracts (covered by G06).

**Safe configuration:**
- Minimum signer threshold: 2 of N (threshold and N to be defined in Operations Security Policy).
- Safe must be funded with AVAX for gas.

---

### G04 — Assign AGENT Role to Controlled Operations Address

**Status:** ○ OPEN

**Background:**  
On Fuji, the deployer EOA holds AGENT_ROLE on both IdentityRegistry and AxiomStable3643Fuji. Agent permissions include: registering identities, adding agents, and freezing/unfreezing wallets. These must be held by a controlled address in production.

**Acceptance criteria:**
- AGENT_ROLE is granted to an operations address (Gnosis Safe or a dedicated operations key with documented custody).
- The operations address is confirmed operational.
- Deployer EOA's AGENT_ROLE is revoked after the new agent is verified.
- Role assignment is confirmed on both IdentityRegistry and AxiomStable3643Fuji.

---

### G05 — Assign MINTER Role to Controlled Issuance Process

**Status:** ○ OPEN

**Background:**  
On Fuji, the deployer EOA holds MINTER_ROLE and can mint AXUSD without restriction. In production, minting must be controlled by a defined issuance process with multi-party authorization.

**Acceptance criteria:**
- MINTER_ROLE is granted to a Safe or a smart contract that enforces multi-party authorization for mint operations.
- Minting process is documented (who can authorize, how mints are requested, how they are executed).
- Deployer EOA's MINTER_ROLE is revoked after the new minter is verified.
- Test mint via the new minter process succeeds before mainnet go-live.

---

### G06 — Deployer EOA Renounces All Roles

**Status:** ○ OPEN

**Depends on:** G03, G04, G05 (all three roles must be transferred first)

**Background:**  
After all roles are transferred to Safe or controlled addresses, the deployer EOA must renounce its own roles. If the deployer retains any role, a key compromise creates a critical security incident.

**Acceptance criteria:**
- `hasRole(DEFAULT_ADMIN_ROLE, deployerEOA)` returns `false` on all 8 contracts.
- `hasRole(AGENT_ROLE, deployerEOA)` returns `false` on IdentityRegistry and AxiomStable3643Fuji.
- `hasRole(MINTER_ROLE, deployerEOA)` returns `false` on AxiomStable3643Fuji.
- Verification performed and signed off by a second operator.
- Deployer EOA private key is decommissioned or placed into cold storage.

---

### G07 — Set Production TransferLimitModule Cap

**Status:** ○ OPEN

**Background:**  
On Fuji, the TransferLimitModule limit was set to 200 AXUSD during smoke test T11 and then reset to 0 (unlimited). A limit of 0 means unlimited — this is not acceptable for production.

**Acceptance criteria:**
- A production daily transfer cap is defined (in consultation with compliance and product teams).
- The cap is set via `TransferLimitModule.setTransferLimit(MC, limit)` during mainnet post-deploy wiring.
- The cap is verified on-chain: `getTransferLimit(MC)` returns the expected value.
- The cap is documented in the mainnet deployment manifest.

**Note:** The transfer limit applies per-wallet per day. Set a value appropriate for the expected AXUSD transaction volume.

---

### G08 — External Security Review Signed Off

**Status:** ○ OPEN

**Acceptance criteria:**
- An external security firm has reviewed the ERC-3643 contract code deployed on Fuji.
- Review scope includes: AxiomStable3643Fuji, ModularCompliance, CountryAllowModule, TransferLimitModule.
- All critical and high findings are remediated.
- The signed-off report is filed under `documents/audits/`.
- Any accepted risk items are documented with business justification.

---

### G09 — Capinfra AVALANCHE Adapter DRY_RUN Tested

**Status:** ○ OPEN

**Background:**  
The Capinfra settlement engine dispatches token operations (mint, burn, transfer) through network-specific adapters. The AVALANCHE adapter must be wired to the live Fuji contracts and tested in DRY_RUN mode before LIVE dispatch is enabled.

**Acceptance criteria:**
- Capinfra AVALANCHE adapter config is updated with `FUJI_CONTRACTS` addresses from `shared/contracts-avalanche.ts`.
- DRY_RUN mode dispatch returns the expected receipt shape without broadcasting any transaction.
- The two remaining checklist items in `documents/chains/AXIOM_AVALANCHE_FUJI_CHECKLIST.md` (Capinfra DRY_RUN and LIVE) are ticked.

---

### G10 — Capinfra AVALANCHE Adapter LIVE Dispatch Tested

**Status:** ○ OPEN

**Depends on:** G09

**Acceptance criteria:**
- LIVE dispatch mode successfully mints 1 AXUSD on Fuji and returns a confirmed transaction hash.
- The transaction is verified on Snowtrace.
- A second dispatch (transfer) is tested to confirm non-mint operations work.
- Test results are documented and filed.

---

### G11 — Incident Response Plan Complete

**Status:** ○ OPEN

**Acceptance criteria:**
- A documented incident response plan exists for the Avalanche compliance stack.
- The plan covers: contract pause, account freeze, role compromise, RPC outage, compliance module failure, reserve discrepancy.
- Roles and responsibilities are assigned for each incident type.
- Contact escalation chain is defined.
- Plan is reviewed and accepted by operations leadership.
- Filed under `documents/operations/INCIDENT_RESPONSE_PLAN.md`.

---

### G12 — Reserve and Reconciliation Model Complete

**Status:** ○ OPEN

**Background:**  
AXUSD issued on Avalanche must be reconciled against the reserve position on Arbitrum One (or wherever the canonical reserve is held). Without a reconciliation model, the total AXUSD supply across chains may diverge from the backing reserve.

**Acceptance criteria:**
- A reserve reconciliation model is defined for Avalanche AXUSD.
- The model specifies: reconciliation frequency, acceptable tolerance, reporting format, escalation threshold.
- The model is implemented in Capinfra or equivalent system.
- A test reconciliation report is generated and reviewed before mainnet.
- Filed under `documents/operations/RESERVE_RECONCILIATION_MODEL.md`.

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
3. Capinfra LIVE dispatch tested against mainnet.
4. Operations status page updated or a new `/operations/avalanche-status` page deployed for mainnet.
5. Explorer verification confirmed on Snowtrace mainnet.
6. Internal deployment announcement sent with contract addresses and verification links.

---

*Axiom Protocol Internal — Task #482*
