# Axiom Protocol — Avalanche Fuji Deployment Checklist

**Network:** Avalanche Fuji Testnet (chainId 43113)  
**Updated:** 2026-05-13 (Task #483 — Mainnet Readiness Gap Analysis complete; 1/12 gates satisfied; NO-GO)  
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

## Post-Deployment Snowtrace Verification

> Verification method: Sourcify via `npx hardhat verify --network avalancheFuji`.
> Routescan (testnet.snowtrace.io) indexes Sourcify automatically — all 8 contracts
> confirmed verified via `GET /v2/network/testnet/evm/43113/etherscan?module=contract&action=getabi`
> returning `status=1, message=OK` for every address.
>
> `hardhat-avalanche/hardhat.config.mts` updated with `etherscan.customChains` pointing to
> the Routescan API (`https://api.routescan.io/v2/network/testnet/evm/43113/etherscan`) for
> future direct Snowtrace submission using `SNOWTRACE_API_KEY`.

```bash
# Verified via: cd hardhat-avalanche && npx hardhat verify --config hardhat.config.mts --network avalancheFuji <address> [args]
# Routescan confirmation: curl "https://api.routescan.io/v2/network/testnet/evm/43113/etherscan?module=contract&action=getabi&address=<addr>"
```

- [x] IdentityRegistryStorage — Snowtrace: https://testnet.snowtrace.io/address/0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215#code
- [x] TrustedIssuersRegistry  — Snowtrace: https://testnet.snowtrace.io/address/0x0dF7D62f7Eda24798f6840D5B10E453de097D324#code
- [x] ClaimTopicsRegistry     — Snowtrace: https://testnet.snowtrace.io/address/0x207BE0EE444c82AC4252284a04e6D9101Dfa570c#code
- [x] IdentityRegistry        — Snowtrace: https://testnet.snowtrace.io/address/0x75ed20d260292D869f9Ec4F035Db4B93072D7963#code
- [x] ModularCompliance       — Snowtrace: https://testnet.snowtrace.io/address/0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66#code
- [x] CountryAllowModule      — Snowtrace: https://testnet.snowtrace.io/address/0xe15Cf94D324cc8882015ed71C39F002e3709ec54#code
- [x] TransferLimitModule     — Snowtrace: https://testnet.snowtrace.io/address/0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc#code
- [x] AxiomStable3643Fuji     — Snowtrace: https://testnet.snowtrace.io/address/0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8#code
- [x] Routescan API confirmed: `status=1 OK` for all 8 addresses (2026-05-13)

---

## Update Registry

- [x] Update `shared/contracts-avalanche.ts` FUJI_CONTRACTS with deployed addresses (done automatically by deploy script)
- [x] Commit and push `deployments/avalanche/fuji-phase1.json` to main (dryRun: false, 2026-05-13)
- [x] Commit and push `shared/contracts-avalanche.ts` FUJI_CONTRACTS to main (2026-05-13)
- [x] `hardhat-avalanche/hardhat.config.mts` updated with Routescan `etherscan.customChains` config

---

## Smoke Tests

> Task #480 live smoke run: **15 / 15 passed** — 2026-05-13T20:26:53.439Z  
> Script: `scripts/smoke/avalanche/fuji-smoke.mts`  
> Results: `deployments/avalanche/fuji-smoke-results.json`  
> Report: `documents/chains/AXIOM_AVALANCHE_FUJI_SMOKE_REPORT.md`

- [x] `AxiomStable3643Fuji.mint(deployer, 1000e6)` succeeds — [tx](https://testnet.snowtrace.io/tx/0xd4e1aaa17120116224f69055d56288c4d0408efed187852442e921e38f373c70)
- [x] `AxiomStable3643Fuji.transfer(user, 100e6)` fails if user not registered (T10 — reverted RECEIVER_NOT_VERIFIED)
- [x] Register user in IdentityRegistry, transfer succeeds — [tx](https://testnet.snowtrace.io/tx/0x359836e0be61441945c5228b60044882932bf817e6986c8ccc5263a998ad3038)
- [x] `AxiomStable3643Fuji.pause()` blocks transfers — [tx](https://testnet.snowtrace.io/tx/0x9c66c014e53b91be84daa54c41ec4545cf0da3c9f0a0eb5115534d1ef22eb827)
- [x] `unpause()` restores transfers — [tx](https://testnet.snowtrace.io/tx/0x729c0463cdde53b25b55633422ecfc57ab741ce47ab61bec11495dfcbaec659b)
- [x] `TransferLimitModule.setTransferLimit(compliance, 200e6)` enforced — over-limit(300) reverted, under-limit(150) passed
- [x] `freezeAddress(wallet, true)` blocks receiver — [tx](https://testnet.snowtrace.io/tx/0xe3e9ff3f763132c855c4c9e8fcb2a26719e56006bbece3ec844ee57f4293a646)
- [x] `freezeAddress(wallet, false)` restores transfers
- [x] Capinfra `AVALANCHE` adapter DRY_RUN dispatch returns expected receipt — Task #482, 19/19 checks, invariants A–G all PASS
- [x] Capinfra `AVALANCHE` adapter LIVE dispatch mints on Fuji — Task #482, 2026-05-13T23:29:56Z, 19/19 checks passed, txHash: 0x3ea938cd4e85531907b8834446a0bcf10173bfec0270705998522694e8e34a54, on-chain balanceOf confirmed, contract from shared/contracts-avalanche.ts

---

## Mainnet Promotion Gate

All of the following must be true before deploying to Avalanche mainnet (43114):

- [ ] All Fuji checklist items above are complete
- [ ] Security review of Phase 2 contracts is signed off
- [ ] Multi-party authorization wallet (Gnosis Safe on Avalanche) is funded
- [ ] Mainnet deployer key (separate from Fuji key) is prepared and secured
- [ ] Disclosure documents updated to include Avalanche C-Chain network
- [ ] `AVALANCHE_CONTRACTS` in `shared/contracts-avalanche.ts` populated post-deploy
