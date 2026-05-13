# Axiom Protocol — Avalanche Mainnet Readiness Gap Analysis

**Document type:** Formal readiness assessment  
**Version:** 1.0.0  
**Analysis date:** 2026-05-13  
**Prepared for:** Task #483  
**Analyst:** Automated — grounded in code, artifacts, and on-chain evidence  
**Scope:** Avalanche Fuji testnet deployment (Task #479) → Avalanche C-Chain mainnet readiness  

> **Authorization statement:** Avalanche C-Chain mainnet deployment is **not authorized** under this analysis. 11 of 12 mainnet promotion gates remain open or unresolved. No gate has been weakened or inferred. Mainnet deployment requires all 12 gates satisfied and sign-off by technical lead, operations lead, and compliance counsel as defined in `AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md`.

---

## 1. Executive Summary

The Axiom Protocol ERC-3643 compliance stack is deployed and behaviorally verified on Avalanche Fuji testnet. The 8 contracts are live, wired, verified on Routescan, and have passed all 15 behavioral smoke tests. The Capinfra AVALANCHE settlement adapter is coded and registered in the production adapter registry. Operational visibility exists via the `/operations/fuji-status` page.

**Despite this strong testnet foundation, the system is not ready for Avalanche mainnet deployment.** Of the 12 formal promotion gates, 1 is satisfied and 11 are open. Additionally, this analysis surfaces 4 findings not covered by the existing gate list that add further risk:

1. `deployments/avalanche/fuji-phase1.json` contains dry-run placeholder addresses, not real Fuji broadcast data — the on-disk deployment manifest is stale.
2. The Capinfra AVALANCHE adapter is coded but has no evidence of end-to-end dispatch testing against the live AXUSD contract on Fuji. The asset registry entry for Fuji AXUSD has not been confirmed.
3. The adapter's `liveDispatch` uses a minimal ERC-20 ABI (`mint`, `burn`, `transfer`) with no ERC-3643 compliance error handling — compliance reverts will surface as generic failures.
4. `IntegrationReadinessModel.ts` (Avalanche artifact tracking) still records all artifacts as `status: 'missing'`, which is incorrect post-deployment.

**Current readiness: 8.3% (1 / 12 gates satisfied)**

---

## 2. Current Readiness Percentage

| Category | Gates | Satisfied | Open / Partial | Blocked |
|---|---|---|---|---|
| Technical | G01, G02, G07, G09, G10 | 1 | 4 | 0 |
| Governance / Security | G03, G04, G05, G06, G08 | 0 | 5 | 0 |
| Operations | G11, G12 | 0 | 2 | 0 |
| **Total** | **12** | **1 (8.3%)** | **11 (91.7%)** | **0** |

Note: No gate is currently BLOCKED (meaning it cannot proceed due to an unresolvable external dependency). All 11 open gates are actionable with internal work, external vendor engagement, or decision-making.

---

## 3. Gate-by-Gate Analysis

---

### G01 — All Fuji Smoke Tests Pass (15/15)

**Status: ✓ SATISFIED**  
**Classification:** N/A — complete  

**Evidence reviewed:**
- `deployments/avalanche/fuji-smoke-results.json`: `"passed": 15, "failed": 0, "total": 15`
- `documents/chains/AXIOM_AVALANCHE_FUJI_SMOKE_REPORT.md`: All 15 tests documented with transaction hashes
- Task #480 completed 2026-05-13T20:26:53.439Z
- Verified against live contracts at addresses matching `shared/contracts-avalanche.ts` (FUJI_CONTRACTS)

**Conditions for regression:**
- Any contract redeployment requires full re-run.
- Smoke tests must also run as a pre-flight check immediately before mainnet deployment.

**Finding:** The smoke test file `deployments/avalanche/fuji-phase1.json` contains **dry-run placeholder addresses** (`0xDRYRUN…`), not the real Fuji broadcast data. The canonical address source is `shared/contracts-avalanche.ts` (FUJI_CONTRACTS), which contains the correct live addresses confirmed by smoke test T01–T15. The phase1.json manifest should be updated to reflect the real broadcast. This is a low-severity artifact inconsistency but must be corrected before any tooling that reads the manifest for address resolution is used in production flows.

---

### G02 — Replace setAllowAll with Per-Jurisdiction Allowlist

**Status: ○ OPEN**  
**Gap classification: Critical**  
**Gap type: Compliance / External dependency**  

**Current state:**
- `CountryAllowModule.setAllowAll(MC, true)` is active on Fuji. Confirmed live via `/api/operations/fuji-status` and documented in all runbooks.
- No jurisdiction allowlist exists in any file in this repository.
- No documented approval from compliance counsel for any allowed jurisdiction list.
- The smoke tests did not include a negative test for country-based rejection (T10 tested RECEIVER_NOT_VERIFIED based on identity registration, not country code).

**Missing artifacts:**
- ISO 3166-1 numeric country allowlist approved by compliance counsel
- Mainnet deployment script that calls `setAllowedCountry(MC, countryCode, true)` for each approved jurisdiction
- Smoke test extension: a test that verifies a wallet with an unapproved country code is rejected by CountryAllowModule

**External dependency:** Compliance counsel must define and approve the jurisdiction allowlist. This cannot be resolved with internal engineering work alone.

**Recommended follow-up task:** Wire compliance team approval process; update `fuji-smoke.mts` to add a T16 country-rejection test; update mainnet deploy script to remove `setAllowAll` and replace with allowlist calls.

---

### G03 — Assign DEFAULT_ADMIN Role to Gnosis Safe

**Status: ○ OPEN**  
**Gap classification: Critical**  
**Gap type: Governance / Security**  

**Current state:**
- Deployer EOA (`0x8d7892…C96`) holds DEFAULT_ADMIN_ROLE on all 8 contracts — confirmed by smoke test T02 (`isAdmin=true`).
- No Gnosis Safe exists on Avalanche C-Chain mainnet. There is no Safe address anywhere in the codebase (`shared/contracts-avalanche.ts`, deployment manifests, or documentation).
- The Operations Security Policy referenced by the Mainnet Promotion Gates document has not been created. The required signer threshold (2 of N) and signer roster are undefined.

**Missing artifacts:**
- Gnosis Safe deployed on Avalanche C-Chain mainnet (separate from any Arbitrum Safe)
- Safe signer roster and threshold documented in Operations Security Policy
- Safe tested with at least one multi-party transaction on Avalanche mainnet
- DEFAULT_ADMIN_ROLE grant transaction executed on all 8 contracts
- On-chain verification: `hasRole(ADMIN_ROLE, safeAddress)` returns `true` on all 8

**External dependency:** Requires identification of Safe signers (named individuals with hardware wallets). This is a governance and personnel decision.

**Recommended follow-up task:** Create Operations Security Policy; deploy Avalanche mainnet Safe; document Safe address and signer roster; write role-transfer scripts.

---

### G04 — Assign AGENT Role to Controlled Operations Address

**Status: ○ OPEN**  
**Gap classification: Critical**  
**Gap type: Governance / Security**  

**Current state:**
- Deployer EOA holds AGENT_ROLE on IdentityRegistry and AxiomStable3643Fuji — confirmed by T02 and T06.
- No controlled operations address is defined anywhere in the codebase or documentation.
- The operations address may or may not be the same as the Safe used for DEFAULT_ADMIN (this decision is undocumented).

**Missing artifacts:**
- Decision: is the AGENT_ROLE holder the same Safe as DEFAULT_ADMIN, or a separate operations address?
- Controlled agent address deployed and confirmed operational
- AGENT_ROLE grant on both IdentityRegistry and AxiomStable3643Fuji
- On-chain verification

**Dependency:** Depends on G03 (Safe must exist before AGENT_ROLE can be transferred to it).

**Recommended follow-up task:** Document agent address decision in Operations Security Policy (same gate as G03); add AGENT_ROLE transfer to mainnet wiring scripts.

---

### G05 — Assign MINTER Role to Controlled Issuance Process

**Status: ○ OPEN**  
**Gap classification: Critical**  
**Gap type: Governance / Security**  

**Current state:**
- Deployer EOA holds MINTER_ROLE — confirmed by T02.
- No minting authorization process is documented. The Capinfra AVALANCHE adapter's `liveDispatch()` function currently calls `contract.mint(to, amount)` directly using `DEPLOYER_PRIVATE_KEY`, which means any LIVE-mode dispatch can mint without multi-party authorization.
- There is no mint authorization workflow, no mint request queue, and no multi-party approval gate in the current Capinfra adapter code.

**Missing artifacts:**
- Documented minting authorization process (who can request, who must approve, execution mechanism)
- MINTER_ROLE holder: Safe, dedicated minting contract, or authorized Capinfra relayer key with documented custody
- MINTER_ROLE grant on AxiomStable3643Fuji
- Test mint via new minter process

**Risk note:** The Capinfra adapter's current LIVE dispatch path does not enforce any authorization beyond having `DEPLOYER_PRIVATE_KEY` in environment. If LIVE mode were enabled without proper minter custody, any system with access to that env var could mint AXUSD on mainnet.

**Recommended follow-up task:** Design minting authorization model; determine if Capinfra LIVE relayer key is a sufficient custody model or whether a Safe-based mint approval flow is required.

---

### G06 — Deployer EOA Renounces All Roles

**Status: ○ OPEN**  
**Gap classification: Critical**  
**Gap type: Governance / Security**  
**Blocked by:** G03, G04, G05  

**Current state:**
- Deployer holds all three roles (admin, minter, agent) — confirmed live on Fuji.
- This gate is explicitly blocked by G03, G04, and G05. Role renouncement must not happen until all three transfer targets are confirmed holding their respective roles.
- No renouncement scripts exist in the codebase.

**Missing artifacts:**
- Role renouncement script (for each of: DEFAULT_ADMIN on 8 contracts, AGENT on 2 contracts, MINTER on 1 contract)
- Post-renouncement verification script (`hasRole` checks for all renounced roles returning `false`)
- Second-operator sign-off procedure for post-renouncement verification
- Deployer key decommission or cold storage procedure

**Recommended follow-up task:** Write renouncement and verification scripts as part of the mainnet role-transfer task.

---

### G07 — Set Production TransferLimitModule Cap

**Status: ○ OPEN**  
**Gap classification: High**  
**Gap type: Technical / Compliance**  

**Current state:**
- TransferLimitModule limit on Fuji is currently 0 (unlimited) — confirmed live via `/api/operations/fuji-status` (shows "Unlimited (reset after smoke test T11)").
- No production transfer cap has been defined anywhere in documentation, product specs, or compliance policy.
- The mainnet deployment script has not been updated to call `setTransferLimit(MC, limit)` with a production value.

**Missing artifacts:**
- Business decision: what is the appropriate per-wallet daily transfer limit for AXUSD on Avalanche mainnet?
- Mainnet post-deploy wiring script updated to set the production cap
- Cap value documented in mainnet deployment manifest

**External dependency:** The cap value requires input from compliance and product teams. It is not a purely technical decision.

**Recommended follow-up task:** Compliance/product alignment meeting; update mainnet wiring script; add G07 acceptance criteria to mainnet smoke test suite.

---

### G08 — External Security Review Signed Off

**Status: ○ OPEN**  
**Gap classification: Critical**  
**Gap type: Security / External dependency**  

**Current state:**
- No `documents/audits/` directory exists in the repository. No security review has been initiated, is in progress, or is documented as complete.
- The contract code reviewed in scope (AxiomStable3643Fuji, ModularCompliance, CountryAllowModule, TransferLimitModule) is custom Solidity code deploying on Avalanche Fuji. While it follows the T-REX (ERC-3643) pattern, the custom modules and token contract have not been independently verified.
- No audit vendor has been engaged.

**Missing artifacts:**
- `documents/audits/` directory
- Vendor selection and engagement
- Audit scope document
- Interim findings (if any) and remediation log
- Final signed-off audit report

**External dependency:** Requires engagement of an independent security firm. Lead time is typically 4–12 weeks depending on firm and queue.

**Risk note:** This is the longest-lead-time gate. It should be initiated in parallel with G02 and G03, not sequentially after them.

**Recommended follow-up task:** Initiate audit vendor selection immediately. Do not wait for other gates to close first.

---

### G09 — Capinfra AVALANCHE Adapter DRY_RUN Tested

**Status: ○ PARTIAL**  
**Gap classification: High**  
**Gap type: Technical**  

**Current state (what exists):**
- `lib/capinfra/adapters/avalanche/config.ts` — fully implemented. Reads `AVALANCHE_ADAPTER_MODE` (default: `DRY_RUN`), `AVALANCHE_RPC_URL`, `AVALANCHE_ADAPTER_LIVE_ALLOWLIST`, `DEPLOYER_PRIVATE_KEY`.
- `lib/capinfra/adapters/avalanche/dispatcher.ts` — fully implemented. DRY_RUN returns a synthetic receipt with correct shape. LIVE dispatches via `ethers.JsonRpcProvider` with chain ID validation.
- `lib/capinfra/adapters/avalanche/index.ts` — `avalancheAdapter` exported.
- `lib/capinfra/adapters/registry.ts` — `avalancheAdapter` is registered in `ADAPTERS_BY_KIND` alongside INTERNAL, EVM, STELLAR, and ACH adapters. The adapter is live in the production code path.
- Default mode is `DRY_RUN` — safe, no broadcast without explicit env var.

**Current state (what is missing):**
- No test evidence that a DRY_RUN dispatch has been executed against the real AXUSD asset entry (`FUJI_CONTRACTS.AxiomStable3643`).
- The adapter reads `asset.contractAddress` from the Capinfra asset registry (PostgreSQL `cap_assets` or equivalent). There is no confirmation that AXUSD on Fuji (chain ID 43113) has a valid row in the asset registry with `contractAddress = 0x5Cd7c15…` and `chainId = 43113`.
- No integration test file exists in the codebase for the Avalanche adapter (no `avalanche.test.ts` or equivalent).
- The `documents/chains/AXIOM_AVALANCHE_FUJI_CHECKLIST.md` Capinfra DRY_RUN item remains unchecked.

**Additional finding — ABI gap:**
The LIVE dispatcher uses a minimal ERC-20 ABI: `transfer`, `balanceOf`, `decimals`, `mint`, `burn`. The AxiomStable3643Fuji contract is ERC-3643, which wraps `transfer()` in compliance checks. If a LIVE transfer fails due to an ERC-3643 compliance revert (e.g., `RECEIVER_NOT_VERIFIED`, country restriction, transfer limit exceeded), the error will surface as a generic EVM revert with no structured error parsing. Operators will not be able to distinguish a compliance failure from a gas failure or network error.

**Missing artifacts:**
- AXUSD Fuji asset row confirmed in Capinfra asset registry
- DRY_RUN dispatch integration test (script or test file)
- DRY_RUN execution evidence (receipt JSON showing `kind: 'AVALANCHE', mode: 'DRY_RUN'`)
- Checklist item ticked in `AXIOM_AVALANCHE_FUJI_CHECKLIST.md`
- ERC-3643 compliance error parsing added to dispatcher (medium priority)

**Recommended follow-up task:** Confirm/create AXUSD Fuji asset registry row; write and run DRY_RUN integration test; update checklist.

---

### G10 — Capinfra AVALANCHE Adapter LIVE Dispatch Tested

**Status: ○ OPEN**  
**Gap classification: High**  
**Gap type: Technical**  
**Blocked by:** G09  

**Current state:**
- LIVE dispatch code is implemented (`liveDispatch()` in `dispatcher.ts`).
- LIVE mode is gated behind `AVALANCHE_ADAPTER_MODE=LIVE` env var AND requires the asset symbol to be in `AVALANCHE_ADAPTER_LIVE_ALLOWLIST`.
- No LIVE dispatch has been executed against any Fuji or mainnet contract — no transaction hash evidence exists.
- `AVALANCHE_RPC_URL` is not confirmed as set in the current environment secrets.

**Missing artifacts:**
- `AVALANCHE_RPC_URL` confirmed set (or added as secret)
- LIVE dispatch integration test script
- Confirmed Fuji mint transaction from Capinfra LIVE mode (transaction hash on Snowtrace)
- Confirmed Fuji transfer transaction from Capinfra LIVE mode
- Checklist item ticked in `AXIOM_AVALANCHE_FUJI_CHECKLIST.md`

**Risk note:** LIVE dispatch requires `DEPLOYER_PRIVATE_KEY`, which currently holds admin/minter/agent roles. LIVE testing must not reduce deployer AVAX balance below the threshold needed for emergency operations.

**Recommended follow-up task:** After G09 is confirmed, run LIVE dispatch integration test against Fuji with a 1 AXUSD mint; capture receipt and transaction hash.

---

### G11 — Incident Response Plan Complete

**Status: ○ OPEN**  
**Gap classification: High**  
**Gap type: Operations**  

**Current state:**
- `documents/operations/` directory does not exist.
- No incident response plan document exists anywhere in the repository.
- The Operations Runbook (`AXIOM_AVALANCHE_OPERATIONS_RUNBOOK.md`, Task #482) provides emergency procedure commands but does not constitute a formal incident response plan — it lacks: defined incident severity levels, on-call rotation, escalation chain, communication templates, regulatory notification requirements, or post-incident review process.

**Missing artifacts:**
- `documents/operations/` directory
- `documents/operations/INCIDENT_RESPONSE_PLAN.md` with:
  - Incident classification (P0/P1/P2)
  - Triggering conditions for each severity
  - On-call contacts and escalation chain
  - Response procedures for each incident type (contract pause, key compromise, RPC outage, reserve discrepancy, compliance module failure)
  - Communication templates (internal, regulatory if required)
  - Post-incident review process
- Operations leadership review and sign-off

**Recommended follow-up task:** Create `documents/operations/INCIDENT_RESPONSE_PLAN.md`; obtain operations leadership sign-off.

---

### G12 — Reserve and Reconciliation Model Complete

**Status: ○ OPEN**  
**Gap classification: High**  
**Gap type: Reserve accounting / Operations**  

**Current state:**
- `documents/operations/RESERVE_RECONCILIATION_MODEL.md` does not exist.
- No reserve reconciliation model exists for Avalanche AXUSD.
- The current Axiom reserve architecture is Arbitrum One-centric (solvency APIs, reserve snapshots, PSM, backstop vault all on Arbitrum). There is no multi-chain reserve aggregation layer.
- AXUSD minted on Avalanche (via Capinfra LIVE dispatch) would not currently appear in the `/api/solvency/latest` reserve calculations.
- The canonical AXUSD supply endpoint (`/api/axusd/supply.ts`) reads from Arbitrum One only — an Avalanche mint would create invisible circulating supply from the perspective of the existing reserve dashboard.

**Missing artifacts:**
- `documents/operations/RESERVE_RECONCILIATION_MODEL.md` specifying:
  - Which chain holds the backing reserve for Avalanche AXUSD
  - Reconciliation frequency (real-time, hourly, daily)
  - Acceptable tolerance between expected and observed supply
  - Escalation threshold (at what divergence is an incident triggered)
  - Implementation plan (extend solvency API, add Avalanche supply read, aggregate)
- API update to `/api/axusd/supply.ts` or a parallel endpoint to include Avalanche AXUSD supply
- Test reconciliation report

**Risk note:** This is the most technically underspecified gate. Deploying AXUSD on mainnet without a reserve reconciliation model creates invisible supply risk.

**Recommended follow-up task:** Architecture decision: is Avalanche AXUSD backed by Arbitrum PAXG, a separate Avalanche reserve, or a cross-chain reserve model? Document and implement accordingly.

---

## 4. Critical Blockers

The following gates are classified Critical and must be resolved before any other mainnet preparation work is considered complete. These are not sequencing guidelines — some can proceed in parallel.

| Gate | Why Critical |
|---|---|
| **G02 — Jurisdiction allowlist** | `setAllowAll(true)` on mainnet would allow unrestricted global distribution of AXUSD regardless of regulatory jurisdiction. This is a compliance-critical failure mode. |
| **G03 — DEFAULT_ADMIN to Safe** | Single-EOA admin on mainnet means a single private key compromise grants total control: role changes, pause, compliance bypass. This is the highest-severity governance failure mode. |
| **G04 — AGENT role control** | Uncontrolled AGENT on mainnet allows unrestricted identity registration and wallet freezing/unfreezing with no multi-party authorization. |
| **G05 — MINTER role control** | Uncontrolled MINTER on mainnet allows unrestricted AXUSD issuance. The current Capinfra LIVE mode uses a single private key with no mint authorization gate. |
| **G06 — Deployer renounces** | Depends on G03–G05. Cannot close until all three role transfers are complete and verified. |
| **G08 — Security audit** | Longest lead time. No audit vendor engaged. Must begin in parallel with other gates. |

---

## 5. High-Priority Blockers

These gates are High priority and must close before mainnet deployment, but can proceed in parallel with the Critical gates.

| Gate | Why High |
|---|---|
| **G07 — Transfer limit cap** | A limit of 0 (unlimited) on mainnet creates uncapped outflow risk. Must be set before mainnet wiring. |
| **G09 — Capinfra DRY_RUN** | Adapter code exists but has never been run against live contracts. Asset registry entry for Fuji AXUSD is unconfirmed. |
| **G10 — Capinfra LIVE dispatch** | No end-to-end Capinfra → Fuji mint has ever been executed. Cannot be considered ready. |
| **G11 — Incident response plan** | No formal plan exists. Emergency procedures in the Operations Runbook are a starting point only. |
| **G12 — Reserve reconciliation** | AXUSD minted on Avalanche does not appear in the current reserve dashboard. Invisible supply is a structural risk. |

---

## 6. Additional Findings (Not Covered by Existing Gates)

These issues were identified during this analysis but fall outside the scope of the 12 existing promotion gates. They are documented here for tracking and should be incorporated into follow-up work.

### F01 — fuji-phase1.json Contains Dry-Run Data (Low severity)

`deployments/avalanche/fuji-phase1.json` currently stores the dry-run simulation output, not the real broadcast result. All addresses are `0xDRYRUN…` placeholders and `"dryRun": true`. The canonical address source is `shared/contracts-avalanche.ts` (FUJI_CONTRACTS), which is correct. However, any tooling that resolves contract addresses from `fuji-phase1.json` will fail or use incorrect addresses.

**Recommended action:** Update `fuji-phase1.json` with real broadcast data: actual addresses, real transaction hashes, `"dryRun": false`, and actual deployer address.

---

### F02 — IntegrationReadinessModel Not Updated Post-Deployment (Low severity)

`lib/multichain/IntegrationReadinessModel.ts` (AVALANCHE_ARTIFACTS) records all Avalanche artifacts as `status: 'missing'`, including the architecture decision ("C-Chain vs Custom Subnet") which has been resolved (C-Chain was chosen and deployed). This model is surfaced in the `/infrastructure` page and may mislead operators about the true integration state.

**Recommended action:** Update `AVALANCHE_ARTIFACTS` to reflect completed decisions and gathered artifacts. The architecture decision artifact (`avalanche-architecture-decision`) should be marked `status: 'integrated'`.

---

### F03 — Capinfra LIVE Dispatcher ABI Does Not Handle ERC-3643 Compliance Reverts (Medium severity)

`lib/capinfra/adapters/avalanche/dispatcher.ts` LIVE mode uses a minimal ERC-20 ABI. The ERC-3643 `transfer()` function wraps compliance checks — if a transfer fails due to `RECEIVER_NOT_VERIFIED`, country restriction, transfer limit, or wallet freeze, the failure will surface as an opaque EVM revert. No structured error parsing, no compliance-specific error codes in the receipt, and no retry guidance.

**Recommended action:** Add ERC-3643 error interface to the dispatcher ABI and add try/catch with compliance error attribution in the LIVE dispatch path before mainnet.

---

### F04 — No Confirmed Asset Registry Row for Fuji AXUSD (High severity, feeds into G09)

The Capinfra LIVE and DRY_RUN dispatchers both read `asset.contractAddress` and `asset.chainId` from an `AdapterDispatchInput` which originates from the Capinfra asset registry. There is no confirmation that AXUSD on Fuji (chainId 43113, address `0x5Cd7c15…`) has a row in the database asset registry. Without this row, no dispatch — DRY_RUN or LIVE — can be routed to the Fuji AXUSD contract.

**Recommended action:** Confirm or create the Fuji AXUSD asset registry row with `chain: 'avalanche-fuji', chainId: 43113, contractAddress: '0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8', decimals: 6, symbol: 'AXUSD'`. This is a prerequisite for G09.

---

## 7. Required Follow-Up Task List

The following tasks are required to close all 12 gates. They are grouped by parallel track.

### Track A — Governance / Security (blocks G03, G04, G05, G06)

| Priority | Task |
|---|---|
| 1 | Create Operations Security Policy (signer roster, threshold, key custody) |
| 2 | Deploy Gnosis Safe on Avalanche C-Chain mainnet |
| 3 | Document Safe address; confirm operational with test transaction |
| 4 | Write role-transfer scripts (grant ADMIN/AGENT/MINTER to Safe, revoke from deployer) |
| 5 | Write post-renouncement verification scripts |
| 6 | Execute role transfer on testnet (Fuji) as rehearsal |

### Track B — Compliance (blocks G02, G07)

| Priority | Task |
|---|---|
| 1 | Compliance counsel engagement: define jurisdiction allowlist |
| 2 | Compliance/product decision: production transfer limit cap |
| 3 | Update mainnet deploy script: remove `setAllowAll`, add `setAllowedCountry` calls |
| 4 | Update mainnet wiring script: add `setTransferLimit` with production cap |
| 5 | Add T16 smoke test: country-rejection negative test |

### Track C — Security Audit (blocks G08)

| Priority | Task |
|---|---|
| 1 | Select and engage audit vendor |
| 2 | Prepare audit scope document |
| 3 | Create `documents/audits/` directory |
| 4 | File interim and final reports on completion |

### Track D — Capinfra Integration (blocks G09, G10, fixes F03, F04)

| Priority | Task |
|---|---|
| 1 | Confirm or create AXUSD Fuji asset registry row in database |
| 2 | Write DRY_RUN integration test script |
| 3 | Run DRY_RUN test; capture receipt; tick checklist item |
| 4 | Run LIVE dispatch test on Fuji; capture transaction hash |
| 5 | Add ERC-3643 compliance error parsing to dispatcher |
| 6 | Tick LIVE checklist item |

### Track E — Operations (blocks G11, G12)

| Priority | Task |
|---|---|
| 1 | Create `documents/operations/INCIDENT_RESPONSE_PLAN.md` |
| 2 | Define incident severity levels and on-call chain |
| 3 | Obtain operations leadership sign-off |
| 4 | Architecture decision: reserve model for Avalanche AXUSD |
| 5 | Create `documents/operations/RESERVE_RECONCILIATION_MODEL.md` |
| 6 | Extend `/api/axusd/supply.ts` to aggregate Avalanche AXUSD supply |
| 7 | Generate and review test reconciliation report |

### Track F — Artifact Cleanup (fixes F01, F02)

| Priority | Task |
|---|---|
| 1 | Update `deployments/avalanche/fuji-phase1.json` with real broadcast data |
| 2 | Update `IntegrationReadinessModel.ts` Avalanche artifact statuses |

---

## 8. Mainnet Go / No-Go Recommendation

**Recommendation: NO-GO**

Avalanche C-Chain mainnet deployment is not recommended at this time. The system has a strong testnet foundation, but 11 of 12 promotion gates are open. Six of those are classified Critical.

The specific blockers that must not be bypassed under any circumstances:

1. **G02** — deploying with `setAllowAll(true)` on mainnet is a compliance failure that could expose Axiom Protocol to regulatory liability for unauthorized distribution of AXUSD across restricted jurisdictions.
2. **G03/G04/G05/G06** — deploying mainnet AXUSD under single-EOA control is a security failure that makes the entire compliance stack vulnerable to a single private key compromise.
3. **G08** — deploying custom Solidity contracts to mainnet without external security review is a standard violation for any protocol handling real-value financial assets.

When all 12 gates are closed and three sign-offs obtained (technical lead, operations lead, compliance counsel), this document should be superseded by a Mainnet Deployment Authorization Memo that explicitly references each gate's completion evidence before the first mainnet transaction is broadcast.

---

## 9. Authorization Statement

**Avalanche C-Chain mainnet deployment is not authorized under this analysis.**

This conclusion is based on direct inspection of:
- Code artifacts: `lib/capinfra/adapters/avalanche/`, `shared/contracts-avalanche.ts`, `pages/api/operations/fuji-status.ts`
- Deployment artifacts: `deployments/avalanche/fuji-phase1.json`, `deployments/avalanche/fuji-smoke-results.json`
- Documentation: `documents/chains/AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md`, `documents/chains/AXIOM_AVALANCHE_FUJI_SMOKE_REPORT.md`, all Task #479–482 documents
- Live on-chain state via `/api/operations/fuji-status` (confirmed working as of Task #481)

No gate has been weakened, inferred, or credited without evidence. The analysis does not assume that planned work is complete work. External dependencies (audit vendor, compliance counsel, Safe signers) are not credited until they produce verifiable artifacts.

**Required sign-offs before mainnet authorization:**
1. Technical lead — confirms all 12 gate acceptance criteria are met on-chain
2. Operations lead — confirms G11 and G12 are implemented and reviewed
3. Compliance counsel — confirms G02 jurisdiction allowlist and G08 audit sign-off

---

*Axiom Protocol Internal — Task #483 · Analysis date: 2026-05-13*
