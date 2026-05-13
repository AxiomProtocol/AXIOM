# AXIOM AVALANCHE PHASE 2 PRE-DEPLOY NOTE (FUJI ONLY)

**Status:** COMPLETE — real Fuji deploy executed 2026-05-13T19:58:41Z  
**Updated:** 2026-05-13 (reconciled with actual deploy outcome)  
**Canonical chain:** Arbitrum One remains canonical  
**Production behavior:** Avalanche remains disabled by default

---

## 1) Exact Phase 2 contract set

Phase 2 deploys exactly 8 contracts — the reduced ERC-3643-related Fuji set
approved by the Phase 1 contract plan:

| # | Contract | Source | Notes |
|---|---|---|---|
| 1 | `IdentityRegistryStorage` | @tokenysolutions/t-rex pre-compiled | Direct deploy, `init()` post-construction |
| 2 | `TrustedIssuersRegistry`  | @tokenysolutions/t-rex pre-compiled | Direct deploy, `init()` post-construction |
| 3 | `ClaimTopicsRegistry`     | @tokenysolutions/t-rex pre-compiled | Direct deploy, `init()` post-construction |
| 4 | `IdentityRegistry`        | @tokenysolutions/t-rex pre-compiled | Direct deploy, `init(TIR,CTR,IRS)` post-construction |
| 5 | `ModularCompliance`       | @tokenysolutions/t-rex pre-compiled | Direct deploy, `init()` post-construction |
| 6 | `CountryAllowModule`      | Axiom custom (`contracts-axusd-3643/`) | Direct deploy, no init |
| 7 | `TransferLimitModule`     | Axiom custom (`contracts-axusd-3643/`) | Direct deploy, no init |
| 8 | `AxiomStable3643Fuji`     | Axiom custom (`contracts-axusd-3643/`) | Direct deploy with constructor args |

**Architecture note:** The T-REX contracts use their own upgradeable pattern with
`init()` called immediately after deployment. No UUPS/transparent proxy wrapper
(`AxiomProxy`) is used in this Phase 2 set. All 8 contracts are deployed directly;
upgradeability is handled internally by T-REX.

## 2) Deployment order

```
1. IdentityRegistryStorage  (T-REX official)  → init()
2. TrustedIssuersRegistry   (T-REX official)  → init()
3. ClaimTopicsRegistry      (T-REX official)  → init()
4. IdentityRegistry         (T-REX official)  → init(TIR, CTR, IRS)
5. ModularCompliance        (T-REX official)  → init()

6. CountryAllowModule       (Axiom custom)
7. TransferLimitModule      (Axiom custom)
8. AxiomStable3643Fuji      (Axiom custom, args: IR, MC, name, symbol, decimals, owner)

Post-deploy wiring:
  IRS.bindIdentityRegistry(IR)
  MC.bindToken(token)
  MC.addModule(CAM) / MC.addModule(TLM)
  CAM.setAllowAll(MC, true)        — Fuji testnet default
  IR.addAgent(deployer)
  IR.registerIdentity(deployer)    — smoke-test seed
```

## 3) Required constructor and initializer inputs

| Contract | Constructor args | Post-deploy call |
|---|---|---|
| `IdentityRegistryStorage` | none | `init()` |
| `TrustedIssuersRegistry`  | none | `init()` |
| `ClaimTopicsRegistry`     | none | `init()` |
| `IdentityRegistry`        | none | `init(tirAddr, ctrAddr, irsAddr)` |
| `ModularCompliance`       | none | `init()` |
| `CountryAllowModule`      | none | none |
| `TransferLimitModule`     | none | none |
| `AxiomStable3643Fuji`     | `irAddr, mcAddr, "Axiom Stable USD", "AXUSD", 6, deployer` | none |

## 4) Required environment variables

```env
MULTICHAIN_ENABLED=true
CHAIN_AVALANCHE_ENABLED=true
AVALANCHE_PHASE2_REAL_DEPLOY=true
AVALANCHE_DEPLOYER_PRIVATE_KEY=<dedicated funded Fuji-only key>
                              (DEPLOYER_PRIVATE_KEY accepted as fallback)
AVALANCHE_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
```

Optional:

```env
SNOWTRACE_API_KEY=<routescan api key for post-deploy verification>
```

Without `AVALANCHE_PHASE2_REAL_DEPLOY=true` the script defaults to dry-run mode
and does not broadcast any transactions.

## 5) Expected outputs

On successful real Fuji deployment:

- 8 deployed contract addresses on chainId 43113
- transaction hashes for each deployment
- wiring confirmations for all 12 post-deploy steps
- manifest written to `deployments/avalanche/fuji-phase1.json`
- `shared/contracts-avalanche.ts` FUJI_CONTRACTS updated automatically

`shared/contracts.ts` and all Arbitrum deployment manifests must remain unchanged.

## 6) Deploy toolchain

The deploy runs from the isolated `hardhat-avalanche/` subfolder (Hardhat 3,
ESM, `"type":"module"` in its own `package.json`). This subfolder is completely
isolated from the root Next.js app — it cannot affect the main build.

```bash
# Dry run (safe default)
npm run deploy:avalanche:fuji

# Real broadcast
AVALANCHE_PHASE2_REAL_DEPLOY=true npm run deploy:avalanche:fuji
```

Both commands resolve through:

```
npm run install:avalanche \
  && cd hardhat-avalanche \
  && npx hardhat run ../scripts/deploy/avalanche/deploy-phase1-fuji.mts \
     --config hardhat.config.mts --network avalancheFuji
```

## 7) Explicitly out of scope

- Avalanche mainnet deployment (chainId 43114)
- Enabling Avalanche in production runtime
- Wiring Avalanche into public app routes or API surfaces
- Migrating canonical reserve, accounting, identity, issuance, policy, or
  solvency truth away from Arbitrum
- Deploying PSM, staking, emissions, bridge, lending, or banking contracts
- Modifying `shared/contracts.ts` or any live Arbitrum behavior
- Polygon or Sui files, flags, providers, or deployments
