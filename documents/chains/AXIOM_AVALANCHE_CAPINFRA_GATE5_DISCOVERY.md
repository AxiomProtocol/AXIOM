# AXIOM AVALANCHE CAPINFRA GATE 5 — DISCOVERY

**Date:** 2026-05-13  
**Scope:** Fuji-only Capinfra AVALANCHE adapter Gate 5 readiness

## 1) Adapter discovery result

- `lib/capinfra/adapters/avalanche/index.ts` exists and is registered in `lib/capinfra/adapters/registry.ts`.
- `lib/capinfra/adapters/avalanche/dispatcher.ts` already implements:
  - `MINT`
  - `REDEEM`
  - `TRANSFER`
  - `DRY_RUN | LIVE | DISABLED` mode behavior
- `lib/capinfra/adapters/avalanche/config.ts` exists and controls env-driven mode/RPC/key resolution.

## 2) How AVALANCHE differs from EVM adapter

- `EVM` adapter is Arbitrum-scoped in LIVE mode (`chainId=42161` only).
- `AVALANCHE` adapter is Avalanche-scoped (`43113` Fuji + `43114` C-Chain allowlist in adapter code).
- Both use the same controlled-flow contract:
  - dispatch returns `submitted=true`
  - settlement service moves instruction to `SUBMITTED`
  - only explicit confirmation may move to `SETTLED`

## 3) Instruction support and dispatch reuse

- Supported action types in current Avalanche dispatcher: `MINT`, `REDEEM`, `TRANSFER`.
- Dispatcher shape is intentionally parallel to `lib/capinfra/adapters/evm.ts` and safely reuses:
  - strict decimal-to-wei conversion rules
  - route extraction from `payloadJson`
  - `submitted=true` async-finality handoff semantics

## 4) Settlement side-effect boundary

- Side-effect boundary is preserved:
  - adapters perform external dispatch only
  - portfolio / ledger / audit settlement effects stay in `lib/capinfra/settlement.ts`
  - `SUBMITTED` explicitly does **not** credit portfolio

## 5) Arbitrum-canonical invariants that must remain unchanged

- Arbitrum One remains canonical for reserve, accounting, identity, issuance, policy, solvency.
- Existing `EVM` adapter path for Arbitrum must remain unchanged.
- No Avalanche auto-enable in production; no runtime default behavior change.

## 6) Fuji-only constraints for Gate 5 proof

- Must use Fuji chainId `43113` only.
- Must use `AxiomStable3643Fuji` from `shared/contracts-avalanche.ts`.
- Must require guarded env for LIVE smoke:
  - `MULTICHAIN_ENABLED=true`
  - `CHAIN_AVALANCHE_ENABLED=true`
  - `AVALANCHE_ADAPTER_MODE=LIVE`
  - `AVALANCHE_FUJI_RPC_URL` (or explicit fallback)
  - `AVALANCHE_DEPLOYER_PRIVATE_KEY` (or documented fallback)
- Must fail safe and leave Gate 5 pending when env/funds are missing.

## 7) Gap identified before implementation hardening

- Avalanche adapter existed but required hardening for Gate 5 requirements:
  - DRY_RUN externalRef needed to be deterministic.
  - LIVE mode needed explicit chain feature-flag gating (`MULTICHAIN_ENABLED` + `CHAIN_AVALANCHE_ENABLED`).
  - Fuji-specific env naming needed first-class support (`AVALANCHE_FUJI_RPC_URL`, `AVALANCHE_DEPLOYER_PRIVATE_KEY` with safe fallback).
  - Settlement routing needed explicit AVALANCHE adapter selection for Avalanche-chain EVM assets.
