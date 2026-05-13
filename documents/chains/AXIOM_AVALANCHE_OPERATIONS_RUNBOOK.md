# Axiom Protocol — Avalanche Operations Runbook

**Version:** 1.0.0  
**Network scope:** Avalanche Fuji Testnet (43113) · Avalanche C-Chain Mainnet (43114 — pending)  
**Last updated:** 2026-05-13 (Task #482)  

---

## 1. Purpose

This runbook covers day-to-day operations of the Axiom Protocol ERC-3643 compliance stack on Avalanche. It documents operational visibility tooling, known risk postures, and emergency procedures for operators.

For the initial deployment sequence, see the Deployment Runbook:  
`documents/chains/AXIOM_AVALANCHE_DEPLOYMENT_RUNBOOK.md`

For mainnet promotion requirements, see the Mainnet Promotion Gates:  
`documents/chains/AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md`

---

## 2. Operations Visibility

### 2.1 Fuji Contract Status Page

**URL:** `/operations/fuji-status`  
**Task:** Task #481  

This is the primary operational visibility surface for the Avalanche Fuji compliance stack. It is a read-only observer panel — no write actions, no wallet connections.

**What it does:**
- Connects to Fuji RPC via `GET /api/operations/fuji-status`
- Batches 19 concurrent view calls across all 8 contracts
- Displays live state with auto-refresh every 60 seconds
- Shows loading state, RPC error state, and stale data warning

### 2.2 Data Sources

| Data category | Source |
|---|---|
| Token metadata (name, symbol, decimals, supply, paused) | Live Fuji RPC — AxiomStable3643Fuji |
| Deployer and test wallet balances | Live Fuji RPC — `balanceOf()` |
| Deployer role status (admin, minter, agent) | Live Fuji RPC — `hasRole()` |
| Compliance module list | Live Fuji RPC — `ModularCompliance.getModules()` |
| Transfer limit value | Live Fuji RPC — `TransferLimitModule.getTransferLimit()` |
| Compliance binding | Live Fuji RPC — `ModularCompliance.getTokenBound()` |
| IdentityRegistry wiring | Live Fuji RPC — `issuersRegistry()`, `topicsRegistry()`, `identityStorage()` |
| Contract addresses and explorer links | `shared/contracts-avalanche.ts` (FUJI_CONTRACTS) |
| Smoke test metadata (completedAt, passed, failed) | `deployments/avalanche/fuji-smoke-results.json` |
| Mainnet promotion gate checklist | Hardcoded in API — reflects known blockers |

### 2.3 Stale Data Handling

- The status page displays a **stale data banner** if the last successful fetch is more than 2 minutes ago.
- Auto-refresh fires every 60 seconds via `setInterval`.
- A manual Refresh button is available at all times.
- On RPC failure, the page displays an error state with a Retry button. It does not show stale data silently.

### 2.4 Required Warnings

The status page must always display the following warnings:

1. **Testnet banner** — "These contracts are deployed on Avalanche Fuji testnet. No real funds are at risk."
2. **CountryAllowModule warning** — "`setAllowAll(true)` is active — Fuji testnet only. Must be replaced with per-country allowlist before mainnet."
3. **Roles not mainnet ready** — "Deployer holds DEFAULT_ADMIN, MINTER, and AGENT_ROLE directly. Not mainnet-ready. Roles must be transferred to a multi-party authorization wallet (Gnosis Safe) before mainnet."

These warnings must remain visible regardless of on-chain state.

### 2.5 RPC Failure Behavior

On RPC failure, the status page:
1. Clears any previously loaded data
2. Displays the error state panel with the error message
3. Provides a Retry button
4. Does NOT show stale data from a previous successful load
5. Logs the error to the server via the API route's `console.error`

---

## 3. Operational Risk Posture

The following risks are documented for the current Fuji deployment. These risks must be remediated before mainnet.

### 3.1 Deployer Key Risk

**Risk:** The Fuji deployer key (`0x8d7892…C96`) holds DEFAULT_ADMIN_ROLE, MINTER_ROLE, and AGENT_ROLE on all 8 contracts. Loss or compromise of this key would grant an attacker full control of the compliance stack.

**Current posture:** Fuji testnet only — no real funds at risk.

**Mitigation required before mainnet:**
- Transfer all three roles to a Gnosis Safe with multi-party authorization.
- Deployer EOA must explicitly renounce all three roles after transfer.
- Confirm role transfer on-chain before deployer key is decommissioned.

---

### 3.2 Fuji-Only Configuration Risk

**Risk:** `CountryAllowModule.setAllowAll(true)` bypasses all country-based compliance checks. If this configuration were applied to mainnet, any wallet (regardless of jurisdiction) could receive AXUSD.

**Current posture:** Applied on Fuji only. Explicitly documented as testnet-only in all runbooks, the checklist, and the status page.

**Mitigation required before mainnet:**
- Deploy with `setAllowAll` NOT called.
- Call `setAllowedCountry(MC, countryCode, true)` for each approved jurisdiction.
- Verify country allowlist before mainnet smoke tests.

---

### 3.3 RPC Dependency Risk

**Risk:** The status page and API route depend on the Avalanche Fuji public RPC endpoint (`https://api.avax-test.network/ext/bc/C/rpc`). RPC downtime causes loss of visibility.

**Current posture:** Single RPC. No fallback configured.

**Mitigation:**
- For mainnet, configure a dedicated Alchemy RPC URL via `ALCHEMY_API_KEY` for Avalanche C-Chain.
- Add RPC fallback logic to the API route for production.

---

### 3.4 Wrong-Chain Dispatch Risk

**Risk:** A Capinfra adapter misconfiguration could dispatch a transaction intended for Arbitrum One to Avalanche Fuji, or vice versa. This could result in incorrect minting or failed settlements.

**Current posture:** Capinfra AVALANCHE adapter is not yet wired to live contracts (deferred to post-Task #481 work).

**Mitigation:**
- Chain ID must be validated in the Capinfra adapter before every dispatch.
- DRY_RUN mode must be tested before LIVE dispatch is enabled.
- See Mainnet Promotion Gates — Capinfra DRY_RUN and LIVE tests are blocking requirements.

---

### 3.5 Stale Artifact Risk

**Risk:** `shared/contracts-avalanche.ts` or `deployments/avalanche/fuji-phase1.json` could fall out of sync if a contract is redeployed without updating the registry files.

**Current posture:** Addresses last confirmed correct during Task #480 smoke tests (all 15 tests passed against the addresses in `shared/contracts-avalanche.ts`).

**Mitigation:**
- Any redeployment must update `shared/contracts-avalanche.ts` immediately.
- Smoke tests must re-run after any address change.
- GitHub commit history serves as the artifact audit trail.

---

### 3.6 Explorer Verification Mismatch Risk

**Risk:** Source verification on Routescan/Snowtrace could fail or return a mismatch if a contract is redeployed with different compiler settings.

**Current posture:** All 8 Fuji contracts verified on Routescan.

**Mitigation:**
- Preserve `hardhat-avalanche/hardhat.config.mts` compiler settings exactly.
- Re-verify all contracts after any redeployment.

---

### 3.7 Cross-Chain Reconciliation Risk

**Risk:** AXUSD issued on Avalanche could diverge from the reserve position on Arbitrum One if reconciliation logic is not implemented for the Avalanche settlement adapter.

**Current posture:** Avalanche settlement is not yet integrated with Capinfra. This risk is not yet active.

**Mitigation required before mainnet:**
- Implement reserve reconciliation model for Avalanche AXUSD supply.
- Document reconciliation frequency and tolerance limits.

---

### 3.8 Admin Role Compromise Risk

**Risk:** If the DEFAULT_ADMIN_ROLE holder is compromised, the attacker can grant or revoke any role, pause/unpause, and modify compliance configuration.

**Current posture:** Admin is the Fuji deployer EOA (Fuji only, no real funds).

**Mitigation required before mainnet:**
- Move to Gnosis Safe with ≥ 2/N multi-party authorization.
- Safe threshold must be defined in the Operations Security Policy (to be created).

---

### 3.9 Compliance Module Misconfiguration Risk

**Risk:** Misconfigured compliance modules (e.g., transfer limit set too low, country list too restrictive) could block legitimate transfers.

**Current posture:** TransferLimitModule limit is currently 0 (unlimited). CountryAllowModule has `setAllowAll(true)`.

**Mitigation required before mainnet:**
- Define production compliance configuration before mainnet deployment.
- Test configuration changes on Fuji before applying to mainnet.

---

## 4. Emergency Procedures

### 4.1 Pause Token

**Use case:** Halt all transfers immediately (e.g., in response to a discovered exploit or regulatory directive).

**Command (via deployer EOA — Fuji only):**
```bash
cast send 0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8 \
  "pause()" \
  --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
  --private-key $DEPLOYER_PRIVATE_KEY
```

**Effect:** All `transfer()` and `transferFrom()` calls revert. Mint and burn are also blocked while paused.

**Verification:**
```bash
cast call 0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8 "paused()(bool)" \
  --rpc-url https://api.avax-test.network/ext/bc/C/rpc
# Expected: true
```

**Required role:** MINTER_ROLE (or DEFAULT_ADMIN) on AxiomStable3643Fuji.

---

### 4.2 Unpause Token

**Use case:** Restore transfers after a pause event has been resolved.

**Command:**
```bash
cast send 0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8 \
  "unpause()" \
  --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
  --private-key $DEPLOYER_PRIVATE_KEY
```

**Prerequisite:** Pause reason must be fully resolved and documented before unpausing.

---

### 4.3 Freeze Account

**Use case:** Freeze a specific wallet to prevent it from receiving transfers (e.g., sanctions match, fraud suspicion).

**Command:**
```bash
cast send 0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8 \
  "freezeAddress(address,bool)" <WALLET_ADDRESS> true \
  --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
  --private-key $DEPLOYER_PRIVATE_KEY
```

**Effect:** `transfer()` to the frozen address reverts. The frozen wallet can still send, but cannot receive.

**Required role:** AGENT_ROLE on AxiomStable3643Fuji.

---

### 4.4 Unfreeze Account

```bash
cast send 0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8 \
  "freezeAddress(address,bool)" <WALLET_ADDRESS> false \
  --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
  --private-key $DEPLOYER_PRIVATE_KEY
```

---

### 4.5 Change Transfer Limit

**Use case:** Reduce or increase the daily transfer limit enforced by TransferLimitModule.

**Command:**
```bash
# Set limit to 500 AXUSD (500 * 10^6 = 500000000 raw units)
cast send 0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc \
  "setTransferLimit(address,uint256)" \
  0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66 \
  500000000 \
  --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
  --private-key $DEPLOYER_PRIVATE_KEY
```

**Note:** First argument is the ModularCompliance address (`0x67F6d464…`). Second argument is the limit in 6-decimal units.

**Verify:**
```bash
cast call 0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc \
  "getTransferLimit(address)(uint256)" 0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66 \
  --rpc-url https://api.avax-test.network/ext/bc/C/rpc
# Returns raw uint256 — divide by 10^6 for AXUSD value
```

---

### 4.6 Remove or Replace a Compliance Module

**Remove a module:**
```bash
cast send 0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66 \
  "removeModule(address)" <MODULE_ADDRESS> \
  --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
  --private-key $DEPLOYER_PRIVATE_KEY
```

**Add a new module:**
```bash
cast send 0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66 \
  "addModule(address)" <NEW_MODULE_ADDRESS> \
  --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
  --private-key $DEPLOYER_PRIVATE_KEY
```

**Warning:** Removing a module immediately removes that compliance check from all future transfers. Ensure the replacement module is deployed and tested before removal.

---

### 4.7 Rotate Admin Roles

**Use case:** Transfer DEFAULT_ADMIN_ROLE to a new address (e.g., Safe migration).

**Step 1 — Grant role to new address:**
```bash
cast send <TOKEN_ADDRESS> \
  "grantRole(bytes32,address)" \
  "$(cast call <TOKEN_ADDRESS> "DEFAULT_ADMIN_ROLE()(bytes32)" --rpc-url <RPC>)" \
  <NEW_ADMIN_ADDRESS> \
  --rpc-url <RPC> --private-key $DEPLOYER_PRIVATE_KEY
```

**Step 2 — Verify grant:**
```bash
cast call <TOKEN_ADDRESS> "hasRole(bytes32,address)(bool)" \
  "$(cast call <TOKEN_ADDRESS> "DEFAULT_ADMIN_ROLE()(bytes32)" --rpc-url <RPC>)" \
  <NEW_ADMIN_ADDRESS> --rpc-url <RPC>
# Expected: true
```

**Step 3 — Renounce old role:**
```bash
cast send <TOKEN_ADDRESS> \
  "renounceRole(bytes32,address)" \
  "$(cast call <TOKEN_ADDRESS> "DEFAULT_ADMIN_ROLE()(bytes32)" --rpc-url <RPC>)" \
  $DEPLOYER_ADDRESS \
  --rpc-url <RPC> --private-key $DEPLOYER_PRIVATE_KEY
```

**Step 4 — Verify renounce:**
```bash
cast call <TOKEN_ADDRESS> "hasRole(bytes32,address)(bool)" \
  "$(cast call <TOKEN_ADDRESS> "DEFAULT_ADMIN_ROLE()(bytes32)" --rpc-url <RPC>)" \
  $DEPLOYER_ADDRESS --rpc-url <RPC>
# Expected: false
```

Do not renounce before confirming the new admin holds the role. Role renouncement is permanent without a new grant.

---

### 4.8 Respond to a Failed Smoke Test

1. Do not re-run smoke tests in isolation — understand the failure first.
2. Check the failed test ID and look up the expected behavior in Section 5 of the Deployment Runbook.
3. Read the on-chain state via `/operations/fuji-status` to confirm current token and compliance state.
4. If a wiring transaction is missing, recheck the deployment manifest at `deployments/avalanche/fuji-phase1.json`.
5. Fix the root cause on-chain (manual wiring transaction if needed).
6. Re-run the full smoke test suite to confirm all 15 pass.
7. Update `deployments/avalanche/fuji-smoke-results.json` with the new run.

---

### 4.9 Respond to RPC Outage

1. Confirm outage by checking the Avalanche network status page: https://status.avax.network
2. The `/operations/fuji-status` page will display the RPC failure banner automatically.
3. If monitoring depends on the Fuji public RPC, switch to an alternative endpoint:
   - Infura: `https://avalanche-fuji-c-chain.infura.io/v3/<KEY>`
   - Alchemy: `https://avax-fuji.g.alchemy.com/v2/<KEY>` (requires Alchemy plan with Avalanche)
4. Update `AVALANCHE_FUJI_RPC_URL` environment variable and restart the dev server.
5. Retry smoke tests after RPC recovery.

---

### 4.10 Respond to Explorer Verification Failure

If Sourcify or Routescan verification returns a mismatch:

1. Check that the compiler version and settings in `hardhat-avalanche/hardhat.config.mts` have not changed since deployment.
2. Check that the contract bytecode on-chain matches the compiled artifact in `hardhat-avalanche/artifacts/`.
3. Re-verify with explicit compiler settings:
   ```bash
   cd hardhat-avalanche
   npx hardhat verify --network avalancheFuji <ADDRESS> [CONSTRUCTOR_ARGS]
   ```
4. If still mismatched, the contract may have been deployed from a different build. Document the discrepancy.

---

## 5. Monitoring Reference

### 5.1 Current Monitoring (Fuji)

| Signal | Source | Frequency |
|---|---|---|
| Token state (supply, paused) | `/api/operations/fuji-status` | On demand / 60s auto-refresh |
| Deployer role status | `/api/operations/fuji-status` | On demand |
| Compliance module binding | `/api/operations/fuji-status` | On demand |
| Smoke test last run | `fuji-smoke-results.json` | On every manual smoke run |

### 5.2 Required Before Mainnet

- Automated smoke tests on a schedule (GitHub Actions CI or equivalent)
- Alert on: RPC failure, token paused (unexpected), role changes, compliance module added or removed
- Log all admin transactions to an append-only audit store
- Configure block explorer alerts for all 8 contract addresses

---

*Axiom Protocol Internal — Task #482*
