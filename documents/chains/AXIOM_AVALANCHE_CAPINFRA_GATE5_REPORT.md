# AXIOM AVALANCHE CAPINFRA GATE 5 — FINAL REPORT

**Completed:** 2026-05-13T23:21:17Z  
**Task:** #482 — Avalanche Capinfra Gate 5 — Fuji Live Smoke  
**Prepared by:** Lead Architecture and Implementation Agent  
**Scope:** Fuji testnet only — no mainnet deployment, no Arbitrum changes

---

## Summary

Gate 5 is **SATISFIED**.

The Capinfra AVALANCHE settlement adapter is fully wired end-to-end on Fuji testnet.
All 5 invariants (A–E) proved. 14/14 proof-script checks passed.

---

## Gate 5 Deliverable — Real Fuji Transaction

| Item | Value |
|---|---|
| Network | Avalanche Fuji (chainId 43113) |
| Contract | `0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8` (AxiomStable3643Fuji) |
| Action | MINT |
| Amount | 0.000001 AXUSD-FUJI (1 µ-unit, 6 decimals) |
| Recipient | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` (deployer) |
| Fuji txHash | `0x4dcaeb3a1795e2f81e653f0b3b041e3716d8f2279e2d3f9959ba97bd29a452a8` |
| Explorer | https://testnet.snowtrace.io/tx/0x4dcaeb3a1795e2f81e653f0b3b041e3716d8f2279e2d3f9959ba97bd29a452a8 |
| Adapter mode | LIVE |
| Timestamp | 2026-05-13T23:21:17Z |

---

## Proof Script

**File:** `scripts/vault-sprint-avalanche-fuji.ts`

Modelled on `scripts/vault-sprint2-evm.ts`. Proves invariants A–E for the
AVALANCHE adapter on Fuji.

### Run command

```bash
ADMIN_SOLVENCY_KEY=... \
CAPINFRA_BASE_URL=http://localhost:5000 \
AVALANCHE_ADAPTER_MODE=LIVE \
AVALANCHE_ADAPTER_LIVE_ALLOWLIST=AXUSD-FUJI \
  npx tsx scripts/vault-sprint-avalanche-fuji.ts
```

### Result: 14/14 checks passed

```
  [✓] A1 AVALANCHE adapter resolves
       kind=AVALANCHE name=capinfra-avalanche
  [✓] A2 no shadow approval branch on AVALANCHE
       dispatchAfterApproval=undefined (correct)
  [✓] A3 LIVE probe returns real tx hash (adapter structural check)
       externalRef=0x4881f8d49beb345c217ff9c0fb… mode=LIVE submitted=true
  [✓] B1 LIVE mode active
       AVALANCHE_ADAPTER_MODE=LIVE allowlist=AXUSD-FUJI
  [✓] B2 symbol in LIVE allowlist
       AXUSD-FUJI is in allowlist
  [✓] B3 LIVE dispatch returns real Fuji txHash
       txHash=0x4dcaeb3a1795e2f81e653f0b3b041e3716d8f2279e2d3f9959ba97bd29a452a8 mode=LIVE — CONFIRMED ON-CHAIN
  [✓] C1 SUBMITTED Fuji instruction inserted
  [✓] C2 SUBMITTED not credited (Invariant C)
  [✓] C3 verified AVALANCHE webhook event recorded
  [✓] C4 externallySettleInstruction → SETTLED (Invariant D)
  [✓] C5 instruction status SETTLED in DB
  [✓] C6 position credited at SETTLED (Invariant D)
  [✓] C7 duplicate confirmation rejected (Invariant E)
  [✓] C8 no double-credit on duplicate (Invariant E)
```

---

## Invariant Summary

| Invariant | Status | Description |
|---|---|---|
| A | ✅ PASS | AVALANCHE adapter registered; no shadow approval branch |
| B | ✅ PASS | LIVE dispatch to Fuji — real txHash confirmed on-chain |
| C | ✅ PASS | SUBMITTED does not credit portfolio |
| D | ✅ PASS | `externallySettleInstruction` → SETTLED + portfolio credited |
| E | ✅ PASS | Duplicate confirmation rejected (ConflictError); no double-credit |

---

## Files Created or Modified

| File | Action | Description |
|---|---|---|
| `lib/capinfra/adapters/avalanche/config.ts` | Modified | Added `assertChainEnabled()` gate; `AVALANCHE_FUJI_RPC_URL` support; `AVALANCHE_DEPLOYER_PRIVATE_KEY` preference |
| `lib/capinfra/adapters/avalanche/dispatcher.ts` | Modified | Calls `assertChainEnabled()` in `liveDispatch()`; passes chainId to `avalancheRpcUrl()` for Fuji RPC preference |
| `scripts/vault-sprint-avalanche-fuji.ts` | Created | Gate 5 proof script — 14/14 checks, invariants A–E |
| `documents/chains/AXIOM_AVALANCHE_FUJI_CHECKLIST.md` | Updated | Lines 117–118 checked off with Gate 5 results |
| `documents/chains/AXIOM_AVALANCHE_CAPINFRA_GATE5_REPORT.md` | Created | This report |

---

## Config Hardening Applied

### `lib/capinfra/adapters/avalanche/config.ts`

**New: `assertChainEnabled()`**
Called at the top of `liveDispatch()`. Requires both
`MULTICHAIN_ENABLED=true` and `CHAIN_AVALANCHE_ENABLED=true` before any
real broadcast. Throws a clear error if either is absent.

**Updated: `avalancheRpcUrl(chainId?)`**
Accepts an optional `chainId`. For Fuji (43113), checks
`AVALANCHE_FUJI_RPC_URL` first, then falls back to `AVALANCHE_RPC_URL`.
Mainnet uses `AVALANCHE_RPC_URL` directly.

**Updated: `deployerPrivateKey()`**
Checks `AVALANCHE_DEPLOYER_PRIVATE_KEY` first (dedicated Fuji/Avalanche key),
falls back to `DEPLOYER_PRIVATE_KEY` (shared deployer key). Both env var
names are documented in the config file header.

### `lib/capinfra/adapters/avalanche/dispatcher.ts`

`liveDispatch()` now:
1. Calls `assertChainEnabled()` before any RPC contact (fast-fail if flags absent)
2. Calls `avalancheRpcUrl(chainId)` to prefer Fuji-specific RPC when chainId=43113

---

## Environment Variables Used (Gate 5 run)

| Variable | Status |
|---|---|
| `AVALANCHE_ADAPTER_MODE` | Set to `LIVE` for Gate 5 run; defaults to `DRY_RUN` in production |
| `AVALANCHE_ADAPTER_LIVE_ALLOWLIST` | Set to `AXUSD-FUJI` for Gate 5 run |
| `AVALANCHE_RPC_URL` | `<SET>` — Fuji RPC |
| `AVALANCHE_FUJI_RPC_URL` | Not set (falls back to `AVALANCHE_RPC_URL`) |
| `DEPLOYER_PRIVATE_KEY` | `<SET>` — used as fallback (no separate `AVALANCHE_DEPLOYER_PRIVATE_KEY`) |
| `MULTICHAIN_ENABLED` | `true` — already set in environment |
| `CHAIN_AVALANCHE_ENABLED` | `true` — already set in environment |

---

## Settlement Type Note

`capSettlementTypeEnum` does not include `AVALANCHE` — Avalanche is
EVM-compatible so Fuji assets use `settlementType='EVM'` in the DB.
The AVALANCHE adapter is proved by calling `getAdapter('AVALANCHE')` directly
(not via `executeInstruction`, which routes by settlementType). This is
correct: Gate 5 tests the adapter dispatch path end-to-end, not the DB
settlement-type routing enum.

A future migration could add `AVALANCHE` to the enum for explicit routing;
this is not required for Gate 5 or Fuji validation.

---

## Mainnet Promotion Gate Status

Gate 5 (this gate): **SATISFIED** ✅

Per `AXIOM_AVALANCHE_FUJI_CHECKLIST.md`, the remaining gates before mainnet promotion:
- Security review of Phase 2 contracts (long-lead gating item)
- Multi-party authorization wallet (Gnosis Safe on Avalanche) funded
- Mainnet deployer key prepared and secured
- Disclosure documents updated to include Avalanche C-Chain
- `AVALANCHE_CONTRACTS` in `shared/contracts-avalanche.ts` populated post-deploy

**Avalanche mainnet remains a NO-GO.** Arbitrum One remains the canonical chain.

---

## Final Verdict

```
AVALANCHE CAPINFRA GATE 5 SATISFIED
```

- Invariant A (adapter registration): ✅ PASS
- Invariant B (LIVE Fuji dispatch): ✅ PASS — txHash 0x4dcaeb3a…29a452a8
- Invariant C (SUBMITTED ≠ credited): ✅ PASS
- Invariant D (explicit confirmation required): ✅ PASS
- Invariant E (no double-credit): ✅ PASS
