# AXIOM AVALANCHE PHASE 2 DRY RUN REPORT (FUJI ONLY)

**Status:** Dry run blocked before deployment execution  
**Canonical chain:** Arbitrum One remains canonical  
**Production behavior:** Avalanche remains disabled by default

## 1) Commands executed

Dependency installation:

```bash
npm ci
```

Avalanche Hardhat compile attempt:

```bash
npx hardhat compile --config hardhat.avalanche.ts
```

Existing Fuji scaffold script attempt:

```bash
MULTICHAIN_ENABLED=true CHAIN_AVALANCHE_ENABLED=true \
  npx hardhat run scripts/deploy/avalanche/deploy-phase1-fuji.ts \
  --config hardhat.avalanche.ts \
  --network avalancheFuji
```

Direct script attempt through `tsx`:

```bash
MULTICHAIN_ENABLED=true CHAIN_AVALANCHE_ENABLED=true \
  npx tsx scripts/deploy/avalanche/deploy-phase1-fuji.ts
```

Fuji public RPC chain ID check:

```bash
eth_chainId -> 0xa869
```

`0xa869` is decimal `43113`, matching Avalanche Fuji.

Runtime flag safety check with env absent:

```json
{
  "multichain": false,
  "avalanche": false,
  "arbitrum": true,
  "enabledChains": ["arbitrum", "ethereum"],
  "avalancheRpc": null
}
```

## 2) Config load result

Static validation of `hardhat.avalanche.ts` is internally consistent for Fuji:

- `avalancheFuji.chainId` is `43113`.
- default Fuji RPC is `https://api.avax-test.network/ext/bc/C/rpc`.
- accounts are sourced only from `AVALANCHE_DEPLOYER_PRIVATE_KEY`.
- artifacts and cache are isolated under `artifacts/avalanche` and
  `cache/avalanche`.
- sources are isolated to `contracts-axusd-3643`.

Hardhat did not load the config at runtime. The local Hardhat invocation failed
before compilation with:

```text
Hardhat only supports ESM projects.

Please make sure you have `"type": "module"` in your package.json.
```

This prevented a clean Hardhat-level dry run.

## 3) Deployment script input resolution

The existing script at `scripts/deploy/avalanche/deploy-phase1-fuji.ts` is
scaffold-only:

- it checks `network.config.chainId === 43113`
- it requires `MULTICHAIN_ENABLED=true`
- it requires `CHAIN_AVALANCHE_ENABLED=true`
- it writes `deployments/avalanche/fuji-phase1.template.json`
- it does not deploy contracts or resolve constructor/initializer inputs

The script could not execute through Hardhat because of the ESM blocker above.
The direct `tsx` attempt also failed because importing Hardhat from the current
CommonJS project path hit Hardhat's top-level-await ESM output:

```text
Top-level await is currently not supported with the "cjs" output format
```

## 4) Artifact and ABI expectations

Artifact generation was not validated because `npx hardhat compile --config
hardhat.avalanche.ts` failed before Solidity compilation.

Static source validation found the expected contract names and initializer
surface for the Phase 2 set:

- `IdentityRegistryStorage.initialize()`
- `TrustedIssuersRegistry.initialize()`
- `ClaimTopicsRegistry.initialize()`
- `IdentityRegistry.initialize(address,address,address)`
- `ModularCompliance.initialize()`
- `CountryAllowModule` standalone constructor with no external args
- `TransferLimitModule` standalone constructor with no external args
- `AxiomStable3643.initialize(address,address,string,string,uint8,address)`
- `AxiomProxy.constructor(address,bytes)`

Because compile did not complete, ABI bytecode readiness remains unproven.

## 5) Real Fuji deployment readiness

Real Fuji deployment did not proceed.

Blockers:

1. `AVALANCHE_DEPLOYER_PRIVATE_KEY` is unset in this environment.
2. `MULTICHAIN_ENABLED` and `CHAIN_AVALANCHE_ENABLED` are unset by default, as
   expected for production safety.
3. Hardhat 3 cannot run in the current non-ESM package configuration.
4. The existing Fuji script is scaffold-only and contains no real deployment
   path.

## 6) Exact fixes required before real Fuji deployment

1. Choose an isolated Hardhat runtime fix that does not destabilize the root
   Next.js app:
   - either convert the repo to ESM and audit all CommonJS scripts and build
     behavior before deployment, or
   - pin the Hardhat toolchain to a CommonJS-compatible Hardhat 2 stack with
     matching plugin versions, or
   - create an isolated Avalanche deployment package/config that can be ESM
     without changing root app runtime semantics.
2. Add a guarded Phase 2 deployment entrypoint that deploys only the approved
   eight-contract Fuji set and requires an explicit real-deploy flag, for
   example `AVALANCHE_PHASE2_REAL_DEPLOY=true`.
3. Provide a dedicated funded Fuji-only deployer key through
   `AVALANCHE_DEPLOYER_PRIVATE_KEY`.
4. Run compile and dry-run again before any real deployment:

```bash
npm ci
npx hardhat compile --config hardhat.avalanche.ts
MULTICHAIN_ENABLED=true CHAIN_AVALANCHE_ENABLED=true AVALANCHE_PHASE1_DRY_RUN=true \
  npx hardhat run scripts/deploy/avalanche/deploy-phase1-fuji.ts \
  --config hardhat.avalanche.ts \
  --network avalancheFuji
```

5. Only after the dry run is clean, run the real Fuji deployment with the funded
   Fuji key and capture addresses/transaction hashes.

## 7) Safety result

No production logic was changed during the dry run. No Arbitrum, Polygon, Sui,
banking, reserve, accounting, or payment behavior was modified.
