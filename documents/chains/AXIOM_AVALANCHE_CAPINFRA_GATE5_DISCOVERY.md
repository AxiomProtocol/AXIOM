# AXIOM AVALANCHE CAPINFRA GATE 5 — ADAPTER DISCOVERY REPORT

**Phase A deliverable — Task #482**  
**Completed:** 2026-05-13  
**Scope:** Audit of `lib/capinfra/adapters/` for AVALANCHE adapter pattern and Fuji readiness

---

## 1) Does an AVALANCHE adapter exist?

**Yes.** A complete AVALANCHE settlement adapter was found at:

```
lib/capinfra/adapters/avalanche/
  index.ts       — SettlementAdapter wrapper; kind='AVALANCHE'
  config.ts      — Mode resolution (DRY_RUN|LIVE|DISABLED), env var helpers
  dispatcher.ts  — Full dispatch logic: toWei, resolveRoute, dryRunDispatch, liveDispatch
```

The adapter is registered in `lib/capinfra/adapters/registry.ts`:

```typescript
import { avalancheAdapter } from './avalanche/index';
// ...
register(avalancheAdapter); // kind='AVALANCHE'
```

---

## 2) EVM adapter pattern comparison

| Concern | EVM adapter (`evm.ts`) | AVALANCHE adapter (`avalanche/`) |
|---|---|---|
| Mode env var | `EVM_ADAPTER_MODE` | `AVALANCHE_ADAPTER_MODE` |
| Default mode | `DRY_RUN` | `DRY_RUN` |
| Live allowlist | `EVM_ADAPTER_LIVE_ALLOWLIST` | `AVALANCHE_ADAPTER_LIVE_ALLOWLIST` |
| RPC URL | `ALCHEMY_API_KEY` (Alchemy) | `AVALANCHE_RPC_URL` / `AVALANCHE_FUJI_RPC_URL` |
| Signing key | `DEPLOYER_PRIVATE_KEY` | `AVALANCHE_DEPLOYER_PRIVATE_KEY` → fallback `DEPLOYER_PRIVATE_KEY` |
| Chain gate | None (Arbitrum always enabled) | `MULTICHAIN_ENABLED` + `CHAIN_AVALANCHE_ENABLED` |
| Supported chain IDs | `[42161]` (Arbitrum One) | `[43114, 43113]` (C-Chain + Fuji) |
| Contract interface | ERC-20 minimal ABI | ERC-20 minimal ABI (same) |
| dispatch() path | dryRun or live | dryRun or live |
| dispatchAfterApproval | undefined | undefined |
| Adapter kind | `'EVM'` | `'AVALANCHE'` |

The AVALANCHE adapter correctly mirrors the EVM pattern with Avalanche-specific env vars and chain gates.

---

## 3) Settlement type routing gap

**Critical finding:** `capSettlementTypeEnum` in `shared/capInfraSchema.ts` does not include `'AVALANCHE'`:

```typescript
export const capSettlementTypeEnum = pgEnum('cap_settlement_type', [
  'INTERNAL', 'EVM', 'STELLAR', 'ACH', 'WIRE', 'SWIFT',
  // 'AVALANCHE' is not present
]);
```

This means `executeInstruction()` in `lib/capinfra/settlement.ts` cannot route a DB instruction
to the AVALANCHE adapter by `settlementType` — it would need to look up the adapter by
`settlementType='AVALANCHE'`, which is not a valid enum value.

**Current workaround:** Fuji assets use `settlementType='EVM'` in the DB (correct — Avalanche
is EVM-compatible). The AVALANCHE adapter is exercised by calling `getAdapter('AVALANCHE')` directly.

**Path to close the gap:** Add `'AVALANCHE'` to `capSettlementTypeEnum` (requires a Postgres
ALTER TYPE migration + Drizzle schema update), then update `executeInstruction` to map
`settlementType='AVALANCHE'` → AVALANCHE adapter. This is tracked as Task #483.

---

## 4) Source of truth for Fuji contracts

Fuji contract addresses live in **`shared/contracts-avalanche.ts`** — `FUJI_CONTRACTS` object:

```typescript
export const FUJI_CONTRACTS: AvalancheContractAddresses = {
  IdentityRegistryStorage: '0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215',
  TrustedIssuersRegistry:  '0x0dF7D62f7Eda24798f6840D5B10E453de097D324',
  ClaimTopicsRegistry:     '0x207BE0EE444c82AC4252284a04e6D9101Dfa570c',
  IdentityRegistry:        '0x75ed20d260292D869f9Ec4F035Db4B93072D7963',
  ModularCompliance:       '0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66',
  CountryAllowModule:      '0xe15Cf94D324cc8882015ed71C39F002e3709ec54',
  TransferLimitModule:     '0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc',
  AxiomStable3643:         '0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8',
};
export const FUJI_CHAIN_ID = 43113;
```

The proof script (`scripts/vault-sprint-avalanche-fuji.ts`) imports from this module.
No Fuji contract address is hardcoded in the adapter files.

---

## 5) Instruction types supported

The AVALANCHE dispatcher (`dispatcher.ts`) supports:

| actionType | On-chain call |
|---|---|
| `MINT` | `contract.mint(to, amountWei)` |
| `REDEEM` | `contract.burn(from, amountWei)` |
| `TRANSFER` | `contract.transfer(to, amountWei)` |

Unsupported types throw immediately with a clear error.

---

## 6) What must stay Arbitrum-canonical

| Surface | Status |
|---|---|
| `shared/contracts.ts` (Arbitrum addresses) | Unchanged |
| `lib/capinfra/adapters/evm.ts` | Unchanged |
| `lib/capinfra/adapters/registry.ts` | AVALANCHE added; EVM unchanged |
| `SUPPORTED_LIVE_CHAIN_IDS` in EVM adapter | Arbitrum only (`[42161]`) — unchanged |
| All banking / payment / reserve routes | Unchanged |
| Public-facing pages | No new routes added |

The AVALANCHE adapter runs only when `AVALANCHE_ADAPTER_MODE=LIVE` and both
`MULTICHAIN_ENABLED=true` and `CHAIN_AVALANCHE_ENABLED=true` are set. Neither flag
is set in production; the adapter is inert in all standard deployments.

---

## 7) Hardening applied (Phase B)

During Gate 5 implementation, the following hardening was applied to the AVALANCHE adapter:

| Change | File | Effect |
|---|---|---|
| `assertChainEnabled()` | `config.ts` | LIVE dispatch requires both multichain flags |
| `avalancheRpcUrl(chainId?)` | `config.ts` | Prefers `AVALANCHE_FUJI_RPC_URL` for chainId=43113 |
| `deployerPrivateKey()` | `config.ts` | Prefers `AVALANCHE_DEPLOYER_PRIVATE_KEY` over `DEPLOYER_PRIVATE_KEY` |
| `liveDispatch()` calls `assertChainEnabled()` | `dispatcher.ts` | Fast-fail if flags absent |
| `liveDispatch()` passes chainId to `avalancheRpcUrl()` | `dispatcher.ts` | Correct RPC for Fuji |

---

## 8) Discovery verdict

```
AVALANCHE ADAPTER EXISTS AND IS WIRED
Gate 5 proof can proceed to Phase C (proof script).
Settlement routing gap (AVALANCHE enum) is tracked as Task #483 — not a Gate 5 blocker.
```
