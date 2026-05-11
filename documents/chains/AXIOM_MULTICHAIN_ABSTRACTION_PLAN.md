# AXIOM MULTICHAIN ABSTRACTION PLAN
**Phase 3 — Safe Abstraction Plan**  
Generated: 2026-05-11  
Status: Implementation guide for Phase 4 scaffold  

---

## 1. Guiding Principles

This plan follows a **minimum safe abstraction** approach. The goal is not to
refactor everything — it is to add the thinnest possible layer that:

1. Preserves all existing Arbitrum behavior as the default
2. Makes future multi-chain work structurally sound (not ad-hoc)
3. Introduces no new required environment variables
4. Does not delete, rename, or rewrite any existing functionality

**Additive only. No deletions. No renames. No route changes.**

---

## 2. Provider Abstraction Needs

### Current state
RPC provider URLs are constructed inline in multiple files:
- `lib/config.ts` — `getArbitrumRpcUrl()`
- `lib/services/ERC3643Service.ts` — inline Alchemy URL
- `lib/web3/wagmiConfig.ts` — inline Alchemy URL per chain
- Scattered `pages/api/` routes — inline `arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`

### Required abstraction
A centralized `lib/chains/providers.ts` module that:
- Returns the correct RPC URL for any supported chain ID
- Defaults to Arbitrum One behavior when no specific chain is configured
- Reads from existing environment variables (`ALCHEMY_API_KEY`, `ARBITRUM_RPC_URL`)
- Introduces new optional env vars for expansion chains (`AVALANCHE_RPC_URL`, `POLYGON_RPC_URL`, `SUI_RPC_URL`) that all fall back gracefully when absent

### What NOT to do
- Do **not** modify existing inline URL construction — `lib/config.ts`, `ERC3643Service.ts`, and others can continue to use their own patterns
- Do **not** force existing services to go through the new provider factory
- The new provider factory is for new code only

---

## 3. Contract Registry Abstraction Needs

### Current state
`shared/contracts.ts` is the single source of truth for all deployed Arbitrum
contracts. It is well-structured and must not be modified.

### Required abstraction
A `lib/chains/contracts.ts` module that:
- Defines a typed `ContractRegistryEntry` interface for multi-chain contract addresses
- Provides an Arbitrum section that reads from `shared/contracts.ts` (by reference — not by copy)
- Provides empty/placeholder sections for Avalanche, Polygon, and Sui
- All placeholder sections return `null` when queried — never throw
- Has a `getContractAddress(chainSlug, contractKey)` helper that returns `null` for unconfigured chains

### What NOT to do
- Do **not** duplicate any contract addresses from `shared/contracts.ts`
- Do **not** modify `shared/contracts.ts`
- Do **not** import the new registry from any existing live service

---

## 4. Token / Asset Registry Abstraction Needs

### Current state
`lib/assets/registry.ts` and `lib/tokens.ts` are Arbitrum-native. They define
asset metadata tied to Arbitrum contract addresses.

### Required abstraction
The `lib/chains/config.ts` module should define:
- A `SupportedChain` type with Arbitrum, Avalanche, Polygon, and Sui entries
- Chain metadata (chain ID, name, native currency, block time)
- A `getChainConfig(slug)` helper that returns `null` for unconfigured chains

No changes to `lib/assets/registry.ts` or `lib/tokens.ts`.

---

## 5. Chain Capability Flags

### Current state
`lib/multichain/featureFlags.ts` provides `ENABLE_*` flags for the expansion
model (Polygon, Avalanche, Stellar, Canton, Cosmos). These use the naming
convention `ENABLE_<CHAIN>_<ROLE>`.

### New abstraction
A `lib/chains/capabilities.ts` module that:
- Uses a simpler `CHAIN_<CHAIN>_ENABLED` naming convention for the updated strategic model
- Covers the three new strategic expansion targets: Avalanche, Polygon, Sui
- All capabilities default to `false`
- Reads from environment variables: `CHAIN_AVALANCHE_ENABLED`, `CHAIN_POLYGON_ENABLED`, `CHAIN_SUI_ENABLED`
- Also includes a global `MULTICHAIN_ENABLED` gate that must be `true` for any chain to activate
- Provides a `isChainCapable(slug, capability)` helper

### Relationship to existing `lib/multichain/featureFlags.ts`
The new `lib/chains/capabilities.ts` is **not a replacement** for
`lib/multichain/featureFlags.ts`. The two systems can coexist:
- `lib/multichain/featureFlags.ts` — covers the original expansion model (Polygon identity bridge, Avalanche capital zone, Stellar payments, Canton, Cosmos)
- `lib/chains/capabilities.ts` — covers the updated strategic model (Avalanche reserve/policy core, Polygon payments/settlement, Sui distribution)

Neither imports from the other.

---

## 6. Explorer / Bridge / RPC Config Layers

### Current state
Explorer URLs are scattered:
- `lib/property/explorerLinks.ts` — Arbiscan hard-coded
- `shared/contracts.ts` — Blockscout in `NETWORK_CONFIG.blockExplorer`
- `lib/multichain/chainRegistry.ts` — per-chain explorers in metadata (correctly typed)

### Required abstraction
A `lib/chains/explorers.ts` module that:
- Defines a canonical map of `chainSlug → explorer base URL`
- Provides `getTxUrl(chainSlug, txHash)` and `getAddressUrl(chainSlug, address)` helpers
- Defaults to Arbitrum (Blockscout) when chain slug is unknown or unconfigured
- Arbitrum entry matches `shared/contracts.ts` NETWORK_CONFIG exactly
- Does **not** modify `lib/property/explorerLinks.ts`

### What NOT to do
- Do not modify `lib/property/explorerLinks.ts` — it is used in active property payment flows
- Do not change any existing Arbiscan/Blockscout URL references

---

## 7. Feature Flag Requirements

Full detail in `documents/chains/AXIOM_MULTICHAIN_FLAGS_AND_ENV.md`.

Summary:
- `MULTICHAIN_ENABLED=false` — global gate for all expansion chain work
- `CHAIN_AVALANCHE_ENABLED=false` — gates Avalanche capability
- `CHAIN_POLYGON_ENABLED=false` — gates Polygon capability
- `CHAIN_SUI_ENABLED=false` — gates Sui capability
- All flags default to `false` and must be explicitly set to `'true'`

---

## 8. Environment Variable Changes Needed

### New optional variables (all safe to omit — existing behavior preserved)

| Variable | Default Behavior When Absent |
|----------|------------------------------|
| `MULTICHAIN_ENABLED` | `false` — all expansion chains disabled |
| `CHAIN_AVALANCHE_ENABLED` | `false` — Avalanche disabled |
| `CHAIN_POLYGON_ENABLED` | `false` — Polygon disabled |
| `CHAIN_SUI_ENABLED` | `false` — Sui disabled |
| `AVALANCHE_RPC_URL` | `null` — Avalanche provider unavailable |
| `POLYGON_RPC_URL` | `null` — Polygon provider unavailable |
| `SUI_RPC_URL` | `null` — Sui provider unavailable |
| `AVALANCHE_ALCHEMY_NETWORK` | `null` — no Alchemy Avalanche key |
| `POLYGON_ALCHEMY_NETWORK` | `null` — no Alchemy Polygon key |

### Existing variables that must not change meaning

| Variable | Current Meaning | Must Stay |
|----------|----------------|-----------|
| `ALCHEMY_API_KEY` | Arbitrum + Ethereum Alchemy key | Unchanged |
| `ARBITRUM_RPC_URL` | Fallback Arbitrum RPC | Unchanged |
| `DEPLOYER_PRIVATE_KEY` | Arbitrum deployer key | Unchanged |
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | Client-side Alchemy key | Unchanged |
| All `INCREASE_*` vars | Banking rail config | Unchanged |
| All `NEXT_PUBLIC_*` vars | Client-safe config | Unchanged |

---

## 9. Deployment Isolation Boundaries

These boundaries ensure that no current deployment path requires new secrets:

### Boundary 1: `lib/chains/` is import-only from new code
The new `lib/chains/` modules must not be imported by any existing live
service, API route, or component. They are available for future code to import.

### Boundary 2: All capability checks fail-safe to false
If `CHAIN_AVALANCHE_ENABLED` is not set, `isChainCapable('avalanche', '*')`
returns `false`. No code path should throw when a chain is disabled.

### Boundary 3: All provider lookups fail-safe to null
`getChainProvider('avalanche')` returns `null` when no Avalanche RPC is
configured. Callers must handle null.

### Boundary 4: Explorer fallback to Arbitrum
`getTxUrl('unknown-chain', txHash)` returns an Arbitrum Blockscout URL.
No page renders a broken explorer link because of a missing chain config.

### Boundary 5: Contract registry returns null for unconfigured chains
`getContractAddress('avalanche', 'axusd')` returns `null`. Callers must handle
null — not throw or render empty.

---

## 10. What NOT to Abstract (Explicitly)

| System | Reason to Leave Alone |
|--------|----------------------|
| `lib/utils/assertArbitrumOne.ts` | Wallet security guard — must stay until multi-chain wallet support is intentionally designed |
| `pages/api/auth/siwe/verify.ts` | Authentication is chain-tied — multi-chain auth is a separate project |
| `lib/reserves/` | Reserve accounting is canonical — abstraction requires explicit migration plan |
| `lib/axau/` | Reserve layer — same rationale as reserves |
| `lib/capinfra/` | Banking rails — abstraction requires explicit integration work |
| `shared/contracts.ts` | Production contract addresses — cannot be abstracted without risk |
| `lib/web3/wagmiConfig.ts` | Wallet config — changing breaks wallet UX |
| `lib/multichain/` | Already well-abstracted — do not modify or replace |
| All hardhat configs | Deployment infrastructure — not part of abstraction scope |

---

## 11. Proposed Implementation Files

The minimum safe scaffold consists of exactly these files:

```
lib/chains/
  config.ts        — Chain metadata registry (Arbitrum, Avalanche, Polygon, Sui)
  capabilities.ts  — Feature-flagged chain capability map
  providers.ts     — Non-breaking RPC provider factory
  explorers.ts     — Explorer URL mapping with Arbitrum default
  contracts.ts     — Contract address registry structure
  index.ts         — Barrel export
```

Each file is additive only. No existing file is modified. No existing import
is changed. No existing route is altered.

---

*Plan authored by Axiom Protocol architecture agent, Phase 3 of multi-chain expansion.*
