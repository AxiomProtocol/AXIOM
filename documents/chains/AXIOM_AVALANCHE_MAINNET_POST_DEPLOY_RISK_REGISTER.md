# Axiom Protocol — Avalanche Mainnet Post-Deploy Risk Register

**Document type:** Post-Deploy Security — Phase D  
**Network:** Avalanche C-Chain Mainnet (chainId 43114)  
**Created:** 2026-05-14  
**Status:** ACTIVE — review before any TVL increase  

---

## Risk Classification

| Level | Definition |
|---|---|
| CRITICAL | Potential for complete loss of funds or permanent loss of contract control. Requires action before any minting or TVL. |
| HIGH | Significant security exposure. Requires action before meaningful TVL (>$10K). |
| MEDIUM | Control gap with compensating measures in place. Requires time-boxed remediation. |
| LOW | Best-practice gap. Should be addressed but not blocking. |
| INFO | Acknowledged fact. No remediation required but worth recording. |

---

## Active Risks

---

### R01 — Deployer EOA Retains DEFAULT_ADMIN, AGENT, and MINTER Roles

**Severity:** CRITICAL  
**Gate:** G03, G04, G05, G06  
**Status:** ACCEPTED RISK — 2026-05-14. Deployer EOA retained as accepted-risk for initial launch.

**Description:**  
The deployer EOA (`0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`) was confirmed on-chain as holding agent role on IdentityRegistry. The same EOA holds DEFAULT_ADMIN and MINTER roles on AxiomStable3643 (not yet independently verified at this address but asserted by deploy script). No Gnosis Safe or multi-party authorization structure has been deployed on Avalanche mainnet.

**Risk:**  
- If the deployer key is compromised, an attacker can: (a) mint unlimited AXUSD; (b) bypass identity checks; (c) remove compliance modules including CountryAllowModule and TransferLimitModule; (d) transfer admin to an attacker-controlled address.
- There is no time-lock or multi-party approval on any of these actions.

**Compensating controls:**  
- Deployer key must be moved to cold storage immediately (post-deploy action item).
- No public minting flow is active.
- Total supply is 0 — no user funds at risk today.
- Transfer cap (G07) and country gate (G02) limit blast radius if key is compromised while cap is in place.

**Required remediation:**  
1. Deploy Gnosis Safe on Avalanche mainnet.
2. Grant DEFAULT_ADMIN role on AxiomStable3643 to Safe.
3. Grant AGENT_ROLE on IdentityRegistry to Safe.
4. Grant MINTER_ROLE on AxiomStable3643 to Safe/issuance process.
5. Deployer EOA renounces all roles.
6. Verify role transfer on-chain.

**Deadline:** Before any production minting or TVL accumulation.

---

### R02 — No External Security Audit

**Severity:** HIGH  
**Gate:** G08  
**Status:** DEFERRED — Internal Gate 6 review conducted as compensating control. External audit required before significant TVL.

**Description:**  
The ERC-3643 compliance stack (8 contracts) has not been reviewed by an independent third-party security firm. The internal Gate 6 review was a structured technical review, not a formal security audit with adversarial analysis.

**Risk:**  
- Unknown vulnerabilities may exist in CountryAllowModule, TransferLimitModule, or AxiomStable3643 custom logic.
- T-REX framework contracts (IdentityRegistryStorage, TrustedIssuersRegistry, ClaimTopicsRegistry, IdentityRegistry, ModularCompliance) are open-source and community-reviewed but not audited specifically for this deployment configuration.

**Compensating controls:**  
- Internal Gate 6 review completed.
- Transfer cap limits maximum loss per wallet per day.
- US-only jurisdiction gate limits addressable user base.
- Total supply is 0 today.

**Required remediation:**  
Engage a recognized EVM security firm (e.g., Trail of Bits, OpenZeppelin, Spearbit) before any of the following milestones:
- Cumulative TVL exceeds $50,000 AXUSD
- MINTER_ROLE transferred to any automated process
- CountryAllowModule extended to additional jurisdictions

**Deadline:** Before meaningful TVL.

---

### R03 — DEPLOYER_PRIVATE_KEY Used as Mainnet Signer (Shared Key)

**Severity:** HIGH  
**Gate:** Key management  
**Status:** ACCEPTED RISK — 2026-05-14 decision. Documented in `AXIOM_AVALANCHE_MAINNET_DEPLOY_AUTHORIZATION.md`.

**Description:**  
The mainnet deployment used `DEPLOYER_PRIVATE_KEY`, a shared infrastructure key also used for other protocol operations (Arbitrum, other chains). A dedicated Avalanche deployer key (`AVALANCHE_DEPLOYER_PRIVATE_KEY`) was not provisioned for this deploy.

**Risk:**  
- The key's exposure surface is larger than a dedicated single-purpose key.
- If compromised for any reason (other Arbitrum operation, server exposure), mainnet Avalanche admin roles are also at risk.

**Compensating controls:**  
- Key must be moved to cold storage immediately post-deploy.
- Role migration (R01) eliminates the risk by removing roles from the EOA entirely.

**Required remediation:**  
1. Move `DEPLOYER_PRIVATE_KEY` to cold storage now.
2. Complete R01 (role migration to Safe) to eliminate the exposure entirely.
3. For future deploys, provision `AVALANCHE_DEPLOYER_PRIVATE_KEY` as a dedicated single-purpose key.

**Deadline:** Cold storage — immediate. Key elimination via role migration — before TVL.

---

### R04 — No Daily Reconciliation Cron Active

**Severity:** MEDIUM  
**Gate:** G12  
**Status:** Script written and tested on Fuji. Cron not yet running against mainnet.

**Description:**  
`scripts/reconcile-avalanche-reserve.ts` is available and verified on Fuji. It has not been scheduled as a production cron job against mainnet (chainId 43114). Without automated reconciliation, unauthorized minting could go undetected.

**Risk:**  
- Supply discrepancies between Capinfra authorization and on-chain `totalSupply()` will not be automatically detected.
- With totalSupply = 0 today, risk is low. Risk escalates immediately upon any minting activity.

**Compensating controls:**  
- Manual reconciliation can be run on demand.
- Capinfra authorizes all mints — any mint without Capinfra authorization would appear as a discrepancy.

**Required remediation:**  
Schedule the reconciliation script as a daily cron at 00:00 UTC, pointing at mainnet RPC. Configure alerting on non-zero exit codes. File reports to `documents/operations/reconciliation-reports/`.

**Deadline:** Before first production mint.

---

### R05 — No Snowtrace Source Code Verification

**Severity:** MEDIUM  
**Gate:** Post-launch checklist  
**Status:** PENDING — verification links available but source code not submitted to Snowtrace.

**Description:**  
Contract source code has not been submitted to Snowtrace (Routescan) for public verification. Users and auditors cannot independently confirm that the deployed bytecode corresponds to the claimed source.

**Risk:**  
- Reduced transparency and auditability.
- Downstream integrators cannot verify contract interfaces without source verification.

**Required remediation:**  
Submit all 8 contracts for verification via Routescan API or Snowtrace UI. Constructor arguments must be ABI-encoded. See `AXIOM_AVALANCHE_SNOWTRACE_VERIFICATION_CHECKLIST.md`.

**Deadline:** Within 7 days of launch.

---

### R06 — tx Hashes Not Captured in Deployment Manifest

**Severity:** LOW  
**Status:** Cosmetic gap in manifest. Does not affect on-chain state.

**Description:**  
`deployments/avalanche/mainnet-phase1.json` contains `"txHash": null` for all 8 contracts. The transaction hashes were emitted to console during deployment but not persisted in the manifest because the deploy script failed partway through and the wiring completion was run as a separate script.

**Risk:**  
- Forensic audit trail is incomplete. A third party cannot trace each contract to its creation transaction without querying the blockchain by deployer nonce.

**Required remediation:**  
Query mainnet for the deployer EOA's transaction history at block 85375788 and backfill the tx hashes in `mainnet-phase1.json`. Transactions 0–7 from nonce N correspond to the 8 contract deploys.

**Deadline:** Within 30 days. Non-blocking.

---

### R07 — Fuji and Mainnet Contract Registries Are Identical

**Severity:** LOW  
**Status:** INFO — Explained by nonce determinism. Not a data error.

**Description:**  
`shared/contracts-avalanche.ts` shows `AVALANCHE_CONTRACTS` and `FUJI_CONTRACTS` containing identical addresses. This is factually correct (same addresses exist on both chains due to nonce determinism) but could mislead a developer who assumes the registries should differ.

**Risk:**  
- Developer could mistakenly use `FUJI_CONTRACTS` thinking it points to a separate set of addresses, when it is the same set on a different chain.
- No funds risk — the network is determined by the RPC provider, not the address.

**Required remediation:**  
Add a prominent comment to `shared/contracts-avalanche.ts` explaining that the addresses are intentionally identical and that the active chain is determined by the provider/signer, not by the address constant.

**Deadline:** Next maintenance window.

---

### R08 — Mainnet is Not Fully Unrestricted

**Severity:** INFO  
**Status:** By design — post-launch restricted mode.

**Description:**  
Avalanche mainnet is deployed and wired. No public user flows have been activated. No minting has occurred. Deferred gates (G03–G06, G08) remain open. The system is in **post-launch restricted mode**.

**Conditions for unrestricted operation:**  
- R01: Role migration to Gnosis Safe complete
- R02: External security audit complete
- R03: Deployer key eliminated from roles
- R04: Daily reconciliation cron active
- R05: Snowtrace source verification complete

---

## Risk Summary

| Risk | Severity | Status | Action Required Before TVL |
|---|---|---|---|
| R01 — Deployer EOA holds all roles | CRITICAL | Active — accepted-risk | YES — role migration to Safe |
| R02 — No external audit | HIGH | Active — deferred | YES — engage auditor |
| R03 — Shared deployer key | HIGH | Active — accepted-risk | YES — cold storage now; role migration before TVL |
| R04 — No reconciliation cron | MEDIUM | Active | YES — before first mint |
| R05 — No Snowtrace verification | MEDIUM | Pending | Within 7 days |
| R06 — tx hashes missing in manifest | LOW | Cosmetic | Within 30 days |
| R07 — Identical registry addresses | LOW | Info | Next maintenance window |
| R08 — Restricted mode | INFO | By design | N/A |

---

**PHASE D VERDICT: DEPLOYMENT SAFE TO HOLD IN RESTRICTED MODE. CRITICAL and HIGH risks must be remediated before any minting or TVL accumulation.**
