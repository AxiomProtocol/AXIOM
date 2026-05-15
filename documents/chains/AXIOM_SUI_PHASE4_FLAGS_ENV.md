# AXIOM SUI PHASE 4 — FEATURE FLAGS & ENVIRONMENT VARIABLES

**Document type:** Operations Reference  
**Phase:** Phase 4 — Foundation & Distribution-Layer Architecture  
**Chain:** Sui (non-EVM, Move VM)  
**Date:** 2026-05-15  
**Classification:** Internal — ops reference  

---

## 1. Summary

Sui integration is controlled by two independent flag systems that both default to
`false`. No Sui behavior will activate in any environment unless both systems are
explicitly enabled. Missing Sui env vars do NOT break the build or affect live systems.

---

## 2. Flag Systems

Axiom uses two coexisting flag systems for multi-chain expansion:

### System 1 — lib/chains/capabilities.ts (New / Strategic Model)

Controls the `lib/chains/` provider, capability, and explorer modules.

| Variable | Values | Default |
|---|---|---|
| `MULTICHAIN_ENABLED` | `true` / `false` | `false` |
| `CHAIN_SUI_ENABLED` | `true` / `false` | `false` |

**Logic:** Sui is enabled only when BOTH flags are `true`.

```
isChainEnabled('sui') = MULTICHAIN_ENABLED === 'true' AND CHAIN_SUI_ENABLED === 'true'
```

When `CHAIN_SUI_ENABLED=false` (default):
- `getSuiRpcUrl()` returns `null`
- `isChainCapable('sui', 'distribution')` returns `false`
- `getChainCapabilities('sui').enabled` returns `false`

### System 2 — lib/multichain/featureFlags.ts (Legacy / Role-Based Model)

Controls the older expansion flag system. Used by some admin APIs and the
chain readiness model.

| Variable | Values | Default |
|---|---|---|
| `ENABLE_SUI_DISTRIBUTION_LAYER` | `true` / `false` | `false` |

**Logic:**
```
isExpansionEnabled('SUI_DISTRIBUTION_LAYER') = ENABLE_SUI_DISTRIBUTION_LAYER === 'true'
```

---

## 3. Optional RPC Override

| Variable | Purpose | Required |
|---|---|---|
| `SUI_RPC_URL` | Override public Sui RPC endpoint | No |

When `SUI_RPC_URL` is not set, `getSuiRpcUrl()` falls back to
`https://fullnode.mainnet.sui.io` when the chain is enabled.

**Important:** Do NOT pass this URL to `ethers.JsonRpcProvider` or `viem`.
It must only be used with the `@mysten/sui` SDK.

---

## 4. No New Required Variables

Phase 4 introduced zero new required environment variables. All Sui-related
env vars are optional and default safely to disabled. The following variables
may exist but are not set in any current environment:

| Variable | Set in any environment? |
|---|---|
| `CHAIN_SUI_ENABLED` | No |
| `ENABLE_SUI_DISTRIBUTION_LAYER` | No |
| `SUI_RPC_URL` | No |

The absence of all three is correct and expected for Phase 4.

---

## 5. Activation Sequence (Future — Phase 7+)

When Sui is ready for mainnet activation (Phase 7+), the following sequence applies:

1. Confirm Move package is deployed and object IDs are populated in `shared/contracts-sui.ts`
2. Confirm ops review and accepted-risk record are signed
3. Set in shared environment (Replit Secrets):
   ```
   MULTICHAIN_ENABLED=true
   CHAIN_SUI_ENABLED=true
   ENABLE_SUI_DISTRIBUTION_LAYER=true
   SUI_RPC_URL=https://fullnode.mainnet.sui.io   # or dedicated node
   ```
4. Restart server and verify:
   - `isChainEnabled('sui')` returns `true`
   - `getSuiRpcUrl()` returns a non-null URL
   - `isChainCapable('sui', 'distribution')` returns `true`

**Do NOT set these flags before Phase 7 authorization.**

---

## 6. Flag State Reference Table

| Flag | Current Value | Expected Phase 4 |
|---|---|---|
| `MULTICHAIN_ENABLED` | false (not set) | false — correct |
| `CHAIN_SUI_ENABLED` | false (not set) | false — correct |
| `ENABLE_SUI_DISTRIBUTION_LAYER` | false (not set) | false — correct |
| `SUI_RPC_URL` | not set | not set — correct |

---

## 7. Relationship to Polygon Flags

The Polygon flags are independent and should not be confused with Sui flags:

| Flag | Chain | Phase 4 State |
|---|---|---|
| `CHAIN_POLYGON_ENABLED` | Polygon | `true` (Phase 5 authorized) |
| `CHAIN_SUI_ENABLED` | Sui | `false` (Phase 4 — not yet) |
| `ENABLE_POLYGON_IDENTITY_BRIDGE` | Polygon | `false` (legacy) |
| `ENABLE_SUI_DISTRIBUTION_LAYER` | Sui | `false` (correct) |
