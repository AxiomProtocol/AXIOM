# Axiom Protocol — Polygon Phase 5 Capinfra Report

**Document type:** Phase G — Capinfra Report  
**Phase:** Polygon Phase 5 — Capinfra Adapter LIVE Dispatch  
**Created:** 2026-05-14  
**Status:** COMPLETE — LIVE path implemented; human sign-off required before activation  

---

## 1. Files Created or Updated

| File | Action | Notes |
|---|---|---|
| `lib/capinfra/adapters/polygon/config.ts` | Updated | Added `deployerPrivateKey()`, `assertChainEnabled()` now enforces `CHAIN_POLYGON_ENABLED`; phase docstring updated |
| `lib/capinfra/adapters/polygon/dispatcher.ts` | Rewritten | LIVE path implemented; Phase 4 `AdapterModeNotPermittedError` block removed; `toWei()` added; `amountRaw` in receipts |
| `scripts/vault-sprint-polygon-amoy.ts` | Updated | F checks Phase 5 gate behavior; F2 checks RPC gate; H is new Amoy LIVE smoke test (skipped when RPC absent) |
| `scripts/seed-polygon-usdc-asset.ts` | Created | Idempotent USDC-POLYGON asset registration in `cap_assets` |
| `documents/chains/AXIOM_POLYGON_PHASE5_ACCEPTED_RISK.md` | Created | Accepted-risk record template — must be signed before LIVE |
| `documents/chains/AXIOM_POLYGON_PHASE5_CAPINFRA_REPORT.md` | Created | This document |

---

## 2. Adapter Changes — Phase 4 → Phase 5

### 2.1 `dispatcher.ts` — key changes

| Aspect | Phase 4 | Phase 5 |
|---|---|---|
| LIVE mode | `throw new AdapterModeNotPermittedError('POLYGON', 'LIVE')` | Routes to `liveDispatch()` |
| Action types (LIVE) | N/A (blocked) | `TRANSFER` only — MINT/REDEEM explicitly rejected |
| Chain ID verification | N/A | `provider.getNetwork()` checked before broadcast |
| Amount conversion | `dryRunDispatch` only | `toWei()` added, used in both DRY_RUN and LIVE |
| DRY_RUN externalRef | `0xpoldry-{tail}-{sha256}` (deterministic) | Unchanged |
| `dryRunDispatch` reason | `'mode' | 'asset_not_allowlisted' | 'live_not_implemented'` | `'mode' | 'asset_not_allowlisted'` (live_not_implemented removed) |
| `dryRunExternalRef` | Internal function | Exported for external proof/testing |

### 2.2 `config.ts` — key additions

| Addition | Purpose |
|---|---|
| `deployerPrivateKey()` | Prefers `POLYGON_DEPLOYER_PRIVATE_KEY`, falls back to `DEPLOYER_PRIVATE_KEY` |
| `assertChainEnabled()` | Same pattern as Avalanche — gates on `MULTICHAIN_ENABLED + CHAIN_POLYGON_ENABLED` |
| `SUPPORTED_LIVE_CHAIN_IDS` | `{137, 80002}` — mainnet + Amoy testnet |

### 2.3 `dispatchPolygon()` — updated flow

```
Phase 4:
  DISABLED  → AdapterDisabledError
  LIVE      → AdapterModeNotPermittedError (Phase 4 hard block)
  DRY_RUN   → dryRunDispatch()

Phase 5:
  DISABLED                        → AdapterDisabledError
  LIVE (not in allowlist)         → dryRunDispatch(reason='asset_not_allowlisted')
  LIVE (in allowlist)             → liveDispatch()
    ↓ assertChainEnabled()        → throws if CHAIN_POLYGON_ENABLED or MULTICHAIN_ENABLED missing
    ↓ chain ID verification       → throws if RPC returns wrong chainId
    ↓ action type gate            → throws if not TRANSFER
    ↓ recipient gate              → throws if no payloadJson.recipient
    ↓ ethers broadcast            → USDC transfer on Polygon PoS
    ↓ returns txHash, submitted=true
  DRY_RUN                         → dryRunDispatch(reason='mode')
```

---

## 3. liveDispatch() — Implementation Detail

### 3.1 Settlement token

```
Native USDC: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
Decimals:    6
Chain:       Polygon PoS mainnet (137) / Amoy testnet (80002)
```

### 3.2 Action type guard

Only `TRANSFER` is implemented. `MINT` and `REDEEM` throw explicitly:
```
"polygon-adapter: actionType="MINT" is not supported on Polygon Phase 5.
 Only TRANSFER is valid. MINT/REDEEM are Arbitrum-canonical (EVM adapter)."
```
This prevents any accidental AXUSD minting/burning on Polygon.

### 3.3 Chain ID verification

After building the provider, the adapter calls `provider.getNetwork()` and compares
the returned `chainId` to `asset.chainId`. If they differ, it throws before broadcast:
```
"polygon-adapter: RPC endpoint returned chainId=42161 but asset.chainId=137
 — possible wrong-RPC misconfiguration; refusing to broadcast"
```

### 3.4 SUBMITTED semantics (same as Avalanche)

`liveDispatch()` returns `submitted: true` — this means:
- `settlement.ts` transitions instruction to SUBMITTED, not SETTLED
- No portfolio write at dispatch time
- SETTLED requires explicit `externallySettleInstruction` call
- This protects against Polygon PoS chain reorgs and confirmation delays

### 3.5 Required env vars for LIVE

| Env var | Required | Purpose |
|---|---|---|
| `POLYGON_ADAPTER_MODE=LIVE` | Yes | Enables LIVE mode (default: DRY_RUN) |
| `CHAIN_POLYGON_ENABLED=true` | Yes | Chain gate (`assertChainEnabled`) |
| `MULTICHAIN_ENABLED=true` | Yes | Global multichain gate |
| `POLYGON_RPC_URL` | Yes (mainnet) | Mainnet RPC endpoint |
| `POLYGON_AMOY_RPC_URL` | For Amoy | Amoy testnet RPC (preferred over POLYGON_RPC_URL for chainId=80002) |
| `POLYGON_DEPLOYER_PRIVATE_KEY` | Yes | Dedicated Polygon deployer key |
| `POLYGON_ADAPTER_LIVE_ALLOWLIST` | Yes | Must include `USDC-POLYGON` |

---

## 4. USDC-POLYGON Asset Registration

Script: `scripts/seed-polygon-usdc-asset.ts`

```sql
INSERT INTO cap_assets (
  id, symbol, display_name, asset_type, asset_subtype, custody_model,
  redemption_type, settlement_type, chain, chain_id, contract_address,
  decimals, issuer, exposure_class, collateral_class, status, ...
) VALUES (
  'ast_...', 'USDC-POLYGON', 'USD Coin (Polygon PoS — Native)',
  'STABLE_ASSET', 'NONE', 'ON_CHAIN_NATIVE', 'NONE', 'POLYGON',
  'polygon-pos', 137, '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  6, 'Circle Internet Financial', 'RESTRICTED', 'RED', 'ACTIVE', ...
)
```

Pre-conditions enforced by the script:
- `DATABASE_URL` set
- `CHAIN_POLYGON_ENABLED=true` (explicit intent confirmation)

Idempotent — safe to run multiple times.

---

## 5. Proof Script Results (Phase 5)

Script: `scripts/vault-sprint-polygon-amoy.ts`

| Invariant | Result | Notes |
|---|---|---|
| A — POLYGON resolves from registry | PROVEN | `getAdapter('POLYGON')` → kind='POLYGON' |
| B — Routing correct | PROVEN | settlementType='POLYGON' routes to polygonAdapter |
| C — 0xpoldry- prefix | PROVEN | DRY_RUN externalRef format correct |
| C2 — Deterministic | PROVEN | SHA-256(instructionId) — same instruction → same ref |
| C3 — Collision resistant | PROVEN | Different instructions → different refs |
| D — No broadcast in DRY_RUN | PROVEN | mode=DRY_RUN, no txHash |
| E — No portfolio credit | PROVEN | submitted=true → SUBMITTED state, no write |
| F — Phase 5: LIVE no longer AdapterModeNotPermittedError | PROVEN | LIVE without chain flags → assertChainEnabled error |
| F.phase5 — Phase 4 hard block removed | PROVEN | throws chain-gate error, not AdapterModeNotPermittedError |
| F2 — LIVE + chain flags + no RPC → RPC error | PROVEN | POLYGON_RPC_URL required error thrown |
| F3 — DISABLED throws AdapterDisabledError | PROVEN | unchanged behavior |
| G — Settlement confirmation idempotency (DB) | PROVEN | SUBMITTED → SETTLED → ConflictError on second call |
| H — Amoy LIVE smoke test | SKIPPED (no POLYGON_AMOY_RPC_URL) | Run manually when Amoy RPC is configured |
| I — EVM/AVALANCHE/INTERNAL/ACH/STELLAR unaffected | PROVEN | All 5 adapters still resolve |

---

## 6. Production Safety Statement

| Statement | Status |
|---|---|
| POLYGON_ADAPTER_MODE defaults to DRY_RUN | CONFIRMED — no env change = no live dispatch |
| CHAIN_POLYGON_ENABLED not set in production | CONFIRMED |
| No Polygon mainnet transaction sent by this phase | CONFIRMED |
| No Axiom contracts deployed on Polygon | CONFIRMED — null in contracts-polygon.ts |
| MINT/REDEEM actions explicitly blocked on Polygon | CONFIRMED — throws at dispatch level |
| AXUSD issuance remains Arbitrum-canonical | CONFIRMED — no change to EVM adapter |
| Avalanche Limited Pilot Mode | ACTIVE (100 AXUSD) — UNCHANGED |
| Arbitrum One canonical | UNCHANGED |

---

## 7. Remaining Before Polygon LIVE Production

| Gate | Owner | Status |
|---|---|---|
| AXIOM_POLYGON_PHASE5_ACCEPTED_RISK.md signed (3 signatories) | Technical Lead + Ops Lead + Compliance | NOT SIGNED |
| BitGo Polygon custody wallet registered | Ops | NOT DONE |
| POLYGON_DEPLOYER_PRIVATE_KEY set in secrets vault (dedicated key) | Infra | NOT SET |
| vault-sprint-polygon-amoy.ts invariant H passes with Amoy RPC | Engineering | NOT RUN |
| seed-polygon-usdc-asset.ts run in staging | Engineering | NOT RUN |
| POLYGON_ADAPTER_MODE=LIVE + CHAIN_POLYGON_ENABLED=true in staging | Infra | NOT SET |
| Reconciliation cron active with POLYGON_TREASURY_WALLET set | Ops | NOT CONFIGURED |
| Monitoring/alerting for Polygon LIVE transactions active | Infra | NOT CONFIGURED |

---

*Axiom Protocol Internal — Polygon Phase 5 Capinfra Report — 2026-05-14*  
*LIVE dispatch implemented. Polygon remains disabled (DRY_RUN) in all environments until sign-off gates are met.*
