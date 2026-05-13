# Axiom Protocol — Avalanche Fuji Live Smoke Test Report

**Task:** #480 — Avalanche Fuji Live Smoke Tests  
**Network:** avalancheFuji (chainId 43113)  
**Deployer:** `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`  
**Started:** 2026-05-13T20:26:13.179Z  
**Completed:** 2026-05-13T20:26:53.439Z  
**Result:** 15/15 tests passed — 0 failed — 0 skipped

---

## Contract Registry

| Contract | Address | Explorer |
|---|---|---|
| IdentityRegistryStorage | `0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215` | [Snowtrace](https://testnet.snowtrace.io/address/0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215) |
| TrustedIssuersRegistry | `0x0dF7D62f7Eda24798f6840D5B10E453de097D324` | [Snowtrace](https://testnet.snowtrace.io/address/0x0dF7D62f7Eda24798f6840D5B10E453de097D324) |
| ClaimTopicsRegistry | `0x207BE0EE444c82AC4252284a04e6D9101Dfa570c` | [Snowtrace](https://testnet.snowtrace.io/address/0x207BE0EE444c82AC4252284a04e6D9101Dfa570c) |
| IdentityRegistry | `0x75ed20d260292D869f9Ec4F035Db4B93072D7963` | [Snowtrace](https://testnet.snowtrace.io/address/0x75ed20d260292D869f9Ec4F035Db4B93072D7963) |
| ModularCompliance | `0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66` | [Snowtrace](https://testnet.snowtrace.io/address/0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66) |
| CountryAllowModule | `0xe15Cf94D324cc8882015ed71C39F002e3709ec54` | [Snowtrace](https://testnet.snowtrace.io/address/0xe15Cf94D324cc8882015ed71C39F002e3709ec54) |
| TransferLimitModule | `0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc` | [Snowtrace](https://testnet.snowtrace.io/address/0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc) |
| AxiomStable3643Fuji | `0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8` | [Snowtrace](https://testnet.snowtrace.io/address/0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8) |

---

## Test Results

| ID | Status | Name | Detail | Tx |
|---|---|---|---|---|
| T01 | ✅ PASS | Token metadata (name/symbol/decimals/supply/paused) | name="Axiom Stable USD" symbol="AXUSD" decimals=6 supply=0.0 paused=false | — |
| T02 | ✅ PASS | Deployer admin/minter/agent roles | isAdmin=true isMinter=true isAgent=true | — |
| T03 | ✅ PASS | ModularCompliance bound to AxiomStable3643Fuji | getTokenBound()=0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8 | — |
| T04 | ✅ PASS | IdentityRegistry connected to TIR, CTR, IRS | TIR=0x0df7d62f… CTR=0x207be0ee… IRS=0xb66e7ed8… | — |
| T05 | ✅ PASS | CountryAllowModule and TransferLimitModule attached to MC | modules=[0xe15Cf94D…, 0x8D550a2f…] CAM=true TLM=true | — |
| T06 | ✅ PASS | Deployer verified + agent in IdentityRegistry | isVerified=true isAgent=true | — |
| T07 | ✅ PASS | Mint 1 000 AXUSD to deployer | balance after mint: 1000.0 AXUSD | [tx](https://testnet.snowtrace.io/tx/0xd4e1aaa17120116224f69055d56288c4d0408efed187852442e921e38f373c70) |
| T08 | ✅ PASS | Register second test wallet in IdentityRegistry | registered 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 | [tx](https://testnet.snowtrace.io/tx/0xb5d00a92cc6a31218ac530ccbe515b72454d94cf1fa8e73a08d665d4437ead43) |
| T09 | ✅ PASS | Transfer 100 AXUSD to registered test wallet | test wallet balance: 100.0 AXUSD | [tx](https://testnet.snowtrace.io/tx/0x359836e0be61441945c5228b60044882932bf817e6986c8ccc5263a998ad3038) |
| T10 | ✅ PASS | Transfer to unregistered wallet reverts | correctly reverted (RECEIVER_NOT_VERIFIED or compliance failure) | — |
| T11 | ✅ PASS | TransferLimitModule: over-limit reverts, under-limit passes | limit=200 AXUSD — over(300) reverted=true, under(150) tx=0xa61f737a4d… | [tx](https://testnet.snowtrace.io/tx/0xa61f737a4da48924323930ccea8f5e053a2ae4bd1e2f11e5c61a069ab27e88f5) |
| T12 | ✅ PASS | Pause blocks all transfers | paused=true transferReverted=true | [tx](https://testnet.snowtrace.io/tx/0x9c66c014e53b91be84daa54c41ec4545cf0da3c9f0a0eb5115534d1ef22eb827) |
| T13 | ✅ PASS | Unpause restores transfers | paused after unpause=false | [tx](https://testnet.snowtrace.io/tx/0x729c0463cdde53b25b55633422ecfc57ab741ce47ab61bec11495dfcbaec659b) |
| T14 | ✅ PASS | Freeze blocks receiver; unfreeze restores transfers | frozenDuring=true transferReverted=true frozenAfter=false resumeOk=true | [tx](https://testnet.snowtrace.io/tx/0xe3e9ff3f763132c855c4c9e8fcb2a26719e56006bbece3ec844ee57f4293a646) |
| T15 | ✅ PASS | Final state read — supply and balances | totalSupply=1000.0 deployer=744.0 testWallet=256.0 paused=false | — |

---

## Notes

- **CountryAllowModule.setAllowAll(true)** is a **Fuji testnet-only** configuration.  
  It bypasses country restrictions for testing. Must NOT be used on mainnet.
- The second test wallet (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`) uses  
  Hardhat account #0 as a deterministic recipient for transfer tests.  
  No private key security is implied — this is a zero-value testnet address.
- **TransferLimitModule** limit is reset to 0 (unlimited) after T11 to avoid  
  interference with subsequent tests.
- The smoke identity seed (`registerIdentity(deployer, deployer, 0)`) from the  
  Phase 2 deploy script is the baseline for T06 and T07.
- All transaction hashes are live on Fuji Snowtrace:  
  `https://testnet.snowtrace.io/tx/<hash>`

---

## Mainnet Promotion Notes

Before deploying to Avalanche C-Chain mainnet:

- Replace `setAllowAll(true)` with an explicit country allowlist
- Use a Gnosis Safe multi-sig as DEFAULT_ADMIN_ROLE, AGENT_ROLE, MINTER_ROLE
- Set a meaningful TransferLimitModule limit appropriate to expected trade sizes
- Remove or replace the deployer seed identity before production use
- Conduct a full external security audit of the ERC-3643 compliance stack
