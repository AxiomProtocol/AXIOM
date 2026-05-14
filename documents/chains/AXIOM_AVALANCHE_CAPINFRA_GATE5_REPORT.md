# AXIOM AVALANCHE CAPINFRA GATE 5 — FINAL REPORT

**Completed:** 2026-05-13T23:36:59Z  
**Task:** #482 — Avalanche Capinfra Gate 5 — Fuji Live Smoke  
**Scope:** Fuji testnet only — no mainnet deployment, no Arbitrum changes

---

## Summary

Gate 5 is **SATISFIED**.

The Capinfra AVALANCHE settlement adapter is fully wired end-to-end on Fuji testnet.
All 7 invariants (A–G) proved with strict on-chain confirmation. 22/22 proof-script checks passed.
Contract addresses sourced exclusively from `shared/contracts-avalanche.ts` (FUJI_CONTRACTS).

---

## Gate 5 Deliverable — Real Fuji Transaction (Confirmed On-Chain)

| Item | Value |
|---|---|
| Network | Avalanche Fuji (chainId 43113) |
| Contract | `0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8` (AxiomStable3643Fuji) |
| Contract source | `shared/contracts-avalanche.ts` → `FUJI_CONTRACTS.AxiomStable3643` |
| Action | MINT |
| Amount | 0.000001 AXUSD-FUJI (raw=1 at 6 decimals) |
| Recipient | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` (deployer) |
| Fuji txHash | `0xf10d156a9328b9c4ad32f7bd6dd1df143f92449a270146b209c2129ddb69ef8c` |
| Explorer | https://testnet.snowtrace.io/tx/0xf10d156a9328b9c4ad32f7bd6dd1df143f92449a270146b209c2129ddb69ef8c |
| Block number | 55330858 |
| Gas used | 79118 |
| receipt.status | 1 (mined, not reverted) |
| Transfer event | Found in logs: `Transfer(0x0 → deployer, value=1)` |
| Pre-dispatch balanceOf | `744000004` raw (744.000004 AXUSD-FUJI) |
| Post-dispatch balanceOf | `744000005` raw (744.000005 AXUSD-FUJI) |
| Delta | `1` raw == `SMOKE_MINT_RAW` — attributed to this Gate 5 run |
| Adapter mode | LIVE |
| Timestamp | 2026-05-13T23:36:59Z |

---

## Proof Script

**File:** `scripts/vault-sprint-avalanche-fuji.ts`

Modelled on `scripts/vault-sprint2-evm.ts`. Proves invariants A–G for the
AVALANCHE adapter on Fuji. Contract addresses imported from
`shared/contracts-avalanche.ts` — no hardcoded literals in the script.

### Run command

```bash
ADMIN_SOLVENCY_KEY=... \
CAPINFRA_BASE_URL=http://localhost:5000 \
AVALANCHE_ADAPTER_MODE=LIVE \
AVALANCHE_ADAPTER_LIVE_ALLOWLIST=AXUSD-FUJI \
  npx tsx scripts/vault-sprint-avalanche-fuji.ts
```

### Result: 22/22 checks passed

```
  [✓] A1 AVALANCHE adapter resolves from registry — kind=AVALANCHE name=capinfra-avalanche
  [✓] A2 no shadow approval branch on AVALANCHE — dispatchAfterApproval=undefined (correct)
  [✓] A3 Fuji contract sourced from shared/contracts-avalanche.ts
       FUJI_CONTRACTS.AxiomStable3643=0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8 chainId=43113
  [✓] B1 DRY_RUN returns synthetic 0xavadry-… externalRef — mode=DRY_RUN submitted=true
  [✓] B2 DRY_RUN receipt has correct chain metadata — chainId=43113 (expected 43113)
  [✓] C1 LIVE mode active — AVALANCHE_ADAPTER_MODE=LIVE allowlist=AXUSD-FUJI
  [✓] C2 symbol in LIVE allowlist — AXUSD-FUJI confirmed in allowlist
  [✓] C3 LIVE dispatch returns 64-hex txHash
       txHash=0xf10d156a9328b9c4ad32f7bd6dd1df143f92449a270146b209c2129ddb69ef8c mode=LIVE
  [✓] C4 transaction receipt obtained (≥1 confirmation)
       blockNumber=55330858 blockHash=0xd6950e388a6d… confirmations≥1
  [✓] C5 receipt.status === 1 (mined, not reverted)
       status=1 gasUsed=79118 blockNumber=55330858
  [✓] C6 Transfer(0x0→deployer, value=SMOKE_MINT_RAW) event in tx logs
       found Transfer event in tx logs for deployer=0x8d7892CF… — mint confirmed
  [✓] D1 SUBMITTED instruction inserted
  [✓] D2 SUBMITTED not credited (Invariant D) — portfolio qty unchanged while SUBMITTED
  [✓] E1 verified AVALANCHE webhook event recorded
  [✓] E2 externallySettleInstruction → SETTLED (Invariant E)
  [✓] E3 instruction status SETTLED in DB
  [✓] E4 portfolio credited at SETTLED (Invariant E) — delta=0.0000010000
  [✓] F1 duplicate confirmation → ConflictError (Invariant F)
       correctly threw ConflictError: external_settle_on_terminal:SETTLED
  [✓] F2 no double-credit on duplicate (Invariant F) — qty unchanged
  [✓] G1 balanceOf delta == SMOKE_MINT_RAW (attributed to this run)
       pre=744000004 post=744000005 delta=1 == SMOKE_MINT_RAW=1 — this run's mint confirmed
  [✓] G2 C6 Transfer event cross-reference (attributed to Gate 5 txHash) — PASS
  [✓] G3 DB position and on-chain balance consistent — db-settled=0.0000050000 on-chain-increased=true
  [✓] G4 canonical routing gap formally documented (Task #483)
```

---

## Invariant Summary

| Invariant | Status | Description |
|---|---|---|
| A | ✅ PASS | Adapter resolves from registry; no shadow branch; contract from `shared/contracts-avalanche.ts` |
| B | ✅ PASS | DRY_RUN returns synthetic 0xavadry-… receipt with chainId=43113 — no real broadcast |
| C | ✅ PASS | LIVE tx mined (status=1); receipt fetched; Transfer event found in logs (0x0→deployer, value=1) |
| D | ✅ PASS | SUBMITTED instruction does not credit portfolio |
| E | ✅ PASS | `externallySettleInstruction` → SETTLED + portfolio credited exactly once |
| F | ✅ PASS | Duplicate confirmation → ConflictError; no double-credit |
| G | ✅ PASS | `balanceOf` delta == SMOKE_MINT_RAW (run-attributed); DB consistent; routing gap documented |

---

## Task Phases Completed

| Phase | Deliverable | Status |
|---|---|---|
| A — Adapter discovery | `documents/chains/AXIOM_AVALANCHE_CAPINFRA_GATE5_DISCOVERY.md` | ✅ |
| B — Adapter hardening | `lib/capinfra/adapters/avalanche/config.ts`, `dispatcher.ts` | ✅ |
| C — Fuji proof script | `scripts/vault-sprint-avalanche-fuji.ts` — 22/22 checks, invariants A–G | ✅ |
| D — Fuji LIVE smoke | Real txHash, receipt status=1, Transfer event in logs | ✅ |
| E — Post-run report | This document | ✅ |
| F — Checklist update | `AXIOM_AVALANCHE_FUJI_CHECKLIST.md` Gate 5 items checked | ✅ |
| G — Validation | `tsc --noEmit`: zero errors in changed files | ✅ |

---

## Files Created or Modified

| File | Action | Description |
|---|---|---|
| `lib/capinfra/adapters/avalanche/config.ts` | Modified | `assertChainEnabled()` gate; `AVALANCHE_FUJI_RPC_URL` support; `AVALANCHE_DEPLOYER_PRIVATE_KEY` preference |
| `lib/capinfra/adapters/avalanche/dispatcher.ts` | Modified | `liveDispatch()` calls `assertChainEnabled()`; chainId-aware RPC selection |
| `scripts/vault-sprint-avalanche-fuji.ts` | Created | Gate 5 proof: 22 checks, A–G; imports from `shared/contracts-avalanche.ts`; receipt confirmation; delta attribution |
| `documents/chains/AXIOM_AVALANCHE_CAPINFRA_GATE5_DISCOVERY.md` | Created | Phase A discovery report |
| `documents/chains/AXIOM_AVALANCHE_CAPINFRA_GATE5_REPORT.md` | Created | This report |
| `documents/chains/AXIOM_AVALANCHE_FUJI_CHECKLIST.md` | Updated | Gate 5 items checked with final evidence |

---

## Config Hardening (Phase B)

### `lib/capinfra/adapters/avalanche/config.ts`

| Change | Effect |
|---|---|
| `assertChainEnabled()` | LIVE dispatch requires `MULTICHAIN_ENABLED=true` AND `CHAIN_AVALANCHE_ENABLED=true` |
| `avalancheRpcUrl(chainId?)` | Fuji (43113): prefers `AVALANCHE_FUJI_RPC_URL`, falls back to `AVALANCHE_RPC_URL` |
| `deployerPrivateKey()` | Prefers `AVALANCHE_DEPLOYER_PRIVATE_KEY`, falls back to `DEPLOYER_PRIVATE_KEY` |

### `lib/capinfra/adapters/avalanche/dispatcher.ts`

- `liveDispatch()` calls `assertChainEnabled()` as first check
- `liveDispatch()` passes chainId to `avalancheRpcUrl(chainId)` for Fuji-specific RPC

---

## On-Chain Confirmation Detail (Invariant C)

The proof script performs a **four-step** on-chain confirmation for Invariant C:

1. **C3** — `adapter.dispatch()` returns a 64-hex string matching `/^0x[0-9a-fA-F]{64}$/`
2. **C4** — `provider.waitForTransaction(txHash, 1, 120_000)` obtains a receipt (≥1 confirmation, 120s timeout)
3. **C5** — `receipt.status === 1` asserts the tx was mined without revert
4. **C6** — Scans receipt logs for `Transfer(from=0x0, to=deployer, value=SMOKE_MINT_RAW)` event by topic0/topic1/topic2 — confirms the MINT call executed successfully for the correct recipient

This rules out the possibility of a broadcast-only proof (tx submitted but reverted) or a format-only proof (hash checks only, no confirmation).

---

## On-Chain Attribution Detail (Invariant G)

The proof captures `balanceOf(deployer)` **before** the LIVE dispatch (pre-dispatch snapshot), then again **after** receipt confirmation (post-dispatch snapshot). The delta `post - pre` is asserted to equal `SMOKE_MINT_RAW` (1 raw unit at 6 decimals). This rules out false-pass from any pre-existing deployer balance on the testnet.

---

## Settlement Type Routing Gap (Formally Documented — Task #483)

`capSettlementTypeEnum` in `shared/capInfraSchema.ts` does not include `'AVALANCHE'`.
Avalanche assets use `settlementType='EVM'` in the DB (correct — Avalanche C-Chain is EVM-compatible).
The AVALANCHE adapter is exercised via `getAdapter('AVALANCHE')` directly. This is correct for Gate 5 —
all invariants are proven on the actual adapter dispatch path.

**Tracked by:** Task #483 — not a Gate 5 blocker.

---

## TypeScript Validation (Phase G)

```
npx tsc --noEmit --skipLibCheck
```

Zero TypeScript errors in all changed files. Pre-existing errors in unrelated modules
(`field-intelligence`, `commodities`) are unchanged — confirmed not regressions from this task.

---

## Environment for Gate 5 Run

| Variable | Status |
|---|---|
| `AVALANCHE_ADAPTER_MODE` | `LIVE` (Gate 5 run); production default: `DRY_RUN` |
| `AVALANCHE_ADAPTER_LIVE_ALLOWLIST` | `AXUSD-FUJI` |
| `AVALANCHE_RPC_URL` | `<SET>` |
| `DEPLOYER_PRIVATE_KEY` | `<SET>` (fallback; no dedicated `AVALANCHE_DEPLOYER_PRIVATE_KEY` — Task #484) |
| `MULTICHAIN_ENABLED` | `true` |
| `CHAIN_AVALANCHE_ENABLED` | `true` |

---

## Mainnet Promotion Gate Status

**Gate 5 (this gate): SATISFIED ✅**

Remaining gates before Avalanche C-Chain mainnet promotion (all NO-GO):
- Security review of Phase 2 contracts
- Multi-party authorization wallet (Gnosis Safe on Avalanche C-Chain) funded
- Mainnet deployer key (Task #484: separate from Fuji key)
- Disclosure documents updated to include Avalanche C-Chain
- `AVALANCHE_CONTRACTS` in `shared/contracts-avalanche.ts` populated post-mainnet-deploy

**Avalanche mainnet remains NO-GO. Arbitrum One remains the canonical chain for all reserve, accounting, identity, issuance, policy, and solvency operations.**

---

## Final Verdict

```
AVALANCHE CAPINFRA GATE 5 SATISFIED
22/22 checks passed — invariants A–G all PASS
```

| Invariant | Result | Key evidence |
|---|---|---|
| A — Adapter registration | ✅ PASS | kind=AVALANCHE; no shadow branch; FUJI_CONTRACTS from shared/contracts-avalanche.ts |
| B — DRY_RUN safety | ✅ PASS | 0xavadry-… synthetic ref; chainId=43113 in receipt |
| C — LIVE dispatch confirmed | ✅ PASS | txHash `0xf10d156…69ef8c`; receipt status=1; Transfer event in logs |
| D — SUBMITTED ≠ credited | ✅ PASS | Portfolio unchanged while SUBMITTED |
| E — Explicit confirmation | ✅ PASS | `externallySettleInstruction` → SETTLED; portfolio credited delta=0.000001 |
| F — No double-credit | ✅ PASS | ConflictError on duplicate; qty unchanged |
| G — Final reconciliation | ✅ PASS | delta=1 raw (pre=744000004 post=744000005) == SMOKE_MINT_RAW; DB consistent |

---

## Task #483 — Canonical Routing Closure (2026-05-14)

Gate 5 was initially satisfied with Fuji assets stored as `settlementType='EVM'`, using
`getAdapter('AVALANCHE')` directly in the proof script. Task #483 closed this routing gap.

### Changes made

| Item | Change |
|---|---|
| `shared/capInfraSchema.ts` | `'AVALANCHE'` added to `capSettlementTypeEnum` |
| `migrations/0059_cap_settlement_type_avalanche.sql` | `ALTER TYPE "cap_settlement_type" ADD VALUE IF NOT EXISTS 'AVALANCHE'` |
| `scripts/capinfra-seed.ts` | AXUSD-FUJI seeded with `settlementType: 'AVALANCHE'`; idempotent UPDATE for existing stale rows |
| `scripts/vault-sprint-avalanche-fuji.ts` | All `settlementType: 'EVM'` replaced with `'AVALANCHE'`; Invariant A4 added; G4 updated |
| DB `cap_assets` | AXUSD-FUJI `settlement_type` updated `EVM → AVALANCHE` |

### Invariant A4 (new)

```
[✓] A4 executeInstruction routing: getAdapter(settlementType=AVALANCHE) resolves correctly
     getAdapter('AVALANCHE') → kind=AVALANCHE — canonical routing confirmed
```

### Proof under canonical routing

Two consecutive LIVE Fuji runs after Task #483 closed — all invariants A–G pass (EXIT=0):

| Run | txHash | Block |
|---|---|---|
| Run 1 | `0x00c96e85b009…fecf1c9db5` | 55331174 |
| Run 2 | `0x738a90c5f3d6…00b662ee` | 55331303 |

**Gate 5 remains SATISFIED under canonical routing. Task #483 COMPLETE.**
