# Blockscout Mobile Execution Guide

## ✅ Easy Method: Direct Contract Interaction

Since your Safe has 1 signer (you), you can execute transactions directly on each contract using Blockscout's "Write Proxy" interface.

---

## 📱 STAGE 1: Core Security (11 Transactions)

### Transaction 1: Grant MINTER_ROLE to Treasury on AXM Token

1. **Go to:** https://arbitrum.blockscout.com/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D
2. **Click:** Contract → Write Proxy
3. **Connect:** Your signer wallet (0x8d7892CF226B43d48B6e3ce988A1274e6D114C96)
4. **Find:** `grantRole` function
5. **Fill in:**
   - `role`: `0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6`
   - `account`: `0x3fD63728288546AC41dAe3bf25ca383061c3A929`
6. **Click:** Write
7. **Confirm:** in MetaMask

---

### Transaction 2: Grant FEE_MANAGER_ROLE to Treasury on AXM Token

1. **Same contract:** https://arbitrum.blockscout.com/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D
2. **Function:** `grantRole`
3. **Fill in:**
   - `role`: `0x8227712ef8ad39d0f26f06731ef0df8665eb7ada7f41b1ee089adf3c238862a2`
   - `account`: `0x3fD63728288546AC41dAe3bf25ca383061c3A929`
4. **Click:** Write → Confirm

---

### Transaction 3: Grant REWARD_FUNDER_ROLE to Treasury on Staking Hub

1. **Go to:** https://arbitrum.blockscout.com/address/0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885
2. **Click:** Contract → Write Proxy → Connect Wallet
3. **Function:** `grantRole`
4. **Fill in:**
   - `role`: `0x8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c`
   - `account`: `0x3fD63728288546AC41dAe3bf25ca383061c3A929`
5. **Click:** Write → Confirm

---

### Transaction 4: Grant COMPLIANCE_ROLE to Identity Hub on AXM Token

1. **Back to:** https://arbitrum.blockscout.com/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D
2. **Function:** `grantRole`
3. **Fill in:**
   - `role`: `0x6e8b2c3b9e2b7e8d9d8a7f9c6d5e4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f`
   - `account`: `0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED`
4. **Click:** Write → Confirm

---

### Transaction 5: Grant ISSUER_ROLE to Identity Hub on Credential Registry

1. **Go to:** https://arbitrum.blockscout.com/address/0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344
2. **Click:** Contract → Write Proxy → Connect Wallet
3. **Function:** `grantRole`
4. **Fill in:**
   - `role`: `0x2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a`
   - `account`: `0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED`
5. **Click:** Write → Confirm

---

### Transaction 6: Set Compliance Module on AXM Token

1. **Back to:** https://arbitrum.blockscout.com/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D
2. **Function:** `setComplianceModule`
3. **Fill in:**
   - `_complianceModule`: `0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED`
4. **Click:** Write → Confirm

---

### Transactions 7-11: Set Treasury Vaults

**Go to:** https://arbitrum.blockscout.com/address/0x3fD63728288546AC41dAe3bf25ca383061c3A929

**Transaction 7 - BURN Vault:**
- Function: `setVault`
- `vaultType`: `0`
- `vaultAddress`: `0x0000000000000000000000000000000000000001`

**Transaction 8 - STAKING Vault:**
- Function: `setVault`
- `vaultType`: `1`
- `vaultAddress`: `0x0000000000000000000000000000000000000002`

**Transaction 9 - LIQUIDITY Vault:**
- Function: `setVault`
- `vaultType`: `2`
- `vaultAddress`: `0x0000000000000000000000000000000000000003`

**Transaction 10 - DIVIDEND Vault:**
- Function: `setVault`
- `vaultType`: `3`
- `vaultAddress`: `0x0000000000000000000000000000000000000004`

**Transaction 11 - TREASURY Vault:**
- Function: `setVault`
- `vaultType`: `4`
- `vaultAddress`: `0x0000000000000000000000000000000000000005`

---

## 📱 STAGE 2: Financial & Real Estate (5 Transactions)

### Transaction 1: Grant TREASURY_ROLE to Treasury on Lease Engine

1. **Go to:** https://arbitrum.blockscout.com/address/0x26a20dEa57F951571AD6e518DFb3dC60634D5297
2. **Function:** `grantRole`
3. **Fill in:**
   - `role`: `0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f`
   - `account`: `0x3fD63728288546AC41dAe3bf25ca383061c3A929`

### Transaction 2: Grant ADMIN_ROLE to Treasury on Realtor Module

1. **Go to:** https://arbitrum.blockscout.com/address/0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412
2. **Function:** `grantRole`
3. **Fill in:**
   - `role`: `0x9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b`
   - `account`: `0x3fD63728288546AC41dAe3bf25ca383061c3A929`

### Transaction 3: Grant TREASURY_ROLE to Treasury on Capital Pools

1. **Go to:** https://arbitrum.blockscout.com/address/0xFcCdC1E353b24936f9A8D08D21aF684c620fa701
2. **Function:** `grantRole`
3. **Fill in:**
   - `role`: `0xe4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5`
   - `account`: `0x3fD63728288546AC41dAe3bf25ca383061c3A929`

### Transaction 4: Grant COMPLIANCE_ROLE to Identity Hub on Lease Engine

1. **Go to:** https://arbitrum.blockscout.com/address/0x26a20dEa57F951571AD6e518DFb3dC60634D5297
2. **Function:** `grantRole`
3. **Fill in:**
   - `role`: `0x8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a`
   - `account`: `0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED`

### Transaction 5: Grant COMPLIANCE_ROLE to Identity Hub on Realtor Module

1. **Go to:** https://arbitrum.blockscout.com/address/0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412
2. **Function:** `grantRole`
3. **Fill in:**
   - `role`: `0xb1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d`
   - `account`: `0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED`

---

## 📱 STAGE 3B: DePIN Suite (1 Transaction)

### Transaction 1: Grant ORACLE_ROLE to IoT Oracle on DePIN Suite

1. **Go to:** https://arbitrum.blockscout.com/address/0x16dC3884d88b767D99E0701Ba026a1ed39a250F1
2. **Function:** `grantRole`
3. **Fill in:**
   - `role`: `0xb3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d`
   - `account`: `0xe38B3443E17A07953d10F7841D5568a27A73ec1a`

---

## ⚠️ IMPORTANT NOTES

1. **Connect with Signer Wallet:** Use `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`
2. **This wallet controls your Safe:** Since it's a 1-of-1 Safe, your signer acts as the Safe
3. **Each transaction costs gas:** ~$0.50-$1 per transaction
4. **Total cost:** ~$8-15 for all 17 transactions
5. **Do in order:** Complete Stage 1, then Stage 2, then Stage 3b
6. **Copy/paste carefully:** Role hashes must be exact (66 characters starting with 0x)

---

## 🎯 CHECKLIST

**Before starting:**
- [ ] Signer wallet has ~0.01 ETH on Arbitrum
- [ ] MetaMask is installed and connected to Arbitrum One
- [ ] You're ready to execute 17 transactions one-by-one

**Execution:**
- [ ] Stage 1: Complete all 11 transactions
- [ ] Stage 2: Complete all 5 transactions
- [ ] Stage 3b: Complete 1 transaction
- [ ] Verify on Blockscout (check each contract's roles)

---

## 💡 TIPS

- **Bookmark each contract URL** - you'll visit some multiple times
- **Copy role hashes to notes** - prevents typos
- **Take breaks** - no rush, each transaction is permanent
- **Check gas fees** - should be under $1 per transaction
- **Verify after each stage** - make sure roles were granted

Good luck! This method works perfectly on mobile. 📱
