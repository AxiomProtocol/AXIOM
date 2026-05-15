# AXIOM SUI PHASE 4 — DISCOVERY REPORT

**Document type:** Chain Integration Discovery  
**Phase:** Phase 4 — Foundation & Distribution-Layer Architecture  
**Chain:** Sui (non-EVM, Move VM)  
**Date:** 2026-05-15  
**Status:** DISCOVERY COMPLETE — scaffold written, no SDK installed  
**Classification:** Internal — architecture record  

---

## 1. Executive Summary

Sui is designated as the **distribution / community / diaspora layer** in the Axiom
multi-chain strategic model. It is NOT a settlement layer, NOT a reserve layer, and
NOT a contract execution layer in Axiom's canonical sense. Arbitrum One remains the
canonical execution environment for all live Axiom operations.

This document records the Phase 4 discovery findings: what already exists in the
codebase, what gaps remain, and what must be resolved before Phase 5 implementation
can begin.

---

## 2. Strategic Role

| Property | Value |
|---|---|
| Slug | `sui` |
| Chain type | Non-EVM (Move VM) |
| Strategic role | `distribution_community` |
| Primary capability | `distribution: true` |
| All other capabilities | `false` |
| Feature flag | `CHAIN_SUI_ENABLED` (requires `MULTICHAIN_ENABLED=true`) |
| Live status | `future` |
| Explorer | https://suiscan.xyz |
| Public RPC | https://fullnode.mainnet.sui.io |
| Native currency | SUI (9 decimals) |

---

## 3. Pre-Existing Scaffold (Found in Codebase)

All of the following were found to exist BEFORE Phase 4 work began:

### lib/chains/config.ts
- `ChainSlug` union includes `'sui'`
- `EvmChainSlug = Exclude<ChainSlug, 'sui'>` — correctly excludes Sui
- Full `ChainConfig` entry: `type: 'non_evm'`, `chainId: null`, `chainIdHex: null`
- `strategicRole: 'distribution_community'`
- `featureFlagEnvVar: 'CHAIN_SUI_ENABLED'`
- **Fix applied:** `blockExplorerUrl` corrected from `suiexplorer.com` (deprecated) to `suiscan.xyz`

### lib/chains/capabilities.ts
- `SUI_CAPABILITIES` fully defined: `distribution: true`, all others `false`
- `isChainEnabled('sui')` implemented: requires `MULTICHAIN_ENABLED=true` AND `CHAIN_SUI_ENABLED=true`
- `getChainCapabilities('sui')` available

### lib/chains/explorers.ts
- `sui` entry present
- **Fix applied:** URL corrected from `suiexplorer.com` to `suiscan.xyz`

### lib/chains/providers.ts
- `getSuiRpcUrl()` implemented: returns `null` unless `CHAIN_SUI_ENABLED=true`
- Includes non-EVM warning: do NOT pass to `ethers.JsonRpcProvider`
- `getChainRpcUrl('sui')` routes to `getSuiRpcUrl()`

### lib/chains/contracts.ts
- `SUI_CORE` placeholder entry exists: all fields `null`
- `CONTRACT_REGISTRY` includes `sui` entry with `hasDeployments: false`
- Comment notes: "Sui uses object IDs (32-byte) not EVM addresses"

---

## 4. Gaps Found and Addressed in Phase 4

### 4.1 Missing: shared/contracts-sui.ts
**Status:** CREATED in Phase 4  
**Location:** `shared/contracts-sui.ts`  
Pattern follows `shared/contracts-polygon.ts`. All Axiom object IDs are `null`.
Includes network config, `SUI_AXIOM_OBJECTS`, and `getSuiCoinType()` helper.
Includes Move vs EVM distinction documentation.

### 4.2 Missing: chainRegistry.ts entry
**Status:** ADDED in Phase 4  
Sui entry added to `lib/multichain/chainRegistry.ts` with:
- `status: 'planned'`
- `featureFlag: 'ENABLE_SUI_DISTRIBUTION_LAYER'`
- `automatedControlLayerSupport: null` (non-EVM, not applicable)
- All capability flags `false` except `paymentRailSupport: false`

### 4.3 Missing: IntegrationReadinessModel.ts artifacts
**Status:** ADDED in Phase 4  
Six `RequiredArtifact` records added for Sui in `lib/multichain/IntegrationReadinessModel.ts`:
- Distribution architecture decision (BLOCKING)
- `@mysten/sui` SDK package (BLOCKING)
- Move language capability (BLOCKING)
- Sui developer documentation
- Bridge partner selection (conditional on bridge model)
- Testnet credentials

### 4.4 Missing: featureFlags.ts entry
**Status:** ADDED in Phase 4  
`SUI_DISTRIBUTION_LAYER` added to `ExpansionFlag` union, `FLAG_DEFAULTS`, and
`CHAIN_SLUG_TO_FLAG` map in `lib/multichain/featureFlags.ts`.

### 4.5 Missing: @mysten/sui SDK
**Status:** NOT INSTALLED — deferred to Phase 5+  
Rationale: Phase 4 is architecture-only. Installing the SDK before the distribution
model is decided creates an unreviewed dependency. Phase 5 prerequisite.

### 4.6 Missing: Move packages
**Status:** NOT IN SCOPE for Phase 4  
No Move source files will be added until the distribution architecture is decided.

---

## 5. Sui vs EVM — Key Differences

| Aspect | EVM (Arbitrum, Polygon) | Sui (non-EVM) |
|---|---|---|
| VM | EVM (Ethereum Virtual Machine) | Move VM |
| Smart contracts | Solidity → EVM bytecode | Move packages |
| Contract addresses | 20-byte hex (0x...) | 32-byte object IDs |
| Token standard | ERC-20 | `Coin<T>` (Move type) |
| Chain ID | Numeric (e.g. 42161) | Genesis hash |
| Wallet format | Ethereum (secp256k1) | Sui (ed25519 / secp256k1) |
| SDK | ethers.js / viem | @mysten/sui |
| Alchemy support | Yes | No |
| RPC format | JSON-RPC (EVM-compatible) | Sui JSON-RPC (incompatible) |

---

## 6. Explorer URL Correction

The prior entry in `lib/chains/config.ts` and `lib/chains/explorers.ts` referenced
`https://suiexplorer.com`, which is the deprecated legacy Sui explorer maintained
by Mysten Labs and no longer actively updated.

**Current canonical explorer:** `https://suiscan.xyz`  
Alternative: `https://suivision.xyz`

Fix applied to both files in Phase 4.

---

## 7. What Remains Before Phase 5 Implementation

Priority order:

1. **[DECISION] Distribution architecture** — direct airdrop, claim contract, or bridge.
   Document: `AXIOM_SUI_PHASE4_DISTRIBUTION_DESIGN.md`

2. **[COLLECT] @mysten/sui SDK** — review and install after architecture decision.

3. **[BUILD] Move language capability** — internal or contracted Move developer required
   for any on-chain Sui package.

4. **[COLLECT] Sui developer documentation** — object model, Coin<T> standard,
   package publish flow.

5. **[CONDITIONAL] Bridge partner** — only if bridge model is chosen.

6. **[COLLECT] Testnet wallet + faucet** — Sui Testnet or Devnet for integration testing.

---

## 8. Environment Variables (Phase 4 State)

| Variable | Required | Phase 4 Status |
|---|---|---|
| `CHAIN_SUI_ENABLED` | No — defaults false | NOT SET — correct |
| `MULTICHAIN_ENABLED` | No — defaults false | NOT SET — correct |
| `SUI_RPC_URL` | No — optional override | NOT SET — public fallback used when enabled |

No new required env vars were introduced in Phase 4.
Missing Sui env vars do not break the build.

---

## 9. Chain Boundary Confirmation

Sui is Phase 4 ONLY — no live operations:
- No mainnet transactions
- No token issuance
- No bridge
- No wallet connection changes
- No frontend UI changes
- CHAIN_SUI_ENABLED remains `false` in all environments

Arbitrum One remains the canonical execution layer for all live Axiom operations.
Polygon remains the authorized payments/treasury routing layer (Phase 5, authorized 2026-05-15).
