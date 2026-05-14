# Axiom Protocol — Avalanche Mainnet Bytecode Verification

**Document type:** Post-Deploy Verification — Phase B  
**Network:** Avalanche C-Chain Mainnet (chainId 43114)  
**Verified:** 2026-05-14  
**Verified by:** Automated on-chain RPC verification (verify-mainnet-onchain.ts)  
**Mainnet block at verification:** 85378057  
**Deploy block:** 85375788  
**Blocks elapsed since deploy:** 2,269  

---

## Method

For each of the 8 deployed contract addresses, `eth_getCode` was called against:
1. Avalanche C-Chain mainnet RPC (`https://api.avax.network/ext/bc/C/rpc`, chainId 43114)
2. Avalanche Fuji testnet RPC (chainId 43113)

Results confirm whether bytecode is present on mainnet, whether Fuji has bytecode at the same address, and whether the bytecodes match (cross-chain identity check).

---

## Results

| Contract | Address | Mainnet Bytecode | Fuji Bytecode | Bytes | keccak256 (prefix) | Cross-Chain |
|---|---|---|---|---|---|---|
| IdentityRegistryStorage | `0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215` | ✓ PRESENT | ✓ PRESENT | 4,534 | `0x81352e7d051ee65c…` | IDENTICAL |
| TrustedIssuersRegistry | `0x0dF7D62f7Eda24798f6840D5B10E453de097D324` | ✓ PRESENT | ✓ PRESENT | 5,201 | `0x5fdd4eb414ef8cfd…` | IDENTICAL |
| ClaimTopicsRegistry | `0x207BE0EE444c82AC4252284a04e6D9101Dfa570c` | ✓ PRESENT | ✓ PRESENT | 1,987 | `0x6b4d23cc82e57822…` | IDENTICAL |
| IdentityRegistry | `0x75ed20d260292D869f9Ec4F035Db4B93072D7963` | ✓ PRESENT | ✓ PRESENT | 6,910 | `0x19a0095ee9a59f6a…` | IDENTICAL |
| ModularCompliance | `0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66` | ✓ PRESENT | ✓ PRESENT | 5,619 | `0xd46dffb6915bcf30…` | IDENTICAL |
| CountryAllowModule | `0xe15Cf94D324cc8882015ed71C39F002e3709ec54` | ✓ PRESENT | ✓ PRESENT | 3,358 | `0x196fba8d8251751a…` | IDENTICAL |
| TransferLimitModule | `0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc` | ✓ PRESENT | ✓ PRESENT | 2,770 | `0x98825652c8c04ecf…` | IDENTICAL |
| AxiomStable3643 | `0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8` | ✓ PRESENT | ✓ PRESENT | 7,763 | `0xcfc647819f3aab9a…` | **DIFFERENT** |

**All 8 of 8 contracts confirmed present on Avalanche mainnet (chainId 43114).**

---

## Address Identity Analysis (Red Flag Resolution)

The reported concern was that mainnet contract addresses are identical to Fuji addresses. This has been investigated and resolved.

### Explanation: EVM CREATE address determinism

EVM contract addresses are derived exclusively from:
```
address = keccak256(rlp(deployer_address, nonce))[12:]
```

Bytecode is not a factor. Two separate deployments by the same EOA with the same nonce on two different chains will produce the **identical address** regardless of bytecode content.

### Evidence supporting separate mainnet deployment

1. **AxiomStable3643 bytecode differs** between mainnet and Fuji (hash `0xcfc647819f3aab9a…` vs Fuji hash). This is the critical proof — if mainnet were reading the wrong chain or re-using Fuji state, the bytecodes would be identical. Different bytecode = independently compiled and deployed contract.

2. **Seven infrastructure contracts have identical bytecode** on both chains. This is expected: they are the same T-REX / Axiom source compiled identically, deployed independently. Same source + same nonce = same address and same bytecode.

3. **Nonce sequence at deploy time was identical** on both chains. The deployer EOA (`0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`) began at the same nonce on both chains when the Phase 1 deployments were executed. Post-deploy, Fuji nonce is now 43 (additional test activity) vs mainnet nonce 20.

### Conclusion

**The identical addresses are legitimate.** The deployment is confirmed real and independent on Avalanche C-Chain mainnet. The AxiomStable3643 bytecode difference is the primary forensic evidence.

---

## Chain Validation

| Check | Expected | Observed | Pass |
|---|---|---|---|
| Mainnet RPC chainId | 43114 | 43114 | ✓ |
| Fuji RPC chainId | 43113 | 43113 | ✓ |
| Current block > deploy block | > 85375788 | 85378057 | ✓ |
| Deploy block is valid mainnet block | post-genesis | 85375788 | ✓ |
| All 8 addresses have mainnet bytecode | true | true (8/8) | ✓ |
| AxiomStable3643 mainnet ≠ Fuji bytecode | different | different | ✓ CONFIRMS SEPARATE DEPLOY |

---

## Snowtrace Links (to be verified manually)

| Contract | Snowtrace |
|---|---|
| IdentityRegistryStorage | https://snowtrace.io/address/0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215 |
| TrustedIssuersRegistry | https://snowtrace.io/address/0x0dF7D62f7Eda24798f6840D5B10E453de097D324 |
| ClaimTopicsRegistry | https://snowtrace.io/address/0x207BE0EE444c82AC4252284a04e6D9101Dfa570c |
| IdentityRegistry | https://snowtrace.io/address/0x75ed20d260292D869f9Ec4F035Db4B93072D7963 |
| ModularCompliance | https://snowtrace.io/address/0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66 |
| CountryAllowModule | https://snowtrace.io/address/0xe15Cf94D324cc8882015ed71C39F002e3709ec54 |
| TransferLimitModule | https://snowtrace.io/address/0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc |
| AxiomStable3643 | https://snowtrace.io/address/0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8 |

Source code verification on Snowtrace remains pending (manual step — see `AXIOM_AVALANCHE_SNOWTRACE_VERIFICATION_CHECKLIST.md`).

---

**PHASE B VERDICT: PASS — All 8 contracts confirmed live on Avalanche mainnet. Identical-address concern resolved as legitimate nonce-determinism.**
