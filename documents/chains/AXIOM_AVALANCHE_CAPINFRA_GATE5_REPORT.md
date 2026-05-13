# AXIOM AVALANCHE CAPINFRA GATE 5 — FUJI REPORT

**Date:** 2026-05-13  
**Scope:** Fuji-only Capinfra AVALANCHE adapter LIVE smoke gate  
**Script:** `scripts/vault-sprint-avalanche-fuji.ts`

## Run context

- Adapter mode at runtime: `AVALANCHE_ADAPTER_MODE` not asserted (blocked before DB-backed flow)
- Instruction id: N/A (blocked)
- External ref / tx hash: N/A (blocked)
- Fuji explorer link: N/A (no LIVE tx broadcast in this environment)

## Status transitions

- No DB-backed instruction lifecycle transitions were executed because `DATABASE_URL` is not configured in this run environment.
- Adapter registration check executed successfully.

## Receipt verification

- On-chain receipt verification: **NOT EXECUTED** (no LIVE tx submitted in this environment)

## Invariant table (A–G)

| Invariant | Result | Evidence |
|---|---|---|
| A. Adapter resolves and is registered as AVALANCHE | ✅ PASS | `getAdapter('AVALANCHE')` returned `kind=AVALANCHE`, `name=capinfra-avalanche` |
| B. DRY_RUN synthetic reference and no broadcast | ⚠ BLOCKED | `DATABASE_URL is required` |
| C. LIVE dispatch broadcasts real Fuji tx | ⚠ BLOCKED | `DATABASE_URL is required` |
| D. SUBMITTED does not credit portfolio | ⚠ BLOCKED | `DATABASE_URL is required` |
| E. Explicit confirmation required before SETTLED | ⚠ BLOCKED | `DATABASE_URL is required` |
| F. Duplicate confirmation no double-credit | ⚠ BLOCKED | `DATABASE_URL is required` |
| G. Final state and balances reconcile | ⚠ BLOCKED | `DATABASE_URL is required` |

## Gate 5 decision

**Gate 5 satisfied:** **NO**  
**Verdict:** `GATE 5 STILL PENDING`

## Exact blockers

1. `DATABASE_URL` missing in the execution environment (required for settlement state-machine + portfolio invariant proof).
2. Because DB-backed flow is blocked, LIVE Fuji broadcast proof and mined-receipt verification were not reachable in this run.

## Remaining work before mainnet promotion

1. Run `scripts/vault-sprint-avalanche-fuji.ts` in guarded Fuji env with:
   - `DATABASE_URL`
   - `MULTICHAIN_ENABLED=true`
   - `CHAIN_AVALANCHE_ENABLED=true`
   - `AVALANCHE_ADAPTER_MODE=LIVE`
   - `AVALANCHE_FUJI_RPC_URL`
   - `AVALANCHE_DEPLOYER_PRIVATE_KEY` (or documented fallback)
2. Capture:
   - live instruction id
   - tx hash
   - mined receipt
   - explorer link
   - full A–G PASS table
3. Only after full A–G PASS, mark Gate 5 SATISFIED in `documents/chains/AXIOM_AVALANCHE_FUJI_CHECKLIST.md`.
