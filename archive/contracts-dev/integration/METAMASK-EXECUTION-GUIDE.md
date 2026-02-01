# 🦊 MetaMask Execution Guide - Simple & Fast

Execute all 4 integration stages using MetaMask wallets and Hardhat scripts.

---

## Prerequisites

✅ **Two MetaMask wallets with admin rights:**
- **Admin 1 Wallet:** Controls contracts 1-9, 12
- **Deployer Wallet:** Controls contracts 10-11, 13-22

✅ **Gas funds on Arbitrum One:**
- Each wallet needs ~0.01 ETH for gas
- Total cost: ~$10-20

✅ **Private keys exported from MetaMask:**
- MetaMask → Account Options → Export Private Key
- ⚠️ **NEVER commit private keys to code**

---

## Quick Start (5 Commands)

### Step 1: Set Up Environment
```bash
cd /home/runner/workspace

# Set your Arbitrum RPC (optional - we have a default)
export ARBITRUM_RPC_URL="https://arb1.arbitrum.io/rpc"
```

### Step 2: Execute Stage 1 (Admin 1 Wallet)
```bash
# Set Admin 1 private key
export PRIVATE_KEY="your_admin1_private_key_here"

# Run Stage 1: Core Security (11 transactions)
npm run integrate:stage1

# ✅ Verify on Blockscout before continuing
```

### Step 3: Execute Stage 2 (Admin 1 Wallet)
```bash
# Same wallet as Stage 1
export PRIVATE_KEY="your_admin1_private_key_here"

# Run Stage 2: Financial & Real Estate (5 transactions)
npm run integrate:stage2

# ✅ Verify on Blockscout before continuing
```

### Step 4: Execute Stage 3a (Deployer Wallet)
```bash
# Switch to Deployer private key
export PRIVATE_KEY="your_deployer_private_key_here"

# Run Stage 3a: Utility Hub (1 transaction)
npm run integrate:stage3

# ⚠️ This will execute both 3a and 3b, but 3b will fail
# That's OK - we'll run 3b separately next
```

### Step 5: Execute Stage 3b (Admin 1 Wallet)
```bash
# Switch back to Admin 1 private key
export PRIVATE_KEY="your_admin1_private_key_here"

# Run Stage 3 again: DePIN Suite (1 transaction)
npm run integrate:stage3

# ✅ Verify on Blockscout
```

### Step 6: Execute Stage 4 (Either Wallet)
```bash
# Any wallet works (no transactions needed)
npm run integrate:stage4

# ✅ Done! All 22 contracts integrated
```

---

## Alternative: Run All at Once (with manual intervention)

If you want to run the master script:

```bash
# Set Admin 1 key
export PRIVATE_KEY="your_admin1_private_key_here"

# Start master integration
npm run integrate:all

# The script will:
# ✅ Complete Stage 1
# ✅ Complete Stage 2  
# ❌ Fail at Stage 3a (wrong wallet)

# Now switch wallets and continue:
export PRIVATE_KEY="your_deployer_private_key_here"
npm run integrate:stage3  # Completes 3a, fails 3b

export PRIVATE_KEY="your_admin1_private_key_here"  
npm run integrate:stage3  # Completes 3b

npm run integrate:stage4  # No transactions needed
```

---

## Verification After Each Stage

### Stage 1: Verify Core Roles
Visit https://arbitrum.blockscout.com/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D

Click "Read Contract" and check:
```
hasRole(MINTER_ROLE, Treasury) → should return true
hasRole(FEE_MANAGER_ROLE, Treasury) → should return true
hasRole(COMPLIANCE_ROLE, Identity Hub) → should return true
```

### Stage 2: Verify Revenue Roles
Visit https://arbitrum.blockscout.com/address/0x26a20dEa57F951571AD6e518DFb3dC60634D5297

Check:
```
hasRole(TREASURY_ROLE, Treasury) → should return true
hasRole(COMPLIANCE_ROLE, Identity Hub) → should return true
```

### Stage 3: Verify Oracle Roles
Visit https://arbitrum.blockscout.com/address/0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d

Check:
```
hasRole(METER_ORACLE_ROLE, IoT Oracle) → should return true
```

Visit https://arbitrum.blockscout.com/address/0x16dC3884d88b767D99E0701Ba026a1ed39a250F1

Check:
```
hasRole(ORACLE_ROLE, IoT Oracle) → should return true
```

---

## Troubleshooting

### ❌ "Insufficient funds for gas"
**Solution:** Add more ETH to your wallet on Arbitrum

### ❌ "AccessControlUnauthorizedAccount"
**Solution:** You're using the wrong wallet. Check which admin controls that contract:
- Contracts 1-9, 12 → Admin 1
- Contracts 10-11, 13-22 → Deployer

### ❌ "Role already granted"
**Solution:** This is safe! The role was already granted. Continue to next step.

### ❌ "Nonce too low"
**Solution:** Reset your MetaMask account:
1. MetaMask → Settings → Advanced → Clear Activity Tab Data
2. Try transaction again

---

## Security Best Practices

✅ **DO:**
- Use hardware wallets (Ledger/Trezor) with MetaMask
- Export private keys only when needed
- Clear environment variables after execution: `unset PRIVATE_KEY`
- Verify each transaction on Blockscout before continuing
- Keep private keys in password manager, never in code

❌ **DON'T:**
- Commit private keys to GitHub
- Share private keys in chat/email
- Keep private keys in .env files in the repository
- Execute without verifying wallet has correct admin rights

---

## Gas Cost Summary

| Stage | Transactions | Estimated Gas Cost |
|-------|--------------|-------------------|
| Stage 1 | 11 | ~$5-10 |
| Stage 2 | 5 | ~$2-5 |
| Stage 3a | 1 | ~$1-2 |
| Stage 3b | 1 | ~$1-2 |
| Stage 4 | 0 | $0 |
| **TOTAL** | **18** | **~$10-20** |

---

## Complete Execution Timeline

**Total time: 30-60 minutes**

- Stage 1: 10-15 minutes (11 transactions + verification)
- Stage 2: 5-10 minutes (5 transactions + verification)
- Stage 3a: 2-5 minutes (1 transaction + verification)
- Stage 3b: 2-5 minutes (1 transaction + verification)
- Stage 4: 1 minute (no transactions)

---

## After Successful Integration

✅ **Verify everything worked:**
```bash
# Run automated verification (coming soon)
npm run integrate:verify:all
```

✅ **Document completion:**
- Save transaction hashes from Blockscout
- Update project logs with integration date
- Back up integration scripts

✅ **Test critical workflows:**
- Stake AXM tokens
- Create a lease agreement
- Submit utility meter reading
- Complete a quest for NFT reward

---

## Need Help?

If you encounter any issues:
1. Check the error message carefully
2. Verify you're using the correct wallet
3. Confirm wallet has gas funds
4. Review contract addresses in `integration/config/contracts.config.ts`
5. Check Blockscout for transaction details

---

**Ready to execute? Just copy the commands above and run them one by one!** 🚀

The integration is already tested and working - you're just granting the permissions your contracts need to work together.
