# AXIOM AVALANCHE PHASE 2 POST-DEPLOY VERIFICATION (FUJI ONLY)

**Status:** COMPLETE — real Fuji deploy executed 2026-05-13T19:58:41Z  
**Updated:** 2026-05-13 (reconciled with actual deploy and smoke test outcomes)  
**Canonical chain:** Arbitrum One remains canonical  
**Production behavior:** Avalanche remains disabled by default

---

## 1) Deployment outcome

The first real Fuji deployment was executed successfully on 2026-05-13 at
19:58:41 UTC. All 8 ERC-3643 contracts were deployed and wired. 15/15 smoke
tests passed. All 8 contracts verified on Routescan (Snowtrace).

**Deployer:** `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`  
**Deployer AVAX balance at deploy time:** 2.0 AVAX (Fuji testnet)  
**Key used:** `DEPLOYER_PRIVATE_KEY` (fallback; `AVALANCHE_DEPLOYER_PRIVATE_KEY` absent)  
**Toolchain:** Hardhat 3 ESM from `hardhat-avalanche/` subfolder

---

## 2) Deployed contracts

| Contract | Fuji address | Tx hash | Explorer |
|---|---|---|---|
| `IdentityRegistryStorage` | `0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215` | `0x4f87226a…` | [Snowtrace](https://testnet.snowtrace.io/address/0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215#code) |
| `TrustedIssuersRegistry`  | `0x0dF7D62f7Eda24798f6840D5B10E453de097D324` | `0x5cee7b10…` | [Snowtrace](https://testnet.snowtrace.io/address/0x0dF7D62f7Eda24798f6840D5B10E453de097D324#code) |
| `ClaimTopicsRegistry`     | `0x207BE0EE444c82AC4252284a04e6D9101Dfa570c` | `0xf23f2436…` | [Snowtrace](https://testnet.snowtrace.io/address/0x207BE0EE444c82AC4252284a04e6D9101Dfa570c#code) |
| `IdentityRegistry`        | `0x75ed20d260292D869f9Ec4F035Db4B93072D7963` | `0x12e87b33…` | [Snowtrace](https://testnet.snowtrace.io/address/0x75ed20d260292D869f9Ec4F035Db4B93072D7963#code) |
| `ModularCompliance`       | `0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66` | `0x80cb549d…` | [Snowtrace](https://testnet.snowtrace.io/address/0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66#code) |
| `CountryAllowModule`      | `0xe15Cf94D324cc8882015ed71C39F002e3709ec54` | `0x855ecbcd…` | [Snowtrace](https://testnet.snowtrace.io/address/0xe15Cf94D324cc8882015ed71C39F002e3709ec54#code) |
| `TransferLimitModule`     | `0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc` | `0x4992bbb3…` | [Snowtrace](https://testnet.snowtrace.io/address/0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc#code) |
| `AxiomStable3643Fuji`     | `0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8` | `0xd638edff…` | [Snowtrace](https://testnet.snowtrace.io/address/0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8#code) |

---

## 3) Post-deploy wiring confirmed

All 12 wiring steps executed and confirmed in deploy output:

| Step | Action | Result |
|---|---|---|
| 1 | `IdentityRegistryStorage.init()` | ✅ confirmed |
| 2 | `TrustedIssuersRegistry.init()` | ✅ confirmed |
| 3 | `ClaimTopicsRegistry.init()` | ✅ confirmed |
| 4 | `IdentityRegistry.init(TIR, CTR, IRS)` | ✅ confirmed |
| 5 | `ModularCompliance.init()` | ✅ confirmed |
| 6 | `IdentityRegistryStorage.bindIdentityRegistry(IR)` | ✅ confirmed |
| 7 | `ModularCompliance.bindToken(AxiomStable3643Fuji)` | ✅ confirmed |
| 8 | `ModularCompliance.addModule(CountryAllowModule)` | ✅ confirmed |
| 9 | `ModularCompliance.addModule(TransferLimitModule)` | ✅ confirmed |
| 10 | `CountryAllowModule.setAllowAll(MC, true)` | ✅ Fuji testnet default |
| 11 | `IdentityRegistry.addAgent(deployer)` | ✅ confirmed |
| 12 | `IdentityRegistry.registerIdentity(deployer, deployer, 0)` | ✅ smoke-test seed |

---

## 4) What was verified on Fuji

### Bytecode presence (live check — 2026-05-13)

All 8 contract addresses confirmed to have non-zero bytecode via
`eth_getCode` against the public Fuji RPC (`api.avax-test.network`):

```
Chain ID: 43113 ✅
✅ IdentityRegistryStorage  0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215
✅ TrustedIssuersRegistry   0x0dF7D62f7Eda24798f6840D5B10E453de097D324
✅ ClaimTopicsRegistry      0x207BE0EE444c82AC4252284a04e6D9101Dfa570c
✅ IdentityRegistry         0x75ed20d260292D869f9Ec4F035Db4B93072D7963
✅ ModularCompliance        0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66
✅ CountryAllowModule       0xe15Cf94D324cc8882015ed71C39F002e3709ec54
✅ TransferLimitModule      0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc
✅ AxiomStable3643Fuji      0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8
```

### Sourcify / Routescan verification

All 8 contracts verified via Sourcify (`npx hardhat verify --network avalancheFuji`
from `hardhat-avalanche/`). Routescan indexes Sourcify automatically. Confirmed
via Routescan API returning `status=1, message=OK` for every address.

### Smoke tests — 15 / 15 PASS (Task #480, 2026-05-13T20:26:53Z)

Script: `scripts/smoke/avalanche/fuji-smoke.mts`  
Results: `deployments/avalanche/fuji-smoke-results.json`

| Test | Result | Details |
|---|---|---|
| T01 — Token metadata | ✅ PASS | name="Axiom Stable USD" symbol="AXUSD" decimals=6 |
| T02 — Deployer roles (admin/minter/agent) | ✅ PASS | isAdmin=true isMinter=true isAgent=true |
| T03 — MC bound to AxiomStable3643Fuji | ✅ PASS | getTokenBound()=0x5Cd7c15C… |
| T04 — IR connected to TIR, CTR, IRS | ✅ PASS | all 3 registry addresses correct |
| T05 — CAM and TLM attached to MC | ✅ PASS | both modules listed in MC |
| T06 — Deployer verified in IR | ✅ PASS | isVerified=true isAgent=true |
| T07 — Mint 1,000 AXUSD to deployer | ✅ PASS | [tx](https://testnet.snowtrace.io/tx/0xd4e1aaa17120116224f69055d56288c4d0408efed187852442e921e38f373c70) |
| T08 — Register second test wallet | ✅ PASS | [tx](https://testnet.snowtrace.io/tx/0xb5d00a92cc6a31218ac530ccbe515b72454d94cf1fa8e73a08d665d4437ead43) |
| T09 — Transfer 100 AXUSD to registered wallet | ✅ PASS | [tx](https://testnet.snowtrace.io/tx/0x359836e0be61441945c5228b60044882932bf817e6986c8ccc5263a998ad3038) |
| T10 — Transfer to unregistered wallet reverts | ✅ PASS | RECEIVER_NOT_VERIFIED revert confirmed |
| T11 — TransferLimitModule enforcement | ✅ PASS | over-limit(300) reverted, under-limit(150) passed |
| T12 — Pause blocks all transfers | ✅ PASS | [tx](https://testnet.snowtrace.io/tx/0x9c66c014e53b91be84daa54c41ec4545cf0da3c9f0a0eb5115534d1ef22eb827) |
| T13 — Unpause restores transfers | ✅ PASS | [tx](https://testnet.snowtrace.io/tx/0x729c0463cdde53b25b55633422ecfc57ab741ce47ab61bec11495dfcbaec659b) |
| T14 — Freeze/unfreeze wallet | ✅ PASS | [tx](https://testnet.snowtrace.io/tx/0xe3e9ff3f763132c855c4c9e8fcb2a26719e56006bbece3ec844ee57f4293a646) |
| T15 — Final state read (supply and balances) | ✅ PASS | supply and balances consistent |

---

## 5) Permissioned issuance verification

The permissioned issuance pattern is **proven on Avalanche Fuji**:

- ERC-3643 IdentityRegistry enforces KYC at the transfer level.
- Unregistered wallets cannot receive transfers (T10 confirmed revert).
- Minting requires admin/minter role (T02 + T07 confirmed).
- Compliance modules (CountryAllow + TransferLimit) are enforced on every
  transfer (T05 + T11 confirmed).
- Pause/freeze capabilities are operational (T12–T14 confirmed).

---

## 6) Registry and manifest files updated

| File | Status |
|---|---|
| `shared/contracts-avalanche.ts` FUJI_CONTRACTS | ✅ Real addresses — updated by deploy script |
| `deployments/avalanche/fuji-phase1.json` | ✅ Real manifest — `dryRun: false`, deployer `0x8d7892…` |
| `deployments/avalanche/fuji-smoke-results.json` | ✅ 15/15 PASS, written by smoke script |
| `hardhat-avalanche/hardhat.config.mts` | ✅ Routescan etherscan config present |

---

## 7) What remains before runtime integration

Before any public Avalanche runtime integration, all of the following must be
satisfied. Status per current mainnet readiness gate analysis (Task #483):

| Gate | Status |
|---|---|
| Fuji deploy complete | ✅ Done |
| Smoke tests 15/15 | ✅ Done |
| Sourcify verification | ✅ Done |
| Phase 2 docs reconciled | ✅ Done (this document) |
| Capinfra AVALANCHE adapter DRY_RUN smoke | Pending |
| Capinfra AVALANCHE adapter LIVE smoke | Pending |
| Security review of Phase 2 contracts | Pending |
| Gnosis Safe on Avalanche funded | Pending |
| Dedicated mainnet deployer key prepared | Pending |
| `AVALANCHE_CONTRACTS` (mainnet) populated | Pending — after mainnet deploy |
| Disclosure docs updated for Avalanche C-Chain | Pending |
| Chain allocation blueprint promoted (Fuji → mainnet) | Pending |

Overall mainnet promotion status: **NO-GO** (1/12 gates satisfied per Task #483).

---

## 8) Safety result

No production routes, public runtime surfaces, Arbitrum paths, banking/payment
surfaces, Polygon code, or Sui code were changed. Avalanche remains
feature-flagged and disabled by default in the runtime
(`MULTICHAIN_ENABLED` + `CHAIN_AVALANCHE_ENABLED` both required). The capinfra
AVALANCHE adapter defaults to `DRY_RUN` mode.
