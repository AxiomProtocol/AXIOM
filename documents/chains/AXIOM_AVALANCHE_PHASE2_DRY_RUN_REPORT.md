# AXIOM AVALANCHE PHASE 2 DRY RUN REPORT (FUJI ONLY)

**Status:** Hardhat compile and scaffold dry run pass through isolated Fuji tooling  
**Canonical chain:** Arbitrum One remains canonical  
**Production behavior:** Avalanche remains disabled by default

## 1) Commands executed

Dependency installation:

```bash
npm ci
```

Avalanche Hardhat compile:

```bash
npm run avalanche:compile
```

Existing Fuji scaffold script attempt:

```bash
MULTICHAIN_ENABLED=true CHAIN_AVALANCHE_ENABLED=true \
  npx hardhat run scripts/deploy/avalanche/deploy-phase1-fuji.ts \
  --config contracts-axusd-3643/hardhat.config.ts \
  --network avalancheFuji
```

The scaffold command was also run from an ignored temp working directory to
avoid committing timestamp-only manifest churn:

```bash
mkdir -p temp-compile-hardhat-run
MULTICHAIN_ENABLED=true CHAIN_AVALANCHE_ENABLED=true \
  npx hardhat run /workspace/scripts/deploy/avalanche/deploy-phase1-fuji.ts \
  --config /workspace/contracts-axusd-3643/hardhat.config.ts \
  --network avalancheFuji
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

Runtime validation now uses the isolated ESM Hardhat project under
`contracts-axusd-3643/`:

- `avalancheFuji.chainId` is `43113`.
- Hardhat 3 network types are explicit: `edr-simulated` for local Hardhat and
  `http` for Fuji.
- default Fuji RPC is `https://api.avax-test.network/ext/bc/C/rpc`.
- accounts are sourced only from `AVALANCHE_DEPLOYER_PRIVATE_KEY`.
- artifacts and cache are isolated under `artifacts/avalanche` and
  `cache/avalanche`.
- sources are isolated to `contracts-axusd-3643`.

The root package remains CommonJS. The ESM boundary is limited to:

```
contracts-axusd-3643/package.json
scripts/deploy/avalanche/package.json
```

## 3) Deployment script input resolution

The script at `scripts/deploy/avalanche/deploy-phase1-fuji.ts` remains
scaffold-only:

- it checks the Hardhat 3 connection chain ID is `43113`
- it requires `MULTICHAIN_ENABLED=true`
- it requires `CHAIN_AVALANCHE_ENABLED=true`
- it writes `deployments/avalanche/fuji-phase1.template.json`
- it does not deploy contracts or resolve constructor/initializer inputs

The script now executes through Hardhat 3 using `network.create()`.

## 4) Artifact and ABI expectations

Artifact generation was validated with:

```bash
npm run avalanche:compile
```

Result:

```text
Compiled 26 Solidity files with solc 0.8.24 (evm target: paris)
```

Static source validation found the expected contract names and initializer
surface for the Phase 2 set:

- `IdentityRegistryStorage.initialize()`
- `TrustedIssuersRegistry.initialize()`
- `ClaimTopicsRegistry.initialize()`
- `IdentityRegistry.initialize(address,address,address)`
- `ModularCompliance.initialize()`
- `CountryAllowModule` standalone constructor with no external args
- `TransferLimitModule` standalone constructor with no external args
- `AxiomStable3643Fuji` inherits
  `AxiomStable3643.initialize(address,address,string,string,uint8,address)`
- `AxiomProxy.constructor(address,bytes)`

ABI and bytecode readiness is now proven for the contract source tree through
Hardhat 3 compile.

## 5) Real Fuji deployment readiness

Real Fuji deployment did not proceed.

Blockers:

1. `AVALANCHE_DEPLOYER_PRIVATE_KEY` is unset in this environment.
2. `MULTICHAIN_ENABLED` and `CHAIN_AVALANCHE_ENABLED` are unset by default, as
   expected for production safety.
3. The existing Fuji script is scaffold-only and contains no real deployment
   path.

## 6) Exact fixes required before real Fuji deployment

1. Add a guarded Phase 2 deployment entrypoint that deploys only the approved
   eight-contract Fuji set and requires an explicit real-deploy flag, for
   example `AVALANCHE_PHASE2_REAL_DEPLOY=true`.
2. Provide a dedicated funded Fuji-only deployer key through
   `AVALANCHE_DEPLOYER_PRIVATE_KEY`.
3. Run compile and dry-run again before any real deployment:

```bash
npm ci
npm run avalanche:compile
MULTICHAIN_ENABLED=true CHAIN_AVALANCHE_ENABLED=true AVALANCHE_PHASE1_DRY_RUN=true \
  npx hardhat run scripts/deploy/avalanche/deploy-phase1-fuji.ts \
  --config contracts-axusd-3643/hardhat.config.ts \
  --network avalancheFuji
```

4. Only after the dry run is clean, run the real Fuji deployment with the funded
   Fuji key and capture addresses/transaction hashes.

## 7) Safety result

No production logic was changed during the dry run. No Arbitrum, Polygon, Sui,
banking, reserve, accounting, or payment behavior was modified.
