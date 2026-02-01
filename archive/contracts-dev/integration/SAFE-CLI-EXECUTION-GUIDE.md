# Safe CLI Integration - Execution Guide

## 🚀 Automated Safe Wallet Integration

This script executes all 17 integration transactions through your Safe wallet using the Safe Protocol Kit. No browser required - just run one command from the Replit Shell!

**✨ Smart Features:**
- Automatically checks if roles are already granted before executing
- Skips transactions that would fail (idempotent - can run multiple times safely)
- Saves gas by not executing unnecessary transactions
- Shows real-time status of each transaction

---

## ✅ Prerequisites

Before running, make sure:

1. **Your Safe wallet has ETH:** `0x93696b537d814Aed5875C4490143195983AED365`
   - Network: Arbitrum One
   - Minimum needed: 0.01 ETH (~$30)
   - Covers gas for all 17 transactions

2. **Your signer's private key is set in Secrets:**
   - Key name: `PRIVATE_KEY`
   - Value: Private key for `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96`
   - This is the wallet that controls your Safe

---

## 🎯 How to Execute

### **Step 1: Check Safe Balance**

Make sure your Safe has ETH:
```bash
curl -s -X POST https://arb1.arbitrum.io/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x93696b537d814Aed5875C4490143195983AED365","latest"],"id":1}' \
  | jq -r '.result' | xargs printf "%d\n" | awk '{print $1/1000000000000000000}'
```

Should show at least `0.01` ETH.

---

### **Step 2: Set Your Private Key**

In the Replit Shell, run:
```bash
export PRIVATE_KEY="<your_signer_private_key_from_secrets>"
```

**Important:** Replace `<your_signer_private_key_from_secrets>` with the actual private key value from your Replit Secrets panel.

---

### **Step 3: Execute Integration**

Run the integration script:
```bash
npm run integrate:safe
```

---

## 📊 What Happens

The script will:

1. **Initialize Safe SDK**
   - Connects to your Safe on Arbitrum
   - Verifies signer and threshold

2. **Execute Stage 1** (11 transactions)
   - Grant MINTER_ROLE to Treasury
   - Grant FEE_MANAGER_ROLE to Treasury
   - Grant REWARD_FUNDER_ROLE to Treasury
   - Grant COMPLIANCE_ROLE to Identity Hub
   - Grant ISSUER_ROLE to Identity Hub
   - Set Compliance Module
   - Configure 5 Treasury Vaults

3. **Execute Stage 2** (5 transactions)
   - Grant TREASURY_ROLE to Treasury (Lease Engine)
   - Grant ADMIN_ROLE to Treasury (Realtor)
   - Grant TREASURY_ROLE to Treasury (Capital Pools)
   - Grant COMPLIANCE_ROLE to Identity Hub (Lease Engine)
   - Grant COMPLIANCE_ROLE to Identity Hub (Realtor)

4. **Execute Stage 3B** (1 transaction)
   - Grant ORACLE_ROLE to IoT Oracle (DePIN Suite)

5. **Show Results**
   - Transaction hashes for each execution
   - Gas used per transaction
   - Success/failure status

---

## 💰 Cost Breakdown

| Stage | Transactions | Estimated Gas | Estimated Cost |
|-------|--------------|---------------|----------------|
| Stage 1 | 11 | ~550,000 | ~$5-8 |
| Stage 2 | 5 | ~250,000 | ~$2-4 |
| Stage 3B | 1 | ~50,000 | ~$0.50-1 |
| **Total** | **17** | **~850,000** | **~$8-13** |

*Costs based on Arbitrum gas prices at time of execution*

---

## ⏱️ Execution Time

- **Total time:** 5-10 minutes
- Each transaction takes ~20-40 seconds:
  - Sign transaction
  - Submit to network
  - Wait for confirmation

---

## 📝 Example Output

```
🚀 Axiom Safe CLI Integration

═══════════════════════════════════════════════════

📋 Configuration:
   Safe Address: 0x93696b537d814Aed5875C4490143195983AED365
   Network: Arbitrum One (42161)
   RPC: https://arb1.arbitrum.io/rpc

✅ Signer loaded: 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96

🔐 Initializing Safe SDK...
✅ Safe SDK initialized

📊 Safe Info:
   Address: 0x93696b537d814Aed5875C4490143195983AED365
   Threshold: 1
   Owners: 1
   Owner 1: 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96

═══════════════════════════════════════════════════

🔥 STAGE 1: Core Security & Token Plumbing (11 txns)

[1/11] Grant MINTER_ROLE to Treasury on AXM Token
   To: 0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D
   Safe Tx Hash: 0xabc...
   📝 Executing transaction...
   ⏳ Waiting for confirmation...
   ✅ SUCCESS! Gas used: 45123
   🔗 0xdef...

[2/11] Grant FEE_MANAGER_ROLE to Treasury on AXM Token
   ...
```

---

## ✅ Verification

After execution completes, verify on Blockscout:

### **Verify AXM Token Roles:**
https://arbitrum.blockscout.com/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D

1. Click "Read Contract"
2. Find `hasRole` function
3. Check:
   - `hasRole(0x9f2df0..., 0x3fD637...)` = `true` (MINTER_ROLE)
   - `hasRole(0x822771..., 0x3fD637...)` = `true` (FEE_MANAGER_ROLE)

### **Verify Treasury Vaults:**
https://arbitrum.blockscout.com/address/0x3fD63728288546AC41dAe3bf25ca383061c3A929

1. Click "Read Contract"  
2. Find `getVault` function
3. Check vault addresses for types 0-4

---

## ❌ Troubleshooting

### **Error: "PRIVATE_KEY not set"**
- Make sure you ran `export PRIVATE_KEY="..."`
- Check that your key starts with `0x`
- Verify it's the correct signer key

### **Error: "Transaction failed"**
- Check Safe has enough ETH for gas
- Verify signer controls the Safe
- Make sure you're on Arbitrum network

### **Error: "Insufficient funds"**
- Your Safe needs more ETH
- Send 0.01 ETH to the Safe address

### **Error: "Nonce too low"**
- Clear nonce: restart the script
- Or wait a few minutes and try again

---

## 🔒 Security Notes

1. **Never share your private key**
   - Keep it in Replit Secrets only
   - Don't commit it to git
   - Don't paste it in chat

2. **Verify transaction data**
   - Script uses pre-encoded calldata
   - All addresses are hardcoded
   - No user input required

3. **One-time execution**
   - Each transaction can only succeed once
   - Trying to re-run will fail (roles already granted)
   - No risk of duplicate execution

---

## 📞 Support

If you encounter issues:
1. Check the error message carefully
2. Verify prerequisites (ETH balance, private key)
3. Review the troubleshooting section
4. Check Blockscout for transaction status

---

## ✨ Next Steps

After successful integration:
1. ✅ Verify all roles on Blockscout
2. 🏗️ Build operations dashboard
3. 📊 Set up monitoring and alerts
4. 🧪 Test core functionality
5. 🚀 Deploy to production

Congratulations! Your Axiom Smart City ecosystem is now fully integrated! 🎉
