# Axiom Protocol — Avalanche Deployment Runbook

**Version:** 1.0.0  
**Network scope:** Avalanche Fuji Testnet (43113) · Avalanche C-Chain Mainnet (43114 — not yet deployed)  
**Last updated:** 2026-05-13 (Task #482)  
**Status:** Fuji complete · Mainnet pending promotion gates  

---

## 1. Network Overview

### 1.1 Avalanche Fuji Testnet

| Parameter | Value |
|---|---|
| Network name | Avalanche Fuji Testnet |
| Chain ID | 43113 |
| Native token | AVAX (testnet) |
| RPC endpoint | `https://api.avax-test.network/ext/bc/C/rpc` |
| Public explorer | `https://testnet.snowtrace.io` |
| Routescan explorer | `https://43113.testnet.routescan.io` |
| Verification API | Routescan (etherscan-compatible) |

### 1.2 Avalanche C-Chain Mainnet

| Parameter | Value |
|---|---|
| Network name | Avalanche C-Chain |
| Chain ID | 43114 |
| Native token | AVAX |
| RPC endpoint | `https://api.avax.network/ext/bc/C/rpc` |
| Explorer | `https://snowtrace.io` |
| Status | Not yet deployed — requires all mainnet promotion gates |

### 1.3 Required Environment Variables

```bash
# Deployment
AVALANCHE_DEPLOYER_PRIVATE_KEY=<fuji-only-key>    # Funded Fuji key, separate from DEPLOYER_PRIVATE_KEY
MULTICHAIN_ENABLED=true
CHAIN_AVALANCHE_ENABLED=true

# RPC
AVALANCHE_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc

# Verification
SNOWTRACE_API_KEY=<routescan-api-key>              # Used by hardhat-etherscan plugin via Routescan

# Smoke tests (read-only — same private key as deployer for Fuji signing)
DEPLOYER_PRIVATE_KEY=<same-as-above-for-fuji>
```

**Important:** `AVALANCHE_DEPLOYER_PRIVATE_KEY` must be a Fuji-only key. Do not reuse the Arbitrum deployer key. The mainnet key must be a separate key that is never committed or exposed.

### 1.4 Deployer and Test Wallets

| Role | Address | Notes |
|---|---|---|
| Fuji deployer | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` | Holds admin, minter, and agent roles |
| Fuji test wallet | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | Hardhat account #0 — Fuji-only, no private key in prod |
| Mainnet deployer | TBD | Separate key, never shared |
| Mainnet Safe | TBD | Gnosis Safe — must hold all admin/minter/agent roles post-deploy |

---

## 2. Contract Stack

### 2.1 Deployed Fuji Contracts

All 8 contracts are deployed and verified on Avalanche Fuji testnet.

---

#### IdentityRegistryStorage

| Field | Value |
|---|---|
| Address | `0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215` |
| Explorer | https://testnet.snowtrace.io/address/0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215 |
| Purpose | Persistent KYC data store. Holds the mapping of wallet addresses to ONCHAINID identity contracts. |
| Initialization | `init()` called post-deploy. Bound to IdentityRegistry via `bindIdentityRegistry()`. |
| Role in stack | Foundation of the ERC-3643 identity layer. Data persists independently of registry upgrades. |
| Production notes | No configuration change required. Storage contract is stateless beyond its data mappings. |

---

#### TrustedIssuersRegistry

| Field | Value |
|---|---|
| Address | `0x0dF7D62f7Eda24798f6840D5B10E453de097D324` |
| Explorer | https://testnet.snowtrace.io/address/0x0dF7D62f7Eda24798f6840D5B10E453de097D324 |
| Purpose | Maintains the list of trusted claim issuers (e.g., KYC providers). Only issuers in this registry can issue valid identity claims. |
| Initialization | `init()` called post-deploy. |
| Role in stack | Governs which entities can issue claims that satisfy IdentityRegistry verification. |
| Production notes | Must be populated with production KYC provider addresses before mainnet. |

---

#### ClaimTopicsRegistry

| Field | Value |
|---|---|
| Address | `0x207BE0EE444c82AC4252284a04e6D9101Dfa570c` |
| Explorer | https://testnet.snowtrace.io/address/0x207BE0EE444c82AC4252284a04e6D9101Dfa570c |
| Purpose | Defines which claim topics (e.g., KYC type 1) must be held for a wallet to be considered verified. |
| Initialization | `init()` called post-deploy. |
| Role in stack | Sets the claim topic requirements that IdentityRegistry validates against. |
| Production notes | Claim topic list must be reviewed against production KYC/AML requirements. |

---

#### IdentityRegistry

| Field | Value |
|---|---|
| Address | `0x75ed20d260292D869f9Ec4F035Db4B93072D7963` |
| Explorer | https://testnet.snowtrace.io/address/0x75ed20d260292D869f9Ec4F035Db4B93072D7963 |
| Purpose | Central ERC-3643 identity registry. Wraps IRS, TIR, and CTR. Provides `isVerified(address)` used by the token during transfer checks. |
| Initialization | `init(TIR, CTR, IRS)` called post-deploy. Deployer added as agent. |
| Role in stack | The gatekeeper — any transfer requires both sender and receiver to pass `isVerified()`. |
| Production notes | Must have a Safe-controlled agent address before mainnet. Deployer agent status must be revoked. |

---

#### ModularCompliance

| Field | Value |
|---|---|
| Address | `0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66` |
| Explorer | https://testnet.snowtrace.io/address/0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66 |
| Purpose | The compliance engine. Holds a list of compliance modules (CountryAllow, TransferLimit) and routes transfer checks through each. |
| Initialization | `init()` called post-deploy. Bound to token via `bindToken()`. Both modules added via `addModule()`. |
| Role in stack | Executes all compliance rules on every token transfer. Modules are checked in sequence. |
| Production notes | Token binding is immutable post-bind. Module list can be updated by compliance owner. |

---

#### CountryAllowModule

| Field | Value |
|---|---|
| Address | `0xe15Cf94D324cc8882015ed71C39F002e3709ec54` |
| Explorer | https://testnet.snowtrace.io/address/0xe15Cf94D324cc8882015ed71C39F002e3709ec54 |
| Purpose | Compliance module that restricts transfers based on investor country code. |
| Initialization | Added to ModularCompliance. `setAllowAll(MC, true)` called — **Fuji testnet only**. |
| Role in stack | Country-level transfer gating. In production, must enforce explicit jurisdiction allowlist. |
| **Production notes** | **`setAllowAll(true)` is FUJI TESTNET ONLY. Must be replaced with `setAllowedCountry()` calls for each approved jurisdiction before mainnet.** |

---

#### TransferLimitModule

| Field | Value |
|---|---|
| Address | `0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc` |
| Explorer | https://testnet.snowtrace.io/address/0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc |
| Purpose | Compliance module that enforces a per-wallet daily transfer limit. |
| Initialization | Added to ModularCompliance. Limit set to 200 AXUSD during smoke test T11, then reset to 0 (unlimited). |
| Role in stack | Prevents large unauthorized outflows. Limit of 0 means unlimited — production must set an explicit cap. |
| Production notes | Must set a production-appropriate daily transfer cap before mainnet via `setTransferLimit(MC, limit)`. |

---

#### AxiomStable3643Fuji (AXUSD token)

| Field | Value |
|---|---|
| Address | `0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8` |
| Explorer | https://testnet.snowtrace.io/address/0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8 |
| Purpose | ERC-3643 compliant AXUSD stablecoin. All transfers enforce compliance via ModularCompliance and identity via IdentityRegistry. |
| Initialization | Deployed with MC and IR addresses. Deployer holds DEFAULT_ADMIN, MINTER, and AGENT roles. |
| Role in stack | The token itself. Entry point for all mint, transfer, pause, freeze, and burn operations. |
| Production notes | Admin, minter, and agent roles must be transferred to Safe before mainnet. Deployer EOA must renounce all roles after transfer. |

---

### 2.2 Shared Contract Registry

All Fuji addresses are maintained in:

```
shared/contracts-avalanche.ts
```

The exported constant is `FUJI_CONTRACTS`. The `AVALANCHE_CONTRACTS` constant (mainnet) remains empty until mainnet promotion.

---

## 3. Deployment Sequence

The following sequence must be followed for every fresh deployment (Fuji or mainnet).

### Step 1 — Compile

```bash
npm run compile:avalanche
```

Expected output: 12 Solidity files compiled with solc 0.8.24, evm paris. Build artifacts written to `hardhat-avalanche/artifacts/`.

### Step 2 — Unit Tests

```bash
npm run test:avalanche
```

Expected output: 14/14 ERC-3643 Mocha tests green. No failures tolerated.

### Step 3 — Dry Run

```bash
npm run deploy:avalanche:fuji
```

Expected output: 8 simulated contract addresses printed. Wiring sequence logged. No transactions broadcast. No AVAX spent.

Verify the deploy script output matches the expected initialization order before broadcasting.

### Step 4 — Broadcast to Fuji

```bash
AVALANCHE_PHASE2_REAL_DEPLOY=true npm run deploy:avalanche:fuji
```

This flag unlocks the real broadcast. All 8 contracts are deployed in sequence. Deployer must have ≥ 0.5 AVAX on Fuji.

Monitor each transaction on `https://testnet.snowtrace.io`.

### Step 5 — Post-Deploy Initialization

See Section 4 (Post-Deploy Wiring) for the full 12-transaction wiring sequence that must immediately follow deployment.

### Step 6 — Write Deployment Artifacts

After all wiring transactions complete, the deploy script writes:

```
deployments/avalanche/fuji-phase1.json
```

This manifest contains all 8 contract addresses with `dryRun: false` and the deployment timestamp.

### Step 7 — Update Shared Contract Constants

Copy the deployed addresses into `shared/contracts-avalanche.ts` under `FUJI_CONTRACTS`. This makes addresses available to the rest of the monorepo.

### Step 8 — Verify Contracts on Routescan

```bash
cd hardhat-avalanche
npx hardhat verify --network avalancheFuji <CONTRACT_ADDRESS> [CONSTRUCTOR_ARGS]
```

Verification uses the Routescan etherscan-compatible API configured in `hardhat-avalanche/hardhat.config.mts` under `etherscan.customChains`.

Verify all 8 contracts. Confirmed Fuji verification URLs:

```
https://testnet.snowtrace.io/address/<address>#code
```

---

## 4. Post-Deploy Wiring

The following 12 transactions must be executed immediately after deployment. They are automated by the deploy script but documented here for manual recovery and audit purposes.

**All transactions are executed by the Fuji deployer: `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`**

| # | Transaction | Description |
|---|---|---|
| 1 | `IdentityRegistryStorage.init()` | Initializes IRS ownership. Must be called before binding to IR. |
| 2 | `TrustedIssuersRegistry.init()` | Initializes TIR ownership. Must be called before linking to IR. |
| 3 | `ClaimTopicsRegistry.init()` | Initializes CTR ownership. Must be called before linking to IR. |
| 4 | `IdentityRegistry.init(TIR, CTR, IRS)` | Wires the three sub-registries into the main IR. |
| 5 | `ModularCompliance.init()` | Initializes MC ownership. Must be called before binding to token. |
| 6 | `IdentityRegistryStorage.bindIdentityRegistry(IR)` | Binds IRS to IdentityRegistry — only IR can write to IRS after this. |
| 7 | `ModularCompliance.bindToken(AxiomStable3643Fuji)` | Locks MC to the AXUSD token. Binding is permanent. |
| 8 | `ModularCompliance.addModule(CountryAllowModule)` | Attaches CountryAllowModule to the compliance engine. |
| 9 | `ModularCompliance.addModule(TransferLimitModule)` | Attaches TransferLimitModule to the compliance engine. |
| 10 | `CountryAllowModule.setAllowAll(MC, true)` | **FUJI TESTNET ONLY.** Bypasses country gating for all investors. Must NOT be applied to mainnet. |
| 11 | `IdentityRegistry.addAgent(deployer)` | Grants deployer agent status in IR so it can register identities. |
| 12 | `IdentityRegistry.registerIdentity(deployer)` | Registers the deployer's own wallet so it can hold and transfer tokens. |

> **Warning:** Transaction #10 (`setAllowAll(true)`) is a testnet shortcut. On mainnet, replace with explicit `setAllowedCountry(MC, countryCode, true)` calls for each approved jurisdiction.

---

## 5. Smoke Test Procedure

### 5.1 Command

```bash
cd hardhat-avalanche
npx hardhat run ../scripts/smoke/avalanche/fuji-smoke.mts \
  --config hardhat.config.mts \
  --network avalancheFuji
```

### 5.2 Required Environment Variables

```bash
DEPLOYER_PRIVATE_KEY=<fuji-deployer-key>    # Must have AVAX on Fuji for signing
```

The smoke test script signs the write transactions (mint, register, transfer, pause, freeze) with the deployer key. All read-only calls use the same provider.

### 5.3 Expected Behavior

- The script connects to Fuji RPC and reads the current chain state.
- It runs 15 tests in sequence.
- Tests T01–T06 are read-only (no gas).
- Tests T07–T15 include write transactions that cost Fuji AVAX.
- All 15 tests should pass. Any FAIL is a blocking finding.

### 5.4 Expected Output

```
══════════════════════════════════════════════════════════════════
  Axiom Protocol — Avalanche Fuji Live Smoke Tests (Task #480)
══════════════════════════════════════════════════════════════════

Network:   avalancheFuji (chainId=43113)
Deployer:  0x8d7892CF226B43d48B6e3ce988A1274e6D114C96
Balance:   ~2.0 AVAX

── Read-only state checks ──────────────────────────────────────────

  [✓] T01: Token metadata
  [✓] T02: Deployer admin/minter/agent roles
  [✓] T03: ModularCompliance bound to AxiomStable3643Fuji
  [✓] T04: IdentityRegistry connected to TIR, CTR, IRS
  [✓] T05: CountryAllowModule and TransferLimitModule attached to MC
  [✓] T06: Deployer verified + agent in IdentityRegistry

── Write transactions ───────────────────────────────────────────────

  [✓] T07: Mint 1 000 AXUSD to deployer
  [✓] T08: Register second test wallet in IdentityRegistry
  [✓] T09: Transfer 100 AXUSD to registered test wallet
  [✓] T10: Transfer to unregistered wallet reverts
  [✓] T11: TransferLimitModule: over-limit reverts, under-limit passes
  [✓] T12: Pause blocks all transfers
  [✓] T13: Unpause restores transfers
  [✓] T14: Freeze blocks receiver; unfreeze restores transfers
  [✓] T15: Final state read — supply and balances

══════════════════════════════════════════════════════════════════
  Result: 15 / 15 PASSED
══════════════════════════════════════════════════════════════════
```

### 5.5 Output Artifacts

| Artifact | Location |
|---|---|
| Machine-readable results | `deployments/avalanche/fuji-smoke-results.json` |
| Human-readable report | `documents/chains/AXIOM_AVALANCHE_FUJI_SMOKE_REPORT.md` |

### 5.6 Validated Smoke Categories

| ID | Name | Type | Expected outcome |
|---|---|---|---|
| T01 | Token metadata | Read | name, symbol, decimals, supply, paused match expected |
| T02 | Role verification | Read | Deployer holds ADMIN, MINTER, AGENT |
| T03 | Compliance binding | Read | MC.getTokenBound() returns AXUSD address |
| T04 | Registry wiring | Read | IR references correct TIR, CTR, IRS |
| T05 | Module attachment | Read | MC.getModules() returns CAM and TLM addresses |
| T06 | Deployer identity | Read | IR.isVerified(deployer) and isAgent(deployer) true |
| T07 | Mint | Write | 1000 AXUSD minted to deployer, balance confirmed |
| T08 | Second wallet registration | Write | Test wallet registered in IdentityRegistry |
| T09 | Registered wallet transfer | Write | 100 AXUSD transferred to test wallet, balance confirmed |
| T10 | Unregistered wallet rejection | Write (expect revert) | Transfer to unregistered address reverts |
| T11 | Transfer limit enforcement | Write | Over-limit (300) reverts; under-limit (150) succeeds |
| T12 | Pause | Write | Pause applied; subsequent transfer reverts |
| T13 | Unpause | Write | Unpause applied; transfer resumes |
| T14 | Freeze and unfreeze | Write | Freeze blocks receiver; unfreeze restores |
| T15 | Final state reconciliation | Read | totalSupply=1000, deployer=744, testWallet=256, paused=false |

### 5.7 Interpreting Failures

| Failure type | Likely cause | Remediation |
|---|---|---|
| T01 FAIL | Incorrect ABI or wrong address | Confirm address in `shared/contracts-avalanche.ts` |
| T02 FAIL | Role not granted | Check deployer role assignments during deploy |
| T03 FAIL | `bindToken` did not execute | Re-run post-deploy wiring step 7 |
| T04 FAIL | `init(TIR, CTR, IRS)` mismatch | Confirm addresses in wiring step 4 |
| T05 FAIL | Module not added | Re-run wiring steps 8 or 9 |
| T06 FAIL | Agent not added or identity not registered | Re-run wiring steps 11 and 12 |
| T07–T15 FAIL | Wiring incomplete or wrong token | Verify all 12 wiring transactions confirmed on-chain |
| Any FAIL | Fuji RPC timeout | Retry with a stable RPC or wait for network recovery |

---

## 6. File Reference

| File | Purpose |
|---|---|
| `shared/contracts-avalanche.ts` | Canonical address registry for Fuji and mainnet |
| `deployments/avalanche/fuji-phase1.json` | Deployment manifest with addresses, timestamps, `dryRun: false` |
| `deployments/avalanche/fuji-smoke-results.json` | Task #480 smoke test results (15/15 PASS) |
| `scripts/smoke/avalanche/fuji-smoke.mts` | Executable smoke test script |
| `hardhat-avalanche/hardhat.config.mts` | Hardhat config with Fuji + Routescan verification |
| `hardhat-avalanche/contracts/` | Solidity source for all 8 deployed contracts |
| `pages/api/operations/fuji-status.ts` | API route for live on-chain Fuji state reads |
| `pages/operations/fuji-status.tsx` | Operations status page |
| `documents/chains/AXIOM_AVALANCHE_FUJI_CHECKLIST.md` | Pre/post deploy checklist |
| `documents/chains/AXIOM_AVALANCHE_FUJI_SMOKE_REPORT.md` | Task #480 smoke report |

---

*Axiom Protocol Internal — Task #482*
