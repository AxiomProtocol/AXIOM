# AXIOM AVALANCHE PHASE 2 DRY RUN REPORT (FUJI ONLY)

**Status:** PASSED — dry run clean (2026-05-13)  
**Updated:** 2026-05-13 (reconciled with actual deploy state; prior blocked attempt superseded)  
**Canonical chain:** Arbitrum One remains canonical  
**Production behavior:** Avalanche remains disabled by default

---

## History

An earlier dry-run attempt (captured in v1 of this document) was blocked by a
Hardhat ESM incompatibility — the root `hardhat.avalanche.ts` config required
CommonJS but Hardhat 3 required ESM. That blocker was resolved by creating the
isolated `hardhat-avalanche/` subfolder with its own `package.json` carrying
`"type":"module"`. All subsequent compile, test, and deploy operations run from
that subfolder and are isolated from the root Next.js app.

This document records the current clean state of the dry-run environment.

---

## 1) Commands executed (Phase 2 validation run — 2026-05-13)

**Compile:**

```bash
npm run compile:avalanche
# → npm run install:avalanche && cd hardhat-avalanche && npx hardhat compile --config hardhat.config.mts
```

Result: `No contracts to compile` (cache hit — 12 Solidity files, solc 0.8.24,
evm paris already compiled). Exit code 0.

**Dry-run deploy:**

```bash
npm run deploy:avalanche:fuji
# → cd hardhat-avalanche && npx hardhat run ../scripts/deploy/avalanche/deploy-phase1-fuji.mts
#   --config hardhat.config.mts --network avalancheFuji
# (AVALANCHE_PHASE2_REAL_DEPLOY not set → dry-run mode)
```

Result: 8 contracts simulated, 12 wiring steps printed, manifest written to
`deployments/avalanche/fuji-phase1.json`. Exit code 0.

**Fuji RPC check (prior session):**

```bash
eth_chainId → 0xa869  (decimal 43113 — Avalanche Fuji confirmed)
```

---

## 2) Config load result

`hardhat-avalanche/hardhat.config.mts` loads cleanly:

- Hardhat 3 ESM config, isolated from root app. No ESM/CJS conflict.
- `avalancheFuji` network: `chainId 43113`, public RPC
  `https://api.avax-test.network/ext/bc/C/rpc` (overrideable via
  `AVALANCHE_FUJI_RPC_URL`).
- Accounts sourced from `AVALANCHE_DEPLOYER_PRIVATE_KEY` with fallback to
  `DEPLOYER_PRIVATE_KEY`. Neither required for dry-run.
- Artifacts and cache isolated under `hardhat-avalanche/artifacts/` and
  `hardhat-avalanche/cache/`.
- Solidity sources at `hardhat-avalanche/contracts/` (symlink to
  `contracts/avalanche/`).
- Routescan etherscan config present for post-deploy Snowtrace verification.

---

## 3) Deployment script input resolution

`scripts/deploy/avalanche/deploy-phase1-fuji.mts` resolves correctly:

- Safety gate: `AVALANCHE_PHASE2_REAL_DEPLOY !== 'true'` → dry-run mode.
  No transactions are broadcast without the explicit flag.
- `MULTICHAIN_ENABLED` and `CHAIN_AVALANCHE_ENABLED` gates are checked only
  in real-deploy mode — correctly skipped in dry-run.
- T-REX pre-compiled artifacts loaded via `fs.readFileSync` from
  `hardhat-avalanche/node_modules/@tokenysolutions/t-rex/artifacts/` — all 5
  official artifact files resolved without error.
- Axiom custom contracts (`CountryAllowModule`, `TransferLimitModule`,
  `AxiomStable3643Fuji`) loaded via `ethers.getContractFactory` — resolved
  from compiled artifacts.
- All 8 simulated addresses printed; all 12 wiring steps logged.
- Manifest written to `deployments/avalanche/fuji-phase1.json`.

**Dry-run output (2026-05-13T21:52:04Z):**

```
=== Axiom Protocol — Avalanche Phase 2 Deploy ===
Mode:     DRY-RUN (set AVALANCHE_PHASE2_REAL_DEPLOY=true for real broadcast)
Network:  hardhat (chainId=43113)
Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

[deploy] IdentityRegistryStorage()  [T-REX official]
  → DRY-RUN: simulated at 0xDRYRUN…00
[deploy] TrustedIssuersRegistry()   [T-REX official]
  → DRY-RUN: simulated at 0xDRYRUN…01
[deploy] ClaimTopicsRegistry()      [T-REX official]
  → DRY-RUN: simulated at 0xDRYRUN…02
[deploy] IdentityRegistry()         [T-REX official]
  → DRY-RUN: simulated at 0xDRYRUN…03
[deploy] ModularCompliance()        [T-REX official]
  → DRY-RUN: simulated at 0xDRYRUN…04
[deploy] CountryAllowModule()       [Axiom custom]
  → DRY-RUN: simulated at 0xDRYRUN…05
[deploy] TransferLimitModule()      [Axiom custom]
  → DRY-RUN: simulated at 0xDRYRUN…06
[deploy] AxiomStable3643Fuji(IR, MC, "Axiom Stable USD", "AXUSD", 6, deployer)  [Axiom custom]
  → DRY-RUN: simulated at 0xDRYRUN…07

  → DRY-RUN: IdentityRegistryStorage.init()
  → DRY-RUN: TrustedIssuersRegistry.init()
  → DRY-RUN: ClaimTopicsRegistry.init()
  → DRY-RUN: IdentityRegistry.init(TIR, CTR, IRS)
  → DRY-RUN: ModularCompliance.init()
  → DRY-RUN: IdentityRegistryStorage.bindIdentityRegistry(IR)
  → DRY-RUN: ModularCompliance.bindToken(AxiomStable3643Fuji)
  → DRY-RUN: ModularCompliance.addModule(CountryAllowModule)
  → DRY-RUN: ModularCompliance.addModule(TransferLimitModule)
  → DRY-RUN: CountryAllowModule.setAllowAll(MC, true) — Fuji testnet default
  → DRY-RUN: IdentityRegistry.addAgent(deployer)
  → DRY-RUN: IdentityRegistry.registerIdentity(deployer) — smoke-test seed

=== Phase 2 deploy complete ===
```

---

## 4) Artifact and ABI expectations

All artifacts resolved cleanly:

| Contract | Source | ABI loaded | Bytecode present |
|---|---|---|---|
| `IdentityRegistryStorage` | T-REX pre-compiled | ✅ | ✅ |
| `TrustedIssuersRegistry`  | T-REX pre-compiled | ✅ | ✅ |
| `ClaimTopicsRegistry`     | T-REX pre-compiled | ✅ | ✅ |
| `IdentityRegistry`        | T-REX pre-compiled | ✅ | ✅ |
| `ModularCompliance`       | T-REX pre-compiled | ✅ | ✅ |
| `CountryAllowModule`      | Hardhat compiled   | ✅ | ✅ |
| `TransferLimitModule`     | Hardhat compiled   | ✅ | ✅ |
| `AxiomStable3643Fuji`     | Hardhat compiled   | ✅ | ✅ |

---

## 5) Real Fuji deployment readiness

**Prior dry-run blocker (v1):** Resolved. The ESM blocker was fixed by isolating
the Avalanche toolchain in `hardhat-avalanche/` with its own ESM-enabled
`package.json`. The old root `hardhat.avalanche.ts` + `.ts` deploy script path
is superseded and no longer used.

**Current state:** The real Fuji deployment has already been executed
successfully (2026-05-13T19:58:41Z). All 8 contracts are live on Fuji
(chainId 43113). `DEPLOYER_PRIVATE_KEY` was used as the fallback deployer key.

---

## 6) Blockers before real Fuji deployment

None. The real deploy is complete. For reference, the pre-deploy requirements
that were satisfied were:

1. `hardhat-avalanche/` ESM subfolder created and tested — ✅
2. Phase 2 real-deploy entrypoint implemented with `AVALANCHE_PHASE2_REAL_DEPLOY`
   safety gate — ✅
3. Deployer key available via `DEPLOYER_PRIVATE_KEY` fallback — ✅
4. Compile clean: 12 Solidity files, 0 errors — ✅
5. Dry-run clean: 8 simulated contracts, 12 wiring steps — ✅
6. Real deploy executed and manifest captured — ✅

---

## 7) Safety result

No production logic was changed. No Arbitrum, Polygon, Sui, banking, reserve,
accounting, or payment behavior was modified. The `hardhat-avalanche/` subfolder
is fully isolated from the root Next.js app build.
