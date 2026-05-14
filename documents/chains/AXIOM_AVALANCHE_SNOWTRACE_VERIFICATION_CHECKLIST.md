# Axiom Protocol — Snowtrace Verification Checklist

**Document type:** Post-Deploy Verification — Phase F  
**Network:** Avalanche C-Chain Mainnet (chainId 43114)  
**Created:** 2026-05-14  
**Verification endpoint:** https://routescan.io (Snowtrace)  
**API:** https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan  

---

## Status Key

| Symbol | Meaning |
|---|---|
| ✓ VERIFIED | Source submitted and confirmed matching deployed bytecode |
| ⏳ PENDING | Not yet submitted |
| ✗ FAILED | Submission rejected or bytecode mismatch |

**Current status: All 8 contracts PENDING — source code not yet submitted.**  
Do not mark verified until confirmed on Snowtrace.

---

## Contract Verification Details

---

### 1. IdentityRegistryStorage

| Field | Value |
|---|---|
| **Address** | `0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215` |
| **Contract name** | `IdentityRegistryStorage` |
| **Source path** | `contracts/avalanche/IdentityRegistryStorage.sol` |
| **Compiler** | Solidity (check `hardhat-avalanche/hardhat.config.mts` for version) |
| **Optimizer** | Per hardhat config (likely 200 runs) |
| **Constructor args** | None (initialized via `init()` post-deploy) |
| **Snowtrace link** | https://snowtrace.io/address/0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215 |
| **Status** | ⏳ PENDING |

---

### 2. TrustedIssuersRegistry

| Field | Value |
|---|---|
| **Address** | `0x0dF7D62f7Eda24798f6840D5B10E453de097D324` |
| **Contract name** | `TrustedIssuersRegistry` |
| **Source path** | `contracts/avalanche/TrustedIssuersRegistry.sol` |
| **Compiler** | Solidity (check hardhat config) |
| **Optimizer** | Per hardhat config |
| **Constructor args** | None |
| **Snowtrace link** | https://snowtrace.io/address/0x0dF7D62f7Eda24798f6840D5B10E453de097D324 |
| **Status** | ⏳ PENDING |

---

### 3. ClaimTopicsRegistry

| Field | Value |
|---|---|
| **Address** | `0x207BE0EE444c82AC4252284a04e6D9101Dfa570c` |
| **Contract name** | `ClaimTopicsRegistry` |
| **Source path** | `contracts/avalanche/ClaimTopicsRegistry.sol` |
| **Compiler** | Solidity (check hardhat config) |
| **Optimizer** | Per hardhat config |
| **Constructor args** | None |
| **Snowtrace link** | https://snowtrace.io/address/0x207BE0EE444c82AC4252284a04e6D9101Dfa570c |
| **Status** | ⏳ PENDING |

---

### 4. IdentityRegistry

| Field | Value |
|---|---|
| **Address** | `0x75ed20d260292D869f9Ec4F035Db4B93072D7963` |
| **Contract name** | `IdentityRegistry` |
| **Source path** | `contracts/avalanche/IdentityRegistry.sol` |
| **Compiler** | Solidity (check hardhat config) |
| **Optimizer** | Per hardhat config |
| **Constructor args** | None (initialized via `init(TIR, CTR, IRS)` post-deploy) |
| **Snowtrace link** | https://snowtrace.io/address/0x75ed20d260292D869f9Ec4F035Db4B93072D7963 |
| **Status** | ⏳ PENDING |

---

### 5. ModularCompliance

| Field | Value |
|---|---|
| **Address** | `0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66` |
| **Contract name** | `ModularCompliance` |
| **Source path** | `contracts/avalanche/ModularCompliance.sol` |
| **Compiler** | Solidity (check hardhat config) |
| **Optimizer** | Per hardhat config |
| **Constructor args** | None |
| **Snowtrace link** | https://snowtrace.io/address/0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66 |
| **Status** | ⏳ PENDING |

---

### 6. CountryAllowModule

| Field | Value |
|---|---|
| **Address** | `0xe15Cf94D324cc8882015ed71C39F002e3709ec54` |
| **Contract name** | `CountryAllowModule` |
| **Source path** | `contracts/avalanche/CountryAllowModule.sol` |
| **Compiler** | Solidity (check hardhat config) |
| **Optimizer** | Per hardhat config |
| **Constructor args** | None |
| **Snowtrace link** | https://snowtrace.io/address/0xe15Cf94D324cc8882015ed71C39F002e3709ec54 |
| **Status** | ⏳ PENDING |

---

### 7. TransferLimitModule

| Field | Value |
|---|---|
| **Address** | `0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc` |
| **Contract name** | `TransferLimitModule` |
| **Source path** | `contracts/avalanche/TransferLimitModule.sol` |
| **Compiler** | Solidity (check hardhat config) |
| **Optimizer** | Per hardhat config |
| **Constructor args** | None |
| **Snowtrace link** | https://snowtrace.io/address/0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc |
| **Status** | ⏳ PENDING |

---

### 8. AxiomStable3643

| Field | Value |
|---|---|
| **Address** | `0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8` |
| **Contract name** | `AxiomStable3643` |
| **Source path** | `contracts/avalanche/AxiomStable3643.sol` |
| **Compiler** | Solidity (check hardhat config) |
| **Optimizer** | Per hardhat config |
| **Constructor args** | Likely includes: name (`Axiom Stable USD`), symbol (`AXUSD`) — extract from deploy script |
| **Snowtrace link** | https://snowtrace.io/address/0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8 |
| **Status** | ⏳ PENDING |
| **Note** | This contract has DIFFERENT bytecode from Fuji. Extra care required: ensure mainnet artifact (not Fuji artifact) is submitted. |

---

## Verification Command (Hardhat Routescan)

The hardhat config includes Routescan verification support. Run from workspace root:

```bash
# Verify individual contract
cd hardhat-avalanche && npx hardhat verify \
  --config hardhat.config.mts \
  --network avalanche \
  <CONTRACT_ADDRESS> \
  [CONSTRUCTOR_ARGS...]
```

For contracts with no constructor args (initialized via `init()`):
```bash
npx hardhat verify --config hardhat.config.mts --network avalanche 0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215
```

For AxiomStable3643 (constructor args required — verify against deploy script):
```bash
npx hardhat verify --config hardhat.config.mts --network avalanche \
  0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8 \
  "Axiom Stable USD" "AXUSD" [additional args per contract constructor]
```

Requires `SNOWTRACE_API_KEY` environment variable (Routescan API key).

---

## Post-Verification Update

When a contract is verified, update its row in this document:
- Change status to `✓ VERIFIED`
- Add verification date
- Add Snowtrace verified contract link

---

**PHASE F STATUS: 0/8 verified — all PENDING. Verification must be completed within 7 days of launch per post-launch checklist.**
