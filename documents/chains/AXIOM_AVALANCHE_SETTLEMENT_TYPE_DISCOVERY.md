# AXIOM AVALANCHE — Settlement Type Discovery Report

**Task:** #483 — Add AVALANCHE to capSettlementTypeEnum  
**Phase:** A — Discovery  
**Date:** 2026-05-14  
**Scope:** Fuji testnet only — no mainnet deployment, no Arbitrum changes

---

## Purpose

This document records the discovery phase for Task #483: adding `'AVALANCHE'` as a named
settlement type to `capSettlementTypeEnum` so Fuji assets route through the AVALANCHE
adapter automatically via `executeInstruction`, closing the routing gap documented in Gate 5
(Task #482).

---

## 1. Files Referencing `settlementType` Enum Values

### Schema definition (source of truth)

| File | Location | Notes |
|---|---|---|
| `shared/capInfraSchema.ts` | `capSettlementTypeEnum` ~line 124 | Drizzle enum; all DB column types derive from this |

### Enum values before Task #483

```
INTERNAL, EVM, STELLAR, ACH, WIRE, PLAID
```

`AVALANCHE` was absent — Fuji assets were stored with `settlementType='EVM'`.

### Files that reference settlement type values at runtime

| File | How used |
|---|---|
| `lib/capinfra/adapters/registry.ts` | `getAdapter(kind: string)` — plain map lookup; already had `'AVALANCHE'` key registered |
| `lib/capinfra/settlement.ts` | `executeInstruction` line ~427: `getAdapter(asset.settlementType)` — routes to adapter |
| `lib/capinfra/settlement.ts` | `externallySettleInstruction` — reads `instruction.settlementType`; no adapter routing but must be a valid DB enum value |
| `lib/capinfra/settlement.ts` | `approveInstruction`, `rejectInstruction` — ACH-only guards (`settlementType === 'ACH'`) |
| `lib/capinfra/portfolio.ts` | `applySettlement` — no settlementType conditional; always credits position |
| `scripts/capinfra-seed.ts` | `SEEDS` array; asset definitions include `settlementType` |
| `scripts/vault-sprint-avalanche-fuji.ts` | Proof script; `fujiAsset()`, `upsertFujiAsset()`, instruction inserts |
| `app/api/capinfra/**` | API routes pass `settlementType` from request body; validated against DB enum |

---

## 2. Adapter Registry State Before Task #483

The AVALANCHE adapter was **already registered** in `lib/capinfra/adapters/registry.ts`
under key `'AVALANCHE'`. `getAdapter('AVALANCHE')` resolved correctly and was exercised in
Gate 5 (Task #482).

The routing gap was exclusively at the DB schema layer:
- `capSettlementTypeEnum` did not include `'AVALANCHE'`
- Drizzle insert of an instruction with `settlementType: 'AVALANCHE'` would fail Postgres
  type validation
- `executeInstruction` could not route by `asset.settlementType` for Avalanche assets
  because DB assets had to be stored as `'EVM'`

---

## 3. Routing Flow (post-Task #483)

```
executeInstruction(instructionId)
  → load asset (cap_assets.settlement_type = 'AVALANCHE')
  → getAdapter('AVALANCHE')           ← map key lookup in registry.ts
  → AvalancheAdapter.dispatch(input)  ← Fuji or mainnet dispatch
```

This is identical to EVM routing:

```
executeInstruction(instructionId)
  → load asset (cap_assets.settlement_type = 'EVM')
  → getAdapter('EVM')
  → EvmAdapter.dispatch(input)
```

---

## 4. DB / Migration Implications

### Migration required

Postgres `ALTER TYPE` must add the new enum value before any `INSERT` or `UPDATE` using it:

```sql
ALTER TYPE "cap_settlement_type" ADD VALUE IF NOT EXISTS 'AVALANCHE';
```

`IF NOT EXISTS` makes the migration idempotent. PostgreSQL does not support removing enum
values, so the operation is additive-only and safe.

### Migration file

`migrations/0059_cap_settlement_type_avalanche.sql`

### Journal entry

`migrations/meta/_journal.json` — idx=29, tag=`0059_cap_settlement_type_avalanche`

### Backward compatibility

- Existing rows with `settlement_type='EVM'` are unchanged — EVM routing is unaffected
- `INTERNAL`, `STELLAR`, `ACH`, `WIRE`, `PLAID` rows are unchanged
- The new enum value is additive; no column defaults change
- `getAdapter('EVM')` still resolves to the EVM adapter — no conflict

---

## 5. Required Schema Updates

| Item | File | Change |
|---|---|---|
| Enum definition | `shared/capInfraSchema.ts` | Add `'AVALANCHE'` to `capSettlementTypeEnum` |
| Migration | `migrations/0059_cap_settlement_type_avalanche.sql` | `ALTER TYPE ... ADD VALUE` |
| Journal | `migrations/meta/_journal.json` | New entry idx=29 |

---

## 6. Required Seed / Data Updates

| Item | Action |
|---|---|
| AXUSD-FUJI asset row | Change `settlement_type` from `'EVM'` to `'AVALANCHE'` |
| `capinfra-seed.ts` SEEDS | Set `settlementType: 'AVALANCHE'` for AXUSD-FUJI entry |
| `capinfra-seed.ts` `seedAssets()` | Add idempotent update: when existing row has stale settlement type, UPDATE in-place |
| cap_adapters row for AVALANCHE | Already present from Gate 5 setup — no change needed |

---

## 7. Backward Compatibility Statement

The following are **guaranteed unchanged** by this task:

- `getAdapter('EVM')` routing → EVM adapter
- All `cap_assets` rows with `settlement_type='EVM'` — data unchanged, not migrated
- All Arbitrum One production assets (AXAU, PAXG, AXUSD-TREASURY) — unchanged
- `INTERNAL`, `STELLAR`, `ACH`, `WIRE`, `PLAID` settlement paths — unchanged
- ACH-specific guards in `approveInstruction` / `rejectInstruction` — unchanged
- Banking / payment routes — unchanged
- Polygon, Sui — not referenced anywhere in this task

---

## 8. Why EVM Behavior Must Remain Unchanged

EVM is the canonical settlement type for all Arbitrum One production assets. The AVALANCHE
enum value is isolated to Fuji testnet assets (`chain='avalanche-fuji'`, `chainId=43113`).
No existing Arbitrum record has `chainId=43113`. Adding a new enum value does not alter
the resolution path for any existing EVM asset — `getAdapter` is a plain map lookup, and
`'AVALANCHE'` maps to a distinct adapter instance from `'EVM'`.
