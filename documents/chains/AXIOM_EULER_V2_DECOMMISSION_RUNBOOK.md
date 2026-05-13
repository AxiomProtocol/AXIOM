# Axiom Protocol — Euler V2 Decommission Runbook

**Document type:** Operational runbook  
**Version:** 1.0.0  
**Created:** 2026-05-13  
**Classification:** Internal — Operations + Technical Lead  
**Status:** WITHDRAWALS COMPLETE — both vaults empty as of 2026-05-13  

> **Trigger:** Euler V2 is no longer in active use. Two Euler vaults held Axiom funds seeded by the Deployer EOA. Withdrawals were executed on 2026-05-13 and confirmed on-chain. Code-layer decommissioning (Step 3 checklist below) is still pending.

---

## 1. Current Fund State (as of 2026-05-13)

Queried live on Arbitrum One (chain ID 42161):

| Contract | Address | Asset | Balance (pre) | Balance (post) | Status |
|---|---|---|---|---|---|
| EVK Open Market Vault (eAXUSD-6) | `0xacdA87801f6409bB5157BA78aF1BD9631d6609B2` | AXUSD | 10,048.55 | **0** | ✅ WITHDRAWN — tx `0x435a1275` |
| AXM EVK Vault (eAXM-1) | `0x8e28ffa89d168599156004db4f4d12c2af7c250e` | AXM | 10,039.94 | **0** | ✅ WITHDRAWN — tx `0x51a0607a` |
| Euler Earn Vault (earnAXUSD) | `0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B` | AXUSD | 0 | 0 | ✅ Already empty |
| AxiomFeeBurner | `0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94` | AXUSD | 0 | 0 | ✅ Already empty |
| EulerSwap AXUSD/USDC Pool | `0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8` | AXUSD + USDC | 0 / 0 | 0 / 0 | ✅ Already empty |
| EVC | `0x6302ef0F34100CDDFb5489fbcB6eE1AA95CD1066` | AXUSD | 0 | 0 | ✅ Already empty |

### Executed Transactions

| # | Contract | TX Hash | Block | Status |
|---|---|---|---|---|
| 1 | EVK Open Market Vault | [`0x435a12755feb4c71e21091ef8f77d04fb4b460efd8b7bb3b626e7c6aafeb4eff`](https://arbiscan.io/tx/0x435a12755feb4c71e21091ef8f77d04fb4b460efd8b7bb3b626e7c6aafeb4eff) | 462526199 | ✅ SUCCESS |
| 2 | AXM EVK Vault | [`0x51a0607af1a1d5b2c6e572a7bcc9ab5772352536a6fea8cb16a29eb786626c84`](https://arbiscan.io/tx/0x51a0607af1a1d5b2c6e572a7bcc9ab5772352536a6fea8cb16a29eb786626c84) | 462526218 | ✅ SUCCESS |

**Post-withdrawal Deployer wallet balances (confirmed on-chain):**
- AXUSD: 10,074.05
- AXM: 79,996,482.94
- EVK shares remaining: 0 ✅
- AXM vault shares remaining: 0 ✅

**Share amounts held by Deployer EOA (exact wei values):**

| Vault | Shares (wei) |
|---|---|
| EVK Open Market Vault | `10048551400000000000000` |
| AXM EVK Vault | `10039940000000000000000` |

---

## 2. Withdrawal Calls

Both vaults implement ERC-4626. The Deployer EOA must call `redeem(shares, receiver, owner)` on each vault to return assets to the Treasury Hub.

**Key addresses:**

| Role | Address |
|---|---|
| Deployer EOA (signer) | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` |
| Treasury Hub (receiver) | `0x3fD63728288546AC41dAe3bf25ca383061c3A929` |

---

### Step 1 — Withdraw AXUSD from EVK Open Market Vault

**Contract:** EVK Open Market Vault  
**Address:** `0xacdA87801f6409bB5157BA78aF1BD9631d6609B2`  
**Function:** `redeem(uint256 shares, address receiver, address owner)`  
**Signer:** Deployer EOA

```
redeem(
  10048551400000000000000,                      // shares (exact balance as of 2026-05-13)
  0x3fD63728288546AC41dAe3bf25ca383061c3A929,   // receiver = Treasury Hub
  0x8d7892CF226B43d48B6e3ce988A1274e6D114C96    // owner = Deployer EOA
)
```

**Expected result:** ~10,048 AXUSD transferred to Treasury Hub. EVK vault `totalAssets()` → 0.

**Arbiscan verification:**  
After broadcast, confirm on: https://arbiscan.io/address/0xacdA87801f6409bB5157BA78aF1BD9631d6609B2

---

### Step 2 — Withdraw AXM from AXM EVK Vault

**Contract:** AXM EVK Vault  
**Address:** `0x8e28ffa89d168599156004db4f4d12c2af7c250e`  
**Function:** `redeem(uint256 shares, address receiver, address owner)`  
**Signer:** Deployer EOA

```
redeem(
  10039940000000000000000,                      // shares (exact balance as of 2026-05-13)
  0x3fD63728288546AC41dAe3bf25ca383061c3A929,   // receiver = Treasury Hub
  0x8d7892CF226B43d48B6e3ce988A1274e6D114C96    // owner = Deployer EOA
)
```

**Expected result:** ~10,039 AXM transferred to Treasury Hub. AXM EVK vault `totalAssets()` → 0.

**Arbiscan verification:**  
After broadcast, confirm on: https://arbiscan.io/address/0x8e28ffa89d168599156004db4f4d12c2af7c250e

---

### Step 3 — Verify Both Vaults Are Empty

After both transactions confirm, run the following verification against Arbitrum One:

```javascript
// Verify EVK Open Market Vault
const evkVault = new ethers.Contract('0xacdA87801f6409bB5157BA78aF1BD9631d6609B2', TOTAL_ASSETS_ABI, provider);
const evkAssets = await evkVault.totalAssets(); // must be 0

// Verify AXM EVK Vault
const axmVault = new ethers.Contract('0x8e28ffa89d168599156004db4f4d12c2af7c250e', TOTAL_ASSETS_ABI, provider);
const axmAssets = await axmVault.totalAssets(); // must be 0

// Verify Treasury Hub received AXUSD
const axusd = new ethers.Contract('0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7', BALANCE_ABI, provider);
const treasuryAxusd = await axusd.balanceOf('0x3fD63728288546AC41dAe3bf25ca383061c3A929');

// Verify Treasury Hub received AXM
const axm = new ethers.Contract('0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D', BALANCE_ABI, provider);
const treasuryAxm = await axm.balanceOf('0x3fD63728288546AC41dAe3bf25ca383061c3A929');
```

**Pass criteria:**
- `evkAssets` = 0
- `axmAssets` = 0
- `treasuryAxusd` ≥ 10,048 AXUSD (in 18-decimal units)
- `treasuryAxm` ≥ 10,039 AXM (in 18-decimal units)

---

## 3. Post-Withdrawal Decommission Checklist

After both withdrawals are confirmed on-chain, complete the following:

| Step | Action | Owner |
|---|---|---|
| ✅ → Update `shared/contracts.ts` | Move all 14 Euler V2 contract entries from Section A to Section C (Deprecated) | Technical Lead |
| ✅ → Update `src/config/activeContracts.generated.ts` | Set `isEulerEarnDeployed()` → `false`; remove EVK/EulerSwap from active flags | Technical Lead |
| ✅ → Archive Euler API routes | Move `pages/api/euler/` routes behind a `EULER_DEPRECATED=true` guard or delete | Technical Lead |
| ✅ → Update Sentinel | Remove `euler-earn-rebalance` from sentinel decision types | Technical Lead |
| ✅ → Update solvency ingest | Remove Euler EVK balance from `fetchReservePositions.ts` AXUSD scope | Technical Lead |
| ✅ → Update reserve snapshot | Remove any Euler vault balance contributions from canonical reserve snapshot | Technical Lead |
| ✅ → Update `.local/smart-contract-audit.md` | Move Euler V2 stack from Tier 1 to Tier 3 (Deprecated) | Technical Lead |
| ✅ → Record in audit trail | Log withdrawal transactions in `shared/contracts.ts` Section C comment | Technical Lead |

---

## 4. Note on LendingPlatformModule

The ERC-3643 `LendingPlatformModule` (`0xC0177120Fb5922813031a5857f4dF7F01750Bb6F`) was originally deployed to whitelist Euler vault addresses for ERC-3643 compliant AXUSD transfers. With Euler V2 decommissioned:

- The module itself may remain deployed — it is a compliance module, not an Euler-specific contract
- The Euler vault addresses whitelisted in it should be reviewed and removed if they would not otherwise be trusted counterparties
- Compliance counsel should confirm whether to retain or remove the whitelist entries

---

## 5. What Remains After Decommission

| System | Status After Decommission |
|---|---|
| AXUSD GENIUS Act stack (PSM, backstop, oracle, compliance) | ✅ Fully active — no Euler dependency |
| Camelot AXUSD/USDC LP pool | ✅ Active — independent of Euler |
| Real estate lending (FixFlip, DSCR) | ✅ Active — independent of Euler |
| Land acquisition, Wealth Practice, DePIN | ✅ Active — independent of Euler |
| GovernanceHub | ✅ Active — independent of Euler |
| Euler API routes (`/api/euler/*`) | ⚠️ To be archived/removed |
| EulerSwap DEX routes (`/api/dex/*`) | ⚠️ To be reviewed — EulerSwap pools are empty; routes may return stale data |
| `sentinel/euler-earn-rebalance.ts` | ⚠️ To be disabled |

---

## 6. Authorization

This runbook must be executed by the Deployer EOA key holder. The withdrawal transactions should be broadcast via:
- Hardhat console: `npx hardhat console --network arbitrumOne`
- Arbiscan write interface (requires MetaMask with Deployer EOA)
- Safe transaction builder (if Deployer EOA is transitioned to Safe before execution)

**Do not execute until this document has been reviewed by the Operations Lead.**

---

*Runbook prepared by Axiom Protocol architecture agent, 2026-05-13.*
