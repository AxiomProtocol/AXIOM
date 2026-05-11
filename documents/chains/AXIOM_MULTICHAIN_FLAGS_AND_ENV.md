# AXIOM MULTICHAIN FLAGS AND ENVIRONMENT VARIABLES
**Phase 5 — Feature Flag / Deployment Safety**  
Generated: 2026-05-11  
Status: Reference document — update when new flags are added  

---

## 1. Design Principles

- All new chain work is **disabled by default**
- The existing build succeeds with only current environment variables
- Current deployment does not require Avalanche, Polygon, or Sui credentials
- No current page renders empty or broken because of missing multi-chain config
- Every flag defaults to `false` and must be explicitly set to `'true'` (string) to activate

---

## 2. Global Gate

### `MULTICHAIN_ENABLED`

| Property | Value |
|----------|-------|
| **Default** | `false` (absent = false) |
| **Type** | `'true'` \| `'false'` \| absent |
| **Location** | `lib/chains/capabilities.ts` |
| **Effect when false** | All expansion chains (Avalanche, Polygon, Sui) are disabled regardless of their individual flags |
| **Effect when true** | Individual chain flags are evaluated |
| **Required for current deployment** | No — absent means false = existing behavior |

**Usage:**
```ts
import { isMultichainEnabled } from '@/lib/chains/capabilities';
if (!isMultichainEnabled()) return; // skip all multi-chain logic
```

---

## 3. Chain-Specific Flags

### `CHAIN_AVALANCHE_ENABLED`

| Property | Value |
|----------|-------|
| **Default** | `false` (absent = false) |
| **Type** | `'true'` \| `'false'` \| absent |
| **Location** | `lib/chains/capabilities.ts` |
| **Effect when false** | All Avalanche-specific code paths return null/disabled |
| **Effect when true** | Avalanche capability queries return their configured values |
| **Required for current deployment** | No |
| **Must also set** | `MULTICHAIN_ENABLED=true` and `AVALANCHE_RPC_URL` (or Alchemy Avalanche) |
| **Prerequisite** | Architecture decision (C-Chain vs Subnet), SDK review |

### `CHAIN_POLYGON_ENABLED`

| Property | Value |
|----------|-------|
| **Default** | `false` (absent = false) |
| **Type** | `'true'` \| `'false'` \| absent |
| **Location** | `lib/chains/capabilities.ts` |
| **Effect when false** | All Polygon-specific code paths return null/disabled |
| **Effect when true** | Polygon capability queries return their configured values |
| **Required for current deployment** | No |
| **Must also set** | `MULTICHAIN_ENABLED=true` and `POLYGON_RPC_URL` (or Alchemy Polygon) |
| **Prerequisite** | Architecture decision (Polygon ID vs ONCHAINID mirror), SDK review |

### `CHAIN_SUI_ENABLED`

| Property | Value |
|----------|-------|
| **Default** | `false` (absent = false) |
| **Type** | `'true'` \| `'false'` \| absent |
| **Location** | `lib/chains/capabilities.ts` |
| **Effect when false** | All Sui-specific code paths return null/disabled |
| **Effect when true** | Sui capability queries return their configured values |
| **Required for current deployment** | No |
| **Must also set** | `MULTICHAIN_ENABLED=true` and `SUI_RPC_URL` |
| **Prerequisite** | Sui adapter interface design, `@mysten/sui.js` SDK review |

---

## 4. Existing Expansion Flags (from `lib/multichain/featureFlags.ts`)

These flags predate the `lib/chains/` layer and control the original expansion
model. They are separate from the `CHAIN_*_ENABLED` flags and remain valid.

| Flag | Env Key | Default | Controls |
|------|---------|---------|---------|
| `POLYGON_IDENTITY_BRIDGE` | `ENABLE_POLYGON_IDENTITY_BRIDGE` | `false` | Polygon identity credential bridge |
| `AVALANCHE_CAPITAL_ENV` | `ENABLE_AVALANCHE_CAPITAL_ENV` | `false` | Avalanche permissioned capital zone |
| `STELLAR_PAYMENTS_RAIL` | `ENABLE_STELLAR_PAYMENTS_RAIL` | `false` | Stellar payment corridor |
| `CANTON_INSTITUTIONAL_BRIDGE` | `ENABLE_CANTON_INSTITUTIONAL_BRIDGE` | `false` | Canton institutional bridge |
| `COSMOS_SOVEREIGN_PREP` | `ENABLE_COSMOS_SOVEREIGN_PREP` | `false` | Cosmos sovereign chain preparation |

All default to `false`. None are required for current deployment.

---

## 5. New Optional RPC Environment Variables

These variables are **not required** for the current deployment. If absent, the
corresponding chain provider returns `null` and all chain-dependent code paths
short-circuit safely.

| Variable | Purpose | Default Behavior When Absent |
|----------|---------|------------------------------|
| `AVALANCHE_RPC_URL` | Avalanche JSON-RPC endpoint | `null` — Avalanche provider unavailable |
| `POLYGON_RPC_URL` | Polygon JSON-RPC endpoint | `null` — Polygon provider unavailable |
| `SUI_RPC_URL` | Sui JSON-RPC endpoint | `null` — Sui provider unavailable |
| `AVALANCHE_ALCHEMY_NETWORK` | Alchemy network ID for Avalanche (e.g. `avax-mainnet`) | `null` — Alchemy Avalanche path unused |
| `POLYGON_ALCHEMY_NETWORK` | Alchemy network ID for Polygon (e.g. `polygon-mainnet`) | `null` — Alchemy Polygon path unused |

---

## 6. Existing Environment Variables That Must NOT Change

These variables control current live behavior. Their meaning is frozen.

| Variable | Current Meaning |
|----------|----------------|
| `ALCHEMY_API_KEY` | Arbitrum + Ethereum Alchemy key (server-side) |
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | Arbitrum Alchemy key (client-safe) |
| `ARBITRUM_RPC_URL` | Override for Arbitrum public RPC |
| `DEPLOYER_PRIVATE_KEY` | Arbitrum deployer wallet key |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project for wallet modal |
| All `INCREASE_*` | Increase.com banking rail credentials |
| All `CIRCLE_*` | Circle treasury credentials |
| `ONRAMP_DEFAULT_CHAIN_ID` | Default chain for onramp (defaults to 42161) |
| All database `DATABASE_URL` / `*_DATABASE_URL` | Postgres connection strings |

---

## 7. `.env.example` Additions

The following block should be appended to `.env.example` when the `lib/chains/`
scaffold is activated in a real environment (not required now — included here for
reference):

```env
# ============================================
# MULTICHAIN EXPANSION FLAGS (all disabled by default)
# ============================================

# Global multi-chain gate — must be 'true' to enable any expansion chain.
# Leave absent or set to 'false' to keep existing Arbitrum-only behavior.
MULTICHAIN_ENABLED=false

# Avalanche expansion flag.
# Requires MULTICHAIN_ENABLED=true and AVALANCHE_RPC_URL to be functional.
CHAIN_AVALANCHE_ENABLED=false

# Polygon expansion flag.
# Requires MULTICHAIN_ENABLED=true and POLYGON_RPC_URL to be functional.
CHAIN_POLYGON_ENABLED=false

# Sui expansion flag.
# Requires MULTICHAIN_ENABLED=true and SUI_RPC_URL to be functional.
CHAIN_SUI_ENABLED=false

# ============================================
# EXPANSION CHAIN RPC ENDPOINTS (optional)
# ============================================

# Avalanche C-Chain or Subnet RPC URL.
# Leave blank — Avalanche provider returns null when not set.
AVALANCHE_RPC_URL=

# Polygon Mainnet RPC URL.
# Leave blank — Polygon provider returns null when not set.
POLYGON_RPC_URL=

# Sui Mainnet RPC URL.
# Leave blank — Sui provider returns null when not set.
SUI_RPC_URL=
```

---

## 8. Deployment Safety Checklist

Before enabling any chain flag in a deployed environment, verify:

- [ ] `MULTICHAIN_ENABLED=true` only in environments where expansion is intentional
- [ ] Individual chain flag (`CHAIN_AVALANCHE_ENABLED`, etc.) only set after SDK review, architecture decision, and implementation complete
- [ ] Corresponding `*_RPC_URL` or Alchemy network configured and verified
- [ ] Feature flag tested in staging before production
- [ ] Existing Arbitrum contract integrations verified still working
- [ ] No new required env vars added without updating deployment docs
- [ ] `lib/multichain/featureFlags.ts` `ENABLE_*` flags remain false until implementation is complete (separate from `CHAIN_*_ENABLED`)

---

## 9. Current Required vs Optional Summary

| Env Var | Required Now? | Notes |
|---------|--------------|-------|
| All existing vars | Yes (unchanged) | Current live behavior |
| `MULTICHAIN_ENABLED` | No | Absent = false = Arbitrum-only |
| `CHAIN_AVALANCHE_ENABLED` | No | Absent = false |
| `CHAIN_POLYGON_ENABLED` | No | Absent = false |
| `CHAIN_SUI_ENABLED` | No | Absent = false |
| `AVALANCHE_RPC_URL` | No | Absent = null provider |
| `POLYGON_RPC_URL` | No | Absent = null provider |
| `SUI_RPC_URL` | No | Absent = null provider |

---

*Document authored by Axiom Protocol architecture agent, Phase 5 of multi-chain expansion.*
