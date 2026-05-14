# Axiom Protocol — Avalanche Mainnet Promotion Gates

**Version:** 1.1.0  
**Network target:** Avalanche C-Chain Mainnet (chainId 43114)  
**Last updated:** 2026-05-14 (G09 SATISFIED; G10 IN PROGRESS; G11/G12 DOCUMENT COMPLETE; G02/G07 CODE READY)  
**Current status:** 2 of 12 gates satisfied (G01, G09); 4 in progress (G02, G07, G10, G11, G12 pending final criteria); 5 require external real-world action (G03–G06, G08)

---

## Purpose

This document defines the complete set of requirements that must be satisfied before the Axiom Protocol ERC-3643 compliance stack is deployed to Avalanche C-Chain mainnet (chainId 43114). No mainnet deployment should begin until every gate is marked complete and verified by a second operator.

---

## Gate Summary

| # | Gate | Status |
|---|---|---|
| G01 | All Fuji smoke tests pass (15/15) | ✓ SATISFIED |
| G02 | Replace setAllowAll with per-jurisdiction allowlist | ◑ CODE READY — pending compliance counsel |
| G03 | Assign DEFAULT_ADMIN role to Gnosis Safe | ○ OPEN — requires mainnet Gnosis Safe |
| G04 | Assign AGENT role to controlled operations address | ○ OPEN — requires on-chain tx |
| G05 | Assign MINTER role to controlled issuance process | ○ OPEN — requires on-chain tx |
| G06 | Deployer EOA renounces all roles | ○ OPEN — depends on G03/G04/G05 |
| G07 | Set production TransferLimitModule cap | ◑ CAP DEFINED — pending mainnet deployment |
| G08 | External security review signed off | ○ OPEN — requires external firm |
| G09 | Capinfra AVALANCHE adapter DRY_RUN tested | ✓ SATISFIED |
| G10 | Capinfra AVALANCHE adapter LIVE dispatch tested | ◑ IN PROGRESS — MINT proven; TRANSFER DRY_RUN proven |
| G11 | Incident response plan complete | ◑ DOCUMENT COMPLETE — pending ops leadership acceptance |
| G12 | Reserve and reconciliation model complete | ◑ DOCUMENT COMPLETE — pending test reconciliation run |

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

**Status:** ◑ CODE READY — mainnet deploy script implements per-jurisdiction `setAllowedCountry`. Pending: compliance counsel must define and approve the `AVALANCHE_MAINNET_COUNTRY_CODES` list.

**Background:**  
The Fuji deployment calls `CountryAllowModule.setAllowAll(MC, true)`, which disables country-based compliance checks entirely. This is a testnet shortcut only. On mainnet, AXUSD transfers must be restricted to wallets associated with approved jurisdictions.

**What was built:**  
`scripts/deploy/avalanche/deploy-phase1-mainnet.mts` implements the per-jurisdiction allowlist mechanism:
- Reads `AVALANCHE_MAINNET_COUNTRY_CODES` env var (comma-separated ISO 3166-1 numeric codes).
- Calls `setAllowedCountry(MC, code, true)` for each approved code.
- `setAllowAll` is explicitly absent — it is NOT called anywhere in the mainnet script.
- The mainnet script rejects a real deploy if `AVALANCHE_MAINNET_COUNTRY_CODES` is empty.

**Acceptance criteria:**
- `setAllowAll(MC, true)` is NOT called during the mainnet deployment script. ✓ (verified in code)
- `setAllowedCountry(MC, countryCode, true)` is called for each approved jurisdiction. ✓ (implemented)
- The jurisdiction allowlist is documented and approved by compliance counsel. ○ PENDING
- Smoke tests verify that wallets with unapproved country codes are blocked. ○ PENDING (post-deploy)

**Dependencies:** Compliance counsel must define and sign off on the `AVALANCHE_MAINNET_COUNTRY_CODES` list before mainnet deployment.

---

### G03 — Assign DEFAULT_ADMIN Role to Gnosis Safe

**Status:** ○ OPEN — requires Gnosis Safe deployed on Avalanche C-Chain mainnet

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

**Blocker:** No mainnet contracts exist yet. G03 cannot be satisfied until the mainnet deployment script runs successfully.

---

### G04 — Assign AGENT Role to Controlled Operations Address

**Status:** ○ OPEN — requires on-chain role assignment after mainnet deployment

**Background:**  
On Fuji, the deployer EOA holds AGENT_ROLE on both IdentityRegistry and AxiomStable3643Fuji. Agent permissions include: registering identities, adding agents, and freezing/unfreezing wallets. These must be held by a controlled address in production.

**Acceptance criteria:**
- AGENT_ROLE is granted to an operations address (Gnosis Safe or a dedicated operations key with documented custody).
- The operations address is confirmed operational.
- Deployer EOA's AGENT_ROLE is revoked after the new agent is verified.
- Role assignment is confirmed on both IdentityRegistry and AxiomStable3643.

---

### G05 — Assign MINTER Role to Controlled Issuance Process

**Status:** ○ OPEN — requires on-chain role assignment after mainnet deployment

**Background:**  
On Fuji, the deployer EOA holds MINTER_ROLE and can mint AXUSD without restriction. In production, minting must be controlled by a defined issuance process with multi-party authorization.

**Acceptance criteria:**
- MINTER_ROLE is granted to a Safe or a smart contract that enforces multi-party authorization for mint operations.
- Minting process is documented (who can authorize, how mints are requested, how they are executed).
- Deployer EOA's MINTER_ROLE is revoked after the new minter is verified.
- Test mint via the new minter process succeeds before mainnet go-live.

---

### G06 — Deployer EOA Renounces All Roles

**Status:** ○ OPEN — depends on G03, G04, G05

**Depends on:** G03, G04, G05 (all three roles must be transferred first)

**Background:**  
After all roles are transferred to Safe or controlled addresses, the deployer EOA must renounce its own roles. If the deployer retains any role, a key compromise creates a critical security incident.

**Acceptance criteria:**
- `hasRole(DEFAULT_ADMIN_ROLE, deployerEOA)` returns `false` on all 8 contracts.
- `hasRole(AGENT_ROLE, deployerEOA)` returns `false` on IdentityRegistry and AxiomStable3643.
- `hasRole(MINTER_ROLE, deployerEOA)` returns `false` on AxiomStable3643.
- Verification performed and signed off by a second operator.
- Deployer EOA private key is decommissioned or placed into cold storage.

---

### G07 — Set Production TransferLimitModule Cap

**Status:** ◑ CAP DEFINED — cap mechanism implemented in mainnet deploy script; pending mainnet deployment and compliance/product sign-off on the cap value.

**Background:**  
On Fuji, the TransferLimitModule limit was set to 200 AXUSD during smoke test T11 and then reset to 0 (unlimited). A limit of 0 means unlimited — this is not acceptable for production.

**What was built:**  
`scripts/deploy/avalanche/deploy-phase1-mainnet.mts` implements G07:
- Reads `AVALANCHE_MAINNET_TRANSFER_LIMIT_RAW` env var (6-decimal integer).
- Default if unset: `100_000_000_000` = 100,000 AXUSD per wallet per day.
- Calls `TransferLimitModule.setTransferLimit(MC, limitRaw)` during post-deploy wiring.
- Records `transferLimitRaw` and `transferLimitAxusd` in the deployment manifest.

**Acceptance criteria:**
- A production daily transfer cap is defined (in consultation with compliance and product teams). ◑ Default 100,000 AXUSD proposed; awaiting sign-off
- The cap is set via `TransferLimitModule.setTransferLimit(MC, limit)` during mainnet post-deploy wiring. ✓ (implemented in script)
- The cap is verified on-chain: `getTransferLimit(MC)` returns the expected value. ○ PENDING (post-deploy)
- The cap is documented in the mainnet deployment manifest. ✓ (script writes to manifest)

**Note:** The transfer limit applies per-wallet per day. Adjust `AVALANCHE_MAINNET_TRANSFER_LIMIT_RAW` before deployment to match the approved cap.

---

### G08 — External Security Review Signed Off

**Status:** ○ OPEN — requires engagement with an external security firm

**Note:** The internal Gate 6 security review (`AXIOM_AVALANCHE_GATE6_SECURITY_REVIEW.md`) was completed 2026-05-14 and covers the capinfra adapter, dispatcher, settlement routing, migration, and proof script. It is a prerequisite input for G08 but does not satisfy it. G08 requires an external security firm review of the ERC-3643 smart contracts.

**Acceptance criteria:**
- An external security firm has reviewed the ERC-3643 contract code deployed on Fuji.
- Review scope includes: AxiomStable3643 (mainnet contract), AxiomStable3643Fuji (Fuji equivalent), ModularCompliance, CountryAllowModule, TransferLimitModule.
- All critical and high findings are remediated.
- The signed-off report is filed under `documents/audits/`.
- Any accepted risk items are documented with business justification.

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

**Status:** ◑ IN PROGRESS — LIVE MINT proven × 2 on-chain; TRANSFER proven in DRY_RUN mode (structural dispatch path); LIVE TRANSFER pending.

**Depends on:** G09 ✓

**Evidence so far:**
- LIVE MINT txHash 1: `0xf10d156a9328b9c4ad32f7bd6dd1df143f92449a270146b209c2129ddb69ef8c` — confirmed, status=1, Fuji
- LIVE MINT txHash 2: `0x738a90c5f3d6c1f37a133947e598155e58b92b7123ae6a575b00f06700b662ee` — confirmed, status=1, Fuji
- Invariant H (added 2026-05-14): TRANSFER instruction dispatched through AVALANCHE adapter in DRY_RUN; dispatch returns valid synthetic receipt, proving the TRANSFER code path is correctly wired

**Remaining criterion:**
- "A second dispatch (transfer) is tested to confirm non-mint operations work" — TRANSFER dispatch path proven structurally (Invariant H DRY_RUN); a LIVE on-chain TRANSFER test is recommended before mainnet go-live (run proof script with `AVALANCHE_ADAPTER_MODE=LIVE` — Invariant H2).

**How to fully close G10:**
```bash
AVALANCHE_ADAPTER_MODE=LIVE \
AVALANCHE_ADAPTER_LIVE_ALLOWLIST=AXUSD-FUJI \
AVALANCHE_RPC_URL=<fuji-rpc> \
MULTICHAIN_ENABLED=true \
CHAIN_AVALANCHE_ENABLED=true \
ADMIN_SOLVENCY_KEY=<key> \
npx tsx scripts/vault-sprint-avalanche-fuji.ts
# Invariant H2 will confirm the LIVE TRANSFER on-chain.
```

---

### G11 — Incident Response Plan Complete

**Status:** ◑ DOCUMENT COMPLETE — `documents/operations/INCIDENT_RESPONSE_PLAN.md` written 2026-05-14. Pending: operations leadership review and formal acceptance.

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
- Plan is reviewed and accepted by operations leadership. ○ PENDING

---

### G12 — Reserve and Reconciliation Model Complete

**Status:** ◑ DOCUMENT COMPLETE — `documents/operations/RESERVE_RECONCILIATION_MODEL.md` written 2026-05-14. Pending: test reconciliation run on Fuji.

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
- The model is implemented in Capinfra or equivalent system. ○ PENDING (`scripts/reconcile-avalanche-reserve.ts` not yet written)
- A test reconciliation report is generated and reviewed before mainnet. ○ PENDING
- Filed under `documents/operations/RESERVE_RECONCILIATION_MODEL.md`. ✓

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
