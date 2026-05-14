# Axiom Protocol — Polygon Phase 4 Discovery

**Document type:** Phase A — Discovery Report  
**Phase:** Polygon Phase 4 — Capinfra Adapter DRY_RUN Foundation  
**Created:** 2026-05-14  
**Status:** COMPLETE  

---

## 1. Executive Summary

This discovery inspects the full capinfra settlement stack to determine exactly
how the Polygon adapter should fit in, which patterns to reuse from Avalanche
and EVM, what schema changes are needed, and what DRY_RUN behavior means for
Polygon. All findings informed the Phase 4 implementation.

---

## 2. capinfra Settlement Stack — How It Works

### 2.1 Lifecycle model

```
createInstruction  →  PENDING
authorizeInstruction →  AUTHORIZED  (policy re-evaluated)
executeInstruction  →  EXECUTING
                       adapter.dispatch()
                         → submitted=true  →  SUBMITTED  (no portfolio write)
                         → settled         →  SETTLED    (portfolio write)
                       → FAILED            (adapter throws)

externallySettleInstruction (separate call):
  SUBMITTED → SETTLED (portfolio write fires here)
```

The Polygon DRY_RUN adapter returns `submitted=true`, which means:
- Settlement state parks at SUBMITTED (no portfolio write)
- No economic credit occurs
- Final SETTLED requires an explicit `externallySettleInstruction` call
- This is identical to the Avalanche DRY_RUN behavior

### 2.2 Adapter isolation rule (§0.1)

- `settlement.ts` imports adapters ONLY through `adapters/registry.ts`
- Adapters MUST NOT write to portfolio, reserve, audit log, or notifications
- All post-dispatch side effects are owned by `settlement.ts`
- This is enforced architecturally — no adapter file should import from settlement

### 2.3 How the adapter registry works

`adapters/registry.ts` maintains an in-memory `Map<string, SettlementAdapter>`.
Each adapter is registered by calling `register(adapter)` at module load time.
`getAdapter(kind)` throws `NotFoundError` if the kind is not registered.
`settlement.ts` calls `getAdapter(asset.settlementType)` — so the `kind` string
on the adapter must match the `capSettlementTypeEnum` value exactly.

For Polygon: `kind = 'POLYGON'` must match `settlementType = 'POLYGON'` in the DB.

---

## 3. Existing Adapter Patterns — What Was Inspected

### 3.1 Avalanche adapter (primary reference)

| File | Role |
|---|---|
| `lib/capinfra/adapters/avalanche/config.ts` | Resolves `AVALANCHE_ADAPTER_MODE`, allowlist, chain gates, RPC URL |
| `lib/capinfra/adapters/avalanche/dispatcher.ts` | DRY_RUN + LIVE dispatch; `toWei()` amount conversion |
| `lib/capinfra/adapters/avalanche/index.ts` | `avalancheAdapter` export; §0.1 entry point |

DRY_RUN in Avalanche:
- `externalRef = '0xavadry-{instructionId.slice(-16)}-{suffix}'`
- `submitted = true` (parks at SUBMITTED, no portfolio write)
- No RPC call, no ethers import
- `receiptJson.mode = 'DRY_RUN'`

LIVE in Avalanche:
- `assertChainEnabled()` checks `MULTICHAIN_ENABLED` + `CHAIN_AVALANCHE_ENABLED`
- ethers.JsonRpcProvider from `AVALANCHE_RPC_URL`
- RPC chain ID verification before broadcast (guards against misconfigured RPC)
- Returns real `tx.hash` with `submitted = true`

### 3.2 EVM adapter (secondary reference)

Single-file (`evm.ts`) adapter for Arbitrum One. Same DRY_RUN/LIVE/DISABLED
mode pattern. `SUPPORTED_LIVE_CHAIN_IDS = {42161}` — explicitly refuses to
broadcast on unknown chains. Good pattern for Polygon LIVE when implemented.

### 3.3 INTERNAL adapter

Simplest adapter — pure in-memory, no external calls. `externalRef = 'internal:{id}:{suffix}'`.
No `submitted` flag — settles immediately (EXECUTING → SETTLED). Polygon should
NOT follow this pattern (Polygon is an external chain).

### 3.4 ACH adapter (most complex)

Three-file with MANUAL_APPROVAL mode. `submitted = true` (bank-accepted, not bank-final).
Not directly relevant to Polygon Phase 4, but the SUBMITTED semantics are important.

---

## 4. Polygon's Role in capinfra

### 4.1 Where Polygon fits

```
cap_settlement_instructions.settlementType = 'POLYGON'
  → settlement.ts calls getAdapter('POLYGON')
  → polygonAdapter.dispatch(input)
  → DRY_RUN: returns { externalRef: '0xpoldry-…', submitted: true }
  → settlement.ts transitions instruction to SUBMITTED
  → No portfolio write until externallySettleInstruction is called
  → Future LIVE: USDC transfer on Polygon PoS mainnet
```

### 4.2 Assets that use POLYGON settlement type

Any `cap_assets` row with `settlement_type = 'POLYGON'` routes through this adapter.
In Phase 4, no such asset exists in the DB yet. The settlement type enables future
registration of a Polygon USDC asset:

```sql
INSERT INTO cap_assets (id, symbol, display_name, asset_type, custody_model,
  redemption_type, settlement_type, chain, chain_id, contract_address, decimals, ...)
VALUES ('ast_usdc_polygon', 'USDC-POLYGON', 'USD Coin (Polygon PoS)',
  'STABLE_ASSET', 'ON_CHAIN_NATIVE', 'NONE', 'POLYGON',
  'polygon-pos', 137, '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', 6, ...);
```

This asset registration is Phase 5 work. Phase 4 proves routing at the adapter level.

### 4.3 What does NOT use POLYGON settlement type

- Arbitrum ERC-3643 AXUSD minting/redemption: uses `EVM`
- Avalanche AXUSD: uses `AVALANCHE`
- Stellar payment rail: uses `STELLAR`
- ACH/wire: uses `ACH` / `WIRE`
- Internal treasury moves: uses `INTERNAL`

---

## 5. Schema Changes Required

### 5.1 `capSettlementTypeEnum` — add 'POLYGON'

The enum in `shared/capInfraSchema.ts` must include `'POLYGON'` or the TypeScript
type system will reject it and Drizzle will refuse to insert POLYGON instructions.

**Migration:** `drizzle/migrations/0008_polygon_settlement_type.sql`
```sql
ALTER TYPE cap_settlement_type ADD VALUE IF NOT EXISTS 'POLYGON';
```

This is additive, idempotent, and non-destructive. Existing rows are unaffected.

### 5.2 No other schema changes required

No new tables, no new columns, no new enums. The settlement instruction table,
asset table, and portfolio tables all accept Polygon instructions once the enum
value exists.

---

## 6. What DRY_RUN Means for Polygon

| Aspect | DRY_RUN behavior |
|---|---|
| External call | None — no RPC, no network I/O |
| Env vars needed | None — POLYGON_RPC_URL not required |
| externalRef | `'0xpoldry-{instructionId.slice(-16)}-{suffix}'` |
| submitted flag | `true` — settlement.ts parks at SUBMITTED |
| Portfolio write | None — blocked by SUBMITTED semantics |
| Settlement finalization | Requires explicit `externallySettleInstruction` |
| Audit log | Written by settlement.ts after dispatch (normal) |
| Reversibility | Instruction is in SUBMITTED state — can be confirmed or failed |

DRY_RUN is safe to run in any environment including CI and production.
The instruction progresses through the normal lifecycle but stops at SUBMITTED.
No economic effect occurs until deliberate operator action.

---

## 7. What Reuses Avalanche Patterns

| Pattern | Avalanche | Polygon (Phase 4) |
|---|---|---|
| config.ts: mode resolution | `AVALANCHE_ADAPTER_MODE` | `POLYGON_ADAPTER_MODE` |
| config.ts: allowlist | `AVALANCHE_ADAPTER_LIVE_ALLOWLIST` | `POLYGON_ADAPTER_LIVE_ALLOWLIST` |
| config.ts: chain gate | `assertChainEnabled()` for LIVE | Same — MULTICHAIN_ENABLED + CHAIN_POLYGON_ENABLED |
| dispatcher.ts: DRY_RUN | `0xavadry-…` prefix, submitted=true | `0xpoldry-…` prefix, submitted=true |
| index.ts: entry point | `avalancheAdapter` export | `polygonAdapter` export |
| registry.ts: registration | `register(avalancheAdapter)` | `register(polygonAdapter)` |
| Proof script pattern | `vault-sprint-avalanche-fuji.ts` | `vault-sprint-polygon-amoy.ts` |
| Reconcile script pattern | `reconcile-avalanche-reserve.ts` | `reconcile-polygon-reserve.ts` |

**Key difference from Avalanche:** Polygon Phase 4 does NOT implement a LIVE path.
LIVE mode throws `AdapterModeNotPermittedError` — this is the correct fail-closed
posture until all pre-conditions are met. Avalanche had a LIVE path from Phase 3
because the Fuji testnet smoke test was already complete.

---

## 8. What Must Remain Arbitrum-Canonical

| Surface | Arbitrum canonical | Must NOT migrate to Polygon |
|---|---|---|
| AXUSD issuance | EVM adapter, chainId=42161 | ✓ |
| AXAU reserve | EVM adapter, PAXG anchor | ✓ |
| ERC-3643 identity | ONCHAINID contracts on Arbitrum | ✓ |
| Governance | TimelockController, Arbitrum | ✓ |
| Policy decisions | capinfra policy layer + Arbitrum | ✓ |
| SIWE authentication | `assertArbitrumOne.ts` unchanged | ✓ |

No change to any of these was made in Phase 4.

---

## 9. Blockers Before Polygon LIVE

In priority order:

| Blocker | What's Needed |
|---|---|
| BitGo Polygon custody wallet | Register wallet in `custodyWalletRegistry` (`chain='polygon'`) |
| Accepted-risk record | Signed by Technical Lead, Ops Lead, Compliance before LIVE dispatch |
| Legal review | Polygon USDC payments reviewed for compliance posture |
| Amoy smoke test with live RPC | Prove DRY_RUN + LIVE paths on Amoy testnet |
| Reconciliation cron deployed | Post-action + daily cron with DB writes |
| LIVE path implementation | `liveDispatch()` in polygon/dispatcher.ts (Phase 5) |
| DB asset registration | USDC-POLYGON asset in `cap_assets` with settlement_type='POLYGON' |

---

*Axiom Protocol Internal — Polygon Phase 4 Discovery — 2026-05-14*
