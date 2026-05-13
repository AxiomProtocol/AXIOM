# Axiom Protocol — Avalanche Fuji Deployment Checklist

**Network:** Avalanche Fuji Testnet (chainId 43113)  
**Updated:** 2026-05-13 (Phase 2 — 8-contract ERC-3643 real broadcast complete)  
**Deployer:** `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`  
**DeployedAt:** 2026-05-13T19:58:41.116Z

Use this checklist before promoting a Fuji deployment to Avalanche C-Chain mainnet.

---

## Pre-Deployment

- [x] `AVALANCHE_DEPLOYER_PRIVATE_KEY` is set (Fuji-only funded key, separate from `DEPLOYER_PRIVATE_KEY`)
- [x] `MULTICHAIN_ENABLED=true` is set in environment
- [x] `CHAIN_AVALANCHE_ENABLED=true` is set in environment
- [x] `AVALANCHE_RPC_URL` or `AVALANCHE_FUJI_RPC_URL` is set (public Fuji RPC used)
- [x] Deployer wallet has AVAX balance on Fuji — 2.0 AVAX confirmed at deploy time
- [x] `SNOWTRACE_API_KEY` is set for post-deploy verification
- [x] Compile cleanly: `npm run compile:avalanche` (12 Solidity files, solc 0.8.24, evm paris — cache hit)
- [x] Tests pass: `npm run test:avalanche` (14/14 ERC-3643 Mocha tests green)
- [x] Dry-run passes cleanly: `npm run deploy:avalanche:fuji` (8 simulated addresses printed)
- [x] Deployment manifest template reviewed: `deployments/avalanche/fuji-phase1.template.json`

---

## Deployment Execution

- [x] Run real deploy: `AVALANCHE_PHASE2_REAL_DEPLOY=true npm run deploy:avalanche:fuji`
- [x] No errors in deploy output
- [x] Manifest written to `deployments/avalanche/fuji-phase1.json`
- [x] Deployer address matches expected wallet (`0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`)
- [x] All 8 contract addresses are non-empty in manifest
- [x] All 12 post-deploy wiring steps confirmed in output

### 8-contract addresses confirmed (from fuji-phase1.json):
- [x] IdentityRegistryStorage — `0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215` (tx: 0x4f87226a…)
- [x] TrustedIssuersRegistry  — `0x0dF7D62f7Eda24798f6840D5B10E453de097D324` (tx: 0x5cee7b10…)
- [x] ClaimTopicsRegistry     — `0x207BE0EE444c82AC4252284a04e6D9101Dfa570c` (tx: 0xf23f2436…)
- [x] IdentityRegistry        — `0x75ed20d260292D869f9Ec4F035Db4B93072D7963` (tx: 0x12e87b33…)
- [x] ModularCompliance       — `0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66` (tx: 0x80cb549d…)
- [x] CountryAllowModule      — `0xe15Cf94D324cc8882015ed71C39F002e3709ec54` (tx: 0x855ecbcd…)
- [x] TransferLimitModule     — `0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc` (tx: 0x4992bbb3…)
- [x] AxiomStable3643Fuji     — `0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8` (tx: 0xd638edff…)

---

## Post-Deployment Wiring Verification

- [x] `IdentityRegistryStorage.init()` — confirmed in deploy output
- [x] `TrustedIssuersRegistry.init()` — confirmed in deploy output
- [x] `ClaimTopicsRegistry.init()` — confirmed in deploy output
- [x] `IdentityRegistry.init(TIR, CTR, IRS)` — confirmed in deploy output
- [x] `ModularCompliance.init()` — confirmed in deploy output
- [x] `IdentityRegistryStorage.bindIdentityRegistry(IR)` — confirmed in deploy output
- [x] `ModularCompliance.bindToken(AxiomStable3643Fuji)` — confirmed in deploy output
- [x] `ModularCompliance.addModule(CountryAllowModule)` — confirmed in deploy output
- [x] `ModularCompliance.addModule(TransferLimitModule)` — confirmed in deploy output
- [x] `CountryAllowModule.setAllowAll(MC, true)` — Fuji testnet default, confirmed
- [x] `IdentityRegistry.addAgent(deployer)` — confirmed in deploy output
- [x] `IdentityRegistry.registerIdentity(deployer)` — smoke-test seed, confirmed

---

## Post-Deployment Sourcify Verification

> Note: Hardhat 3 routes verification to Sourcify for chainId 43113 (Fuji). All 3 Axiom custom
> contracts are verified on Sourcify. T-REX official contracts (1–5) are pre-verified by
> @tokenysolutions upstream — no action needed.

```bash
# Verified via: cd hardhat-avalanche && npx hardhat verify --config hardhat.config.mts --network avalancheFuji <address> [args]
```

- [x] CountryAllowModule — verified: https://sourcify.dev/server/repo-ui/43113/0xe15Cf94D324cc8882015ed71C39F002e3709ec54
- [x] TransferLimitModule — verified: https://sourcify.dev/server/repo-ui/43113/0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc
- [x] AxiomStable3643Fuji — verified: https://sourcify.dev/server/repo-ui/43113/0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8
- [x] T-REX contracts (1–5) — pre-verified by @tokenysolutions upstream (no action needed)

---

## Update Registry

- [x] Update `shared/contracts-avalanche.ts` FUJI_CONTRACTS with deployed addresses (done automatically by deploy script)
- [x] Commit and push `deployments/avalanche/fuji-phase1.json` to main (dryRun: false, 2026-05-13)
- [x] Commit and push `shared/contracts-avalanche.ts` FUJI_CONTRACTS to main (2026-05-13)

---

## Smoke Tests

- [ ] `AxiomStable3643Fuji.mint(deployer, 1000e6)` succeeds (deployer is verified + has MINTER_ROLE)
- [ ] `AxiomStable3643Fuji.transfer(user, 100e6)` fails if user is not registered in IdentityRegistry
- [ ] Register user in IdentityRegistry, transfer succeeds
- [ ] `AxiomStable3643Fuji.pause()` blocks transfers, `unpause()` restores them
- [ ] `TransferLimitModule.setTransferLimit(compliance, limit)` enforced on transfer
- [ ] Capinfra `AVALANCHE` adapter DRY_RUN dispatch returns expected receipt
- [ ] Capinfra `AVALANCHE` adapter LIVE dispatch mints on Fuji (AXUSD allowlisted)

---

## Mainnet Promotion Gate

All of the following must be true before deploying to Avalanche mainnet (43114):

- [ ] All Fuji checklist items above are complete
- [ ] Security review of Phase 2 contracts is signed off
- [ ] Multi-party authorization wallet (Gnosis Safe on Avalanche) is funded
- [ ] Mainnet deployer key (separate from Fuji key) is prepared and secured
- [ ] Disclosure documents updated to include Avalanche C-Chain network
- [ ] `AVALANCHE_CONTRACTS` in `shared/contracts-avalanche.ts` populated post-deploy
