# Axiom Protocol — Polygon Phase 3 Flags and Environment Variables

**Document type:** Phase E — Flag and Environment Reference  
**Phase:** Polygon Phase 3 — Foundation and Architecture  
**Created:** 2026-05-14  
**Status:** REFERENCE — all values optional; none required for current deployment  

---

## 1. Design Principle

All Polygon environment variables are optional. The current production
deployment does not require any of them. If any variable is absent, the
system behaves exactly as if Polygon does not exist. No existing route,
build step, or runtime behavior depends on Polygon configuration.

The flag hierarchy is:

```
MULTICHAIN_ENABLED=true
  └─ CHAIN_POLYGON_ENABLED=true
       └─ Polygon capability checks return configured values
       └─ getPolygonRpcUrl() returns a URL
       └─ isChainCapable('polygon', 'payments') → true
```

Both `MULTICHAIN_ENABLED` and `CHAIN_POLYGON_ENABLED` must be `true` for
any Polygon code path to activate. Either absent or `false` keeps Polygon
fully disabled.

---

## 2. Global Gate (already documented — preserved here for Polygon context)

### `MULTICHAIN_ENABLED`

| Property | Value |
|---|---|
| Default | `false` (absent = false) |
| Type | `'true'` / `'false'` / absent |
| Defined in | `lib/chains/capabilities.ts` → `isMultichainEnabled()` |
| Effect when false | All expansion chains (Avalanche, Polygon, Sui) disabled regardless of individual flags |
| Effect when true | Individual chain flags are evaluated |
| Required for current deployment | NO |
| Required for Polygon Phase 3 scaffold | NO — scaffold is additive, no runtime activation |
| Required for any Polygon payment execution | YES |

---

## 3. Polygon-Specific Flags

### `CHAIN_POLYGON_ENABLED`

| Property | Value |
|---|---|
| Default | `false` (absent = false) |
| Type | `'true'` / `'false'` / absent |
| Defined in | `lib/chains/capabilities.ts` → `isChainEnabled('polygon')` |
| Effect when false | `getPolygonRpcUrl()` returns null; all `isChainCapable('polygon', *)` return false; contract registry returns null for polygon |
| Effect when true | Polygon capability queries return configured values; RPC URL resolves |
| Required for current deployment | NO |
| Must also set | `MULTICHAIN_ENABLED=true` |
| Environment target | Staging only during Phase 3; never production until Phase 4 approved |

**Usage in code:**
```ts
import { isChainEnabled, isChainCapable } from '@/lib/chains/capabilities';

// Gate any Polygon logic:
if (!isChainEnabled('polygon')) return;

// Check specific capability:
if (!isChainCapable('polygon', 'payments')) return;
```

---

## 4. Polygon RPC and Network

### `POLYGON_RPC_URL`

| Property | Value |
|---|---|
| Default | `null` (absent = null; falls back to Alchemy if key present, then public fallback) |
| Type | URL string or absent |
| Defined in | `lib/chains/providers.ts` → `getPolygonRpcUrl()` |
| Fallback chain | Alchemy `matic` network (if `ALCHEMY_API_KEY` present) → `https://polygon-rpc.com` |
| Effect when absent | `getPolygonRpcUrl()` uses Alchemy or public fallback if chain is enabled |
| Required for current deployment | NO |
| Required for Polygon Phase 3 scaffold | NO |
| Required for staging Polygon smoke test | YES (or configure Alchemy `matic`) |
| Recommended value (staging) | Alchemy Polygon endpoint or `https://polygon-rpc.com` |

**Usage in code:**
```ts
import { getPolygonRpcUrl } from '@/lib/chains/providers';

const rpc = getPolygonRpcUrl(); // null if chain disabled or RPC not configured
if (!rpc) return; // Polygon unavailable
```

### `POLYGON_ALCHEMY_NETWORK` (informational — not an env var)

The Alchemy network identifier for Polygon PoS is `matic`. This is already
configured in `lib/chains/config.ts` as `alchemyNetwork: 'matic'` for the
polygon entry. No separate env var is needed — the existing `ALCHEMY_API_KEY`
is shared across all Alchemy-supported chains. The Alchemy Polygon RPC URL
would be constructed as:
```
https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}
```
This URL is not yet used in any production code path. It would only be used
if `CHAIN_POLYGON_ENABLED=true` and an Alchemy key is present.

---

## 5. Polygon Contract and Wallet References (Staging/Future Only)

### `POLYGON_USDC_ADDRESS`

| Property | Value |
|---|---|
| Default | Not required — hardcoded in `shared/contracts-polygon.ts` |
| Canonical value | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` (Native USDC on Polygon PoS) |
| Required for current deployment | NO |
| Notes | Native Circle-issued USDC on Polygon PoS. Do NOT use USDC.e (`0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`). |

This address is embedded in `shared/contracts-polygon.ts` as a constant.
No env var override is needed for a well-known, non-secret contract address.

### `POLYGON_TREASURY_WALLET`

| Property | Value |
|---|---|
| Default | Absent — no treasury wallet configured |
| Type | EVM address string or absent |
| Required for current deployment | NO |
| Required for Phase 3 scaffold | NO |
| Required for staging treasury routing | YES (before any USDC routing test) |
| Notes | Should be a custody wallet registered in the `custodyWalletRegistry` DB table, not a raw env var. Consider using BitGo CaaS wallet for institutional-grade custody. |

**Recommendation:** Do not set `POLYGON_TREASURY_WALLET` as a raw env var.
Instead, register the wallet in the `custodyWalletRegistry` PostgreSQL table
with `provider = 'bitgo'`, `chain = 'polygon'`, and `assetScope = 'USDC'`.
This integrates with `CircleTreasuryService` and `TreasuryLedgerService`.

---

## 6. Capinfra Flags (Future — Not Yet Implemented)

These flags will be needed when the capinfra POLYGON adapter is built (Phase 4):

### `POLYGON_ADAPTER_MODE`

| Property | Value |
|---|---|
| Default | `DRY_RUN` (when implemented) |
| Options | `DRY_RUN` / `LIVE` |
| Required for current deployment | NO |
| Notes | Pattern follows existing `AVALANCHE_ADAPTER_MODE`. LIVE mode must not be set without full reconciliation model in place. |

### `POLYGON_ADAPTER_LIVE_ALLOWLIST`

| Property | Value |
|---|---|
| Default | Absent (empty) |
| Type | Comma-separated asset symbol list (e.g., `USDC-POLYGON`) |
| Required for current deployment | NO |
| Notes | Pattern follows `AVALANCHE_ADAPTER_LIVE_ALLOWLIST`. Controls which assets can use LIVE dispatch. |

---

## 7. What Must NOT Be Set in Production (Phase 3)

| Variable | Reason |
|---|---|
| `CHAIN_POLYGON_ENABLED=true` | Polygon is not production-ready at Phase 3 |
| `POLYGON_ADAPTER_MODE=LIVE` | No capinfra adapter exists yet |
| Any `POLYGON_TREASURY_WALLET` in production env | No treasury routing built yet |

---

## 8. Environment State Reference

| Environment | `MULTICHAIN_ENABLED` | `CHAIN_POLYGON_ENABLED` | Polygon Active? |
|---|---|---|---|
| Production (current) | false / absent | false / absent | NO |
| Staging (Phase 3) | false / absent | false / absent | NO (scaffold only) |
| Staging (Phase 4 smoke test) | true | true | YES — DRY_RUN only |
| Production (Phase 4+) | true | true | YES — only after approval |

---

*Axiom Protocol Internal — Polygon Phase 3 Flags and Environment — 2026-05-14*  
*No Polygon env vars are required for the current deployment.*
