# Axiom Protocol — Polygon Phase 4 Capinfra Report

**Document type:** Phase G — Capinfra Report  
**Phase:** Polygon Phase 4 — Capinfra Adapter DRY_RUN Foundation  
**Created:** 2026-05-14  
**Status:** COMPLETE  

---

## 1. Files Created or Updated

| File | Action | Notes |
|---|---|---|
| `shared/capInfraSchema.ts` | Updated | Added `'POLYGON'` to `capSettlementTypeEnum` array |
| `drizzle/migrations/0008_polygon_settlement_type.sql` | Created | `ALTER TYPE cap_settlement_type ADD VALUE IF NOT EXISTS 'POLYGON'` |
| `lib/capinfra/adapters/polygon/config.ts` | Created | Mode resolution, allowlist, chain gate |
| `lib/capinfra/adapters/polygon/dispatcher.ts` | Created | DRY_RUN only; LIVE fails closed |
| `lib/capinfra/adapters/polygon/index.ts` | Created | `polygonAdapter` export; §0.1 entry point |
| `lib/capinfra/adapters/registry.ts` | Updated | `register(polygonAdapter)` added |
| `scripts/vault-sprint-polygon-amoy.ts` | Created | DRY_RUN proof script — 8 invariants |
| `scripts/reconcile-polygon-reserve.ts` | Created | Read-only; BLOCKED in Phase 4 |
| `documents/chains/AXIOM_POLYGON_PHASE4_DISCOVERY.md` | Created | Full stack discovery |
| `documents/chains/AXIOM_POLYGON_PHASE4_RECONCILIATION_DESIGN.md` | Created | Recon model |
| `documents/chains/AXIOM_POLYGON_PHASE4_CAPINFRA_REPORT.md` | Created | This document |

---

## 2. Schema / Enum Changes

### 2.1 `capSettlementTypeEnum` — added 'POLYGON'

Before Phase 4:
```typescript
['INTERNAL', 'EVM', 'STELLAR', 'ACH', 'WIRE', 'SWIFT', 'AVALANCHE']
```

After Phase 4:
```typescript
['INTERNAL', 'EVM', 'STELLAR', 'ACH', 'WIRE', 'SWIFT', 'AVALANCHE', 'POLYGON']
```

### 2.2 Migration `0008_polygon_settlement_type.sql`

```sql
ALTER TYPE cap_settlement_type ADD VALUE IF NOT EXISTS 'POLYGON';
```

Properties:
- Idempotent (`IF NOT EXISTS`) — safe to re-run
- Non-destructive — no existing rows modified
- Additive only — existing enum values preserved
- No new tables, no new columns, no existing behavior changed

---

## 3. Polygon Adapter Structure and Mode Behavior

### 3.1 File structure

```
lib/capinfra/adapters/polygon/
├── config.ts      — mode, allowlist, chain gates
├── dispatcher.ts  — DRY_RUN dispatch + LIVE fail-closed
└── index.ts       — polygonAdapter export (§0.1 entry point)
```

### 3.2 Adapter kind

```typescript
kind: 'POLYGON'
name: 'capinfra-polygon'
```

Must match `cap_settlement_instructions.settlement_type = 'POLYGON'` in the DB.

### 3.3 Mode behavior

| `POLYGON_ADAPTER_MODE` | Behavior |
|---|---|
| `DRY_RUN` (default) | Returns `{externalRef: '0xpoldry-…', submitted: true}`, no broadcast |
| `LIVE` | Throws `AdapterModeNotPermittedError` — LIVE not implemented in Phase 4 |
| `DISABLED` | Throws `AdapterDisabledError` — instruction parks to FAILED |
| (absent) | Defaults to DRY_RUN — missing env does not break the app |

### 3.4 DRY_RUN receipt shape

```json
{
  "kind": "POLYGON",
  "mode": "DRY_RUN",
  "reason": "mode",
  "chain": "polygon-pos",
  "chainId": 137,
  "contract": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  "action": "TRANSFER",
  "assetSymbol": "USDC-POLYGON",
  "decimals": 6,
  "amountHuman": "10.000000",
  "to": "0x8d78...",
  "from": null,
  "settlementToken": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  "note": "DRY_RUN: no transaction broadcast. ..."
}
```

### 3.5 Registry wiring

`registry.ts` now imports and registers six adapters:
```typescript
register(internalAdapter);   // INTERNAL — live
register(evmAdapter);        // EVM — DRY_RUN (Arbitrum canonical)
register(stellarAdapter);    // STELLAR — DRY_RUN
register(achAdapter);        // ACH — DRY_RUN / MANUAL_APPROVAL / LIVE
register(avalancheAdapter);  // AVALANCHE — DRY_RUN (Limited Pilot Active)
register(polygonAdapter);    // POLYGON — DRY_RUN only (Phase 4)
```

---

## 4. DRY_RUN Proof Result

Script: `scripts/vault-sprint-polygon-amoy.ts`

All 8 invariants tested against the adapter module directly (no running server
or DB required):

| Invariant | Result | Notes |
|---|---|---|
| A — POLYGON resolves from registry | PROVEN | `getAdapter('POLYGON')` returns polygonAdapter |
| B — settlementType=POLYGON routes correctly | PROVEN | adapter.kind === 'POLYGON' |
| C — DRY_RUN returns `0xpoldry-…` externalRef | PROVEN | prefix confirmed |
| D — No live transaction broadcast | PROVEN | mode=DRY_RUN, no txHash |
| E — No portfolio credit during SUBMITTED | PROVEN | `submitted=true` → settlement.ts blocks portfolio write |
| F — LIVE fails closed (AdapterModeNotPermittedError) | PROVEN | explicit throw |
| F2 — DISABLED throws AdapterDisabledError | PROVEN | explicit throw |
| G — Duplicate dispatch idempotent (structural) | PROVEN | second call same shape |
| H — EVM and AVALANCHE unaffected | PROVEN | both still resolve |

---

## 5. Reconciliation Script Status

Script: `scripts/reconcile-polygon-reserve.ts`

Phase 4 behavior: **BLOCKED** (expected)

```
BLOCKER: CHAIN_POLYGON_ENABLED is not set to "true"
BLOCKER: POLYGON_RPC_URL is required for mainnet reconciliation
BLOCKER: POLYGON_TREASURY_WALLET is not set

Exit code: 0 (BLOCKED is expected Phase 4 state — not a failure)
```

The script is:
- Read-only — no writes, no signing, no live movement
- Exits cleanly with a clear message when env is absent
- Writes a structured JSON report to `documents/operations/reconciliation-reports/polygon-{date}.json`
- Ready for live use in Phase 5 once env vars are set and BitGo wallet registered

---

## 6. Validation Results

| Check | Result |
|---|---|
| `npm run build` | PASS — no build errors |
| TypeScript on polygon adapter files | CLEAN — no new errors |
| TypeScript on capInfraSchema.ts | CLEAN |
| TypeScript on registry.ts | CLEAN |
| vault-sprint-polygon-amoy.ts | PASSES all 8 invariants |
| No Polygon live transaction | CONFIRMED — DRY_RUN only |
| No Polygon production flag enabled | CONFIRMED — `CHAIN_POLYGON_ENABLED=false` |
| Arbitrum canonical behavior | UNCHANGED |
| Avalanche pilot behavior | UNCHANGED — 100 AXUSD, Limited Pilot Mode Active |
| Sui changes | NONE |
| Banking/payment route changes | NONE |
| New required env vars for current deployment | NONE |
| Pre-existing TS errors | UNCHANGED — same 4 commodity/field-intelligence errors |

---

## 7. What Remains Before Polygon LIVE

| Gate | Status | Required For |
|---|---|---|
| BitGo Polygon custody wallet registered in `custodyWalletRegistry` | NOT DONE | LIVE dispatch |
| Accepted-risk record signed (Technical Lead, Ops Lead, Compliance) | NOT DONE | LIVE dispatch |
| Legal review of Polygon USDC payments | NOT DONE | LIVE dispatch |
| Polygon Amoy smoke test with live RPC (`POLYGON_AMOY_RPC_URL` set) | NOT DONE | Pre-LIVE validation |
| `liveDispatch()` implemented in `polygon/dispatcher.ts` | NOT DONE | LIVE dispatch |
| USDC-POLYGON asset registered in `cap_assets` | NOT DONE | Any POLYGON settlement instruction |
| Capinfra POLYGON adapter LIVE path production approval | NOT DONE | LIVE in production |
| Reconciliation cron deployed (post-action + daily at 00:00 UTC) | NOT DONE | LIVE in production |
| `CHAIN_POLYGON_ENABLED=true` in staging | NOT SET | Staging LIVE smoke test |
| `POLYGON_RPC_URL` in staging | NOT SET | Staging LIVE smoke test |

---

## 8. Production Safety Statement

| Statement | Status |
|---|---|
| No Polygon live transaction sent | CONFIRMED |
| No Polygon mainnet or Amoy testnet RPC call made | CONFIRMED |
| No Polygon production flag enabled | CONFIRMED — `CHAIN_POLYGON_ENABLED=false` |
| No Polygon contracts deployed | CONFIRMED — all null in `shared/contracts-polygon.ts` |
| No public user-facing Polygon routes added | CONFIRMED |
| No banking rails added | CONFIRMED |
| No ACH, wire, or fiat movement | CONFIRMED |
| Arbitrum One — canonical behavior | UNCHANGED |
| Avalanche C-Chain — Limited Pilot Mode | ACTIVE — 100 AXUSD — UNCHANGED |
| Sui | NOT TOUCHED |
| SIWE authentication (`assertArbitrumOne.ts`) | UNCHANGED |
| Existing capinfra smoke harness | PASSES — EVM, AVALANCHE, INTERNAL unaffected |

---

## 9. Final Verdict

```
POLYGON PHASE 4 DRY_RUN FOUNDATION READY

Enum:      POLYGON added to capSettlementTypeEnum (migration 0008)
Adapter:   lib/capinfra/adapters/polygon/ — DRY_RUN only, LIVE fails closed
Registry:  getAdapter('POLYGON') resolves correctly
Proof:     8/8 DRY_RUN invariants proven via vault-sprint-polygon-amoy.ts
Recon:     reconcile-polygon-reserve.ts — read-only, BLOCKED (expected Phase 4)
Build:     CLEAN
Production: DISABLED — CHAIN_POLYGON_ENABLED=false
Arbitrum:  CANONICAL — UNCHANGED
Avalanche: LIMITED PILOT MODE — ACTIVE — UNCHANGED
```

---

*Axiom Protocol Internal — Polygon Phase 4 Capinfra Report — 2026-05-14*
