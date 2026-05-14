# AXIOM AVALANCHE — Gate 6 Security Discovery

**Task:** Gate 6 — Security Review of Avalanche Phase 2 Stack  
**Phase:** A — Discovery  
**Date:** 2026-05-14  
**Scope:** Fuji testnet implementation only. No mainnet deployment. No Arbitrum changes.

---

## 1. Code and Contract Surfaces In Scope

### 1a. Capinfra adapter layer

| File | Purpose |
|---|---|
| `lib/capinfra/adapters/avalanche/index.ts` | Adapter entry point; exports `avalancheAdapter` |
| `lib/capinfra/adapters/avalanche/dispatcher.ts` | All dispatch logic: `toWei`, `resolveRoute`, `dryRunDispatch`, `liveDispatch`, `dispatchAvalanche` |
| `lib/capinfra/adapters/avalanche/config.ts` | Env-var config: mode, allowlist, RPC URL, key, chain enable gates |
| `lib/capinfra/adapters/registry.ts` | In-memory adapter map; `getAdapter(kind)` used by settlement.ts |
| `lib/capinfra/adapters/evm.ts` | EVM adapter (Arbitrum One); reviewed for regression comparison |
| `lib/capinfra/adapters/types.ts` | `SettlementAdapter`, `AdapterDispatchInput/Result`, `AdapterMode` |

### 1b. Settlement engine

| File | Purpose |
|---|---|
| `lib/capinfra/settlement.ts` | Full lifecycle: PENDING→AUTHORIZED→EXECUTING→SUBMITTED→SETTLED; rail mismatch check; adapter dispatch; portfolio write guard |
| `lib/capinfra/portfolio.ts` | `applySettlement` — position credit, ledger write; no settlementType conditional |

### 1c. Schema and migration

| File | Purpose |
|---|---|
| `shared/capInfraSchema.ts` | `capSettlementTypeEnum` includes AVALANCHE (after Task #483) |
| `migrations/0059_cap_settlement_type_avalanche.sql` | `ALTER TYPE "cap_settlement_type" ADD VALUE IF NOT EXISTS 'AVALANCHE'` |

### 1d. Contract deployment and fixtures

| File | Purpose |
|---|---|
| `shared/contracts-avalanche.ts` | Canonical address book: FUJI_CONTRACTS (populated), AVALANCHE_CONTRACTS (all empty) |
| `deployments/avalanche/fuji-phase1.json` | Deployment manifest: 8 addresses, dryRun=false, chainId=43113 |
| `hardhat-avalanche/hardhat.config.mts` | Isolated Hardhat config; networks: hardhat, avalancheFuji, avalanche (guarded) |

### 1e. Proof script and seed

| File | Purpose |
|---|---|
| `scripts/vault-sprint-avalanche-fuji.ts` | Gate 5 / Gate 6 invariant proof: A–G end-to-end |
| `scripts/capinfra-seed.ts` | Asset seed: AXUSD-FUJI with `settlementType='AVALANCHE'`; idempotent upsert |

### 1f. Smart contracts (Fuji)

| Contract | Address |
|---|---|
| IdentityRegistryStorage | `0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215` |
| TrustedIssuersRegistry | `0x0dF7D62f7Eda24798f6840D5B10E453de097D324` |
| ClaimTopicsRegistry | `0x207BE0EE444c82AC4252284a04e6D9101Dfa570c` |
| IdentityRegistry | `0x75ed20d260292D869f9Ec4F035Db4B93072D7963` |
| ModularCompliance | `0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66` |
| CountryAllowModule | `0xe15Cf94D324cc8882015ed71C39F002e3709ec54` |
| TransferLimitModule | `0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc` |
| AxiomStable3643Fuji | `0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8` |

All 8 verified on Routescan (Sourcify) — confirmed 2026-05-13.

---

## 2. Privileged Roles

### 2a. Smart contract roles (Fuji testnet)

| Role | Holder | Risk if compromised |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` (all 8 contracts) | Deployer EOA `0x8d7892…C96` | Full admin: grant/revoke any role, modify compliance, pause token |
| `AGENT_ROLE` (IdentityRegistry, AxiomStable3643Fuji) | Deployer EOA | Register identities, freeze wallets |
| `MINTER_ROLE` (AxiomStable3643Fuji) | Deployer EOA | Unrestricted mint |

Single EOA holds all roles on Fuji — acceptable for testnet; mainnet blockers G03–G06 address this.

### 2b. Capinfra operator role

| Role | Mechanism | Access |
|---|---|---|
| Capinfra admin | `x-admin-key` HTTP header (proof script) | Execute settlement instructions, trigger settle confirmation |
| Deployer/relayer | `DEPLOYER_PRIVATE_KEY` or `AVALANCHE_DEPLOYER_PRIVATE_KEY` | Signs on-chain transactions for LIVE dispatch |

---

## 3. Environment Variables and Secrets

| Variable | Purpose | Required for LIVE | Default |
|---|---|---|---|
| `AVALANCHE_ADAPTER_MODE` | DRY_RUN / LIVE / DISABLED | — | DRY_RUN |
| `AVALANCHE_ADAPTER_LIVE_ALLOWLIST` | Comma-separated asset symbols allowed for LIVE | LIVE | (empty → all DRY_RUN) |
| `AVALANCHE_RPC_URL` | C-Chain/Fuji RPC endpoint (fallback for Fuji) | LIVE | — |
| `AVALANCHE_FUJI_RPC_URL` | Fuji testnet preferred RPC (chainId=43113) | LIVE (preferred) | — |
| `AVALANCHE_DEPLOYER_PRIVATE_KEY` | Dedicated Fuji/Avalanche signer key | LIVE (preferred) | — |
| `DEPLOYER_PRIVATE_KEY` | Fallback signer key (shared with Arbitrum) | LIVE (fallback) | — |
| `MULTICHAIN_ENABLED` | Must be `"true"` for LIVE; otherwise liveDispatch throws | LIVE | unset |
| `CHAIN_AVALANCHE_ENABLED` | Must be `"true"` for LIVE; otherwise liveDispatch throws | LIVE | unset |
| `ADMIN_SOLVENCY_KEY` | HTTP auth for capinfra operator endpoints | proof script | — |

**Fail-closed behavior:**
- `AVALANCHE_ADAPTER_MODE` unset → DRY_RUN
- `AVALANCHE_RPC_URL` unset → throws before broadcast
- `DEPLOYER_PRIVATE_KEY` and `AVALANCHE_DEPLOYER_PRIVATE_KEY` both unset → throws
- `MULTICHAIN_ENABLED` ≠ `"true"` → throws
- `CHAIN_AVALANCHE_ENABLED` ≠ `"true"` → throws
- Asset symbol not in `AVALANCHE_ADAPTER_LIVE_ALLOWLIST` → degrades to DRY_RUN

---

## 4. LIVE Gating Conditions

All of the following must be true for a real transaction to be broadcast:

```
AVALANCHE_ADAPTER_MODE = 'LIVE'
AND MULTICHAIN_ENABLED = 'true'          ← assertChainEnabled()
AND CHAIN_AVALANCHE_ENABLED = 'true'     ← assertChainEnabled()
AND asset.symbol ∈ AVALANCHE_ADAPTER_LIVE_ALLOWLIST
AND asset.contractAddress is non-empty
AND asset.chainId ∈ SUPPORTED_LIVE_CHAIN_IDS ({43113, 43114})
AND AVALANCHE_RPC_URL (or AVALANCHE_FUJI_RPC_URL for 43113) is set
AND DEPLOYER_PRIVATE_KEY (or AVALANCHE_DEPLOYER_PRIVATE_KEY) is set
AND instruction.actionType ∈ {MINT, REDEEM, TRANSFER}
AND payloadJson.recipient is a valid 0x address (for MINT/TRANSFER)
```

Missing any condition → throws before broadcast (fail-closed).

---

## 5. DB Schema Changes from Migration 0059

**File:** `migrations/0059_cap_settlement_type_avalanche.sql`

```sql
ALTER TYPE "cap_settlement_type" ADD VALUE IF NOT EXISTS 'AVALANCHE';
```

**Impact analysis:**
- Additive only — Postgres enum values cannot be removed
- `IF NOT EXISTS` — idempotent on re-run
- All existing rows with INTERNAL / EVM / STELLAR / ACH / WIRE / SWIFT values are unchanged
- No column defaults changed
- No foreign keys affected (enum column, no FK on type values)
- `capSettlementTypeEnum` in `shared/capInfraSchema.ts` updated to match

**Note:** The enum also includes `'SWIFT'` (present in both DB and schema) and `'PLAID'` (not currently in schema but was in older versions). The registered adapter set does not include a PLAID or SWIFT adapter — `getAdapter('PLAID')` would throw NotFoundError. This is pre-existing and not a regression from Task #483.

---

## 6. State Transition Paths — Avalanche Settlement

```
createInstruction(settlementType='AVALANCHE')
  → PENDING

authorizeInstruction(instructionId)
  → AUTHORIZED

executeInstruction(instructionId)
  → rail mismatch check: asset.settlementType === instruction.settlementType
  → [non-ACH path] → EXECUTING
  → adapter = getAdapter('AVALANCHE')  [registry lookup]
  → adapter.dispatch({ instruction, asset })
    → dispatchAvalanche()
      → resolveMode() → DRY_RUN | LIVE | DISABLED
      → effectiveModeForAsset(symbol, mode) → checks allowlist
      → [DRY_RUN] dryRunDispatch() → synthetic 0xavadry-… ref, submitted=true
      → [LIVE] liveDispatch()
          → assertChainEnabled()
          → chainId ∈ SUPPORTED_LIVE_CHAIN_IDS
          → avalancheRpcUrl(chainId) → RPC endpoint
          → deployerPrivateKey() → signer
          → broadcast MINT/REDEEM/TRANSFER
          → returns tx.hash, submitted=true
  → [receipt.submitted=true] → SUBMITTED (no portfolio write)
  → [receipt.submitted=false] → SETTLED + applySettlement() ← not used by Avalanche

externallySettleInstruction(instructionId, externalRef, webhookEventId)
  → SUBMITTED → EXECUTING → SETTLED
  → applySettlement() → cap_positions credited

Duplicate externallySettleInstruction → ConflictError (terminal state)
```

---

## 7. Production Safety Boundaries

| Boundary | Implementation | Verified |
|---|---|---|
| Mainnet contracts empty | `AVALANCHE_CONTRACTS` all `""` in `shared/contracts-avalanche.ts` | ✓ |
| Avalanche adapter not active by default | `AVALANCHE_ADAPTER_MODE` defaults to DRY_RUN | ✓ |
| Both chain flags required for LIVE | `assertChainEnabled()` checks `MULTICHAIN_ENABLED` and `CHAIN_AVALANCHE_ENABLED` | ✓ |
| Per-asset allowlist | `AVALANCHE_ADAPTER_LIVE_ALLOWLIST` degrades to DRY_RUN if symbol absent | ✓ |
| EVM adapter limited to Arbitrum | `SUPPORTED_LIVE_CHAIN_IDS = {42161}` — refuses 43113/43114 | ✓ |
| AVALANCHE adapter limited to 43113/43114 | `SUPPORTED_LIVE_CHAIN_IDS = {43113, 43114}` — refuses 42161 | ✓ |
| Rail mismatch kills instruction | `settlement.ts` line 346: `asset.settlementType !== pre.settlementType` → FAILED | ✓ |
| SUBMITTED ≠ portfolio credit | No `applySettlement()` call on SUBMITTED path | ✓ |
| Terminal state immutable | SETTLED/FAILED/CANCELLED → ConflictError on any transition attempt | ✓ |
| Adapters are pure dispatchers | §0.1 isolation rule: adapters touch no portfolio/ledger/audit state | ✓ |
