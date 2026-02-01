# ⚡ Quick Start: Safe CLI Integration

Execute all 17 integration transactions in **5 minutes** from the Replit Shell. No browser, no JSON uploads - just one command!

**✨ NEW: Smart role checking!** The script automatically skips transactions where roles are already granted, preventing errors and saving gas!

---

## 🚀 3-Step Execution

### **Step 1: Fund Your Safe** 💰

Send **0.01 ETH** to your Safe wallet on **Arbitrum One**:

```
0x93696b537d814Aed5875C4490143195983AED365
```

**How to fund:**
- Use MetaMask: Switch to Arbitrum One, send 0.01 ETH
- Use Exchange: Withdraw ETH to Arbitrum network with Safe address

---

### **Step 2: Set Private Key** 🔑

In the Replit Shell, run:

```bash
export PRIVATE_KEY="<paste_your_signer_private_key_here>"
```

**Where to find it:**
1. Click the 🔒 **Secrets** icon in left sidebar
2. Find your secret (e.g., `ADMIN_1_SIGNER_KEY` or similar)
3. Copy the value (should start with `0x`)
4. Paste it in the command above

---

### **Step 3: Execute!** ⚡

```bash
npm run integrate:safe
```

That's it! The script will automatically:
- ✅ Connect to your Safe on Arbitrum
- ✅ Execute all 17 transactions (Stages 1, 2, 3B)
- ✅ Wait for each confirmation
- ✅ Show progress and results
- ✅ Display transaction links

**Time:** ~5-10 minutes  
**Cost:** ~$8-13 in gas  

---

## 📊 What You'll See

```
🚀 Axiom Safe CLI Integration
═══════════════════════════════════════════════════

📋 Configuration:
   Safe Address: 0x9369...AED365
   Network: Arbitrum One (42161)

✅ Signer loaded: 0x8d78...4C96

🔐 Initializing Safe SDK...
✅ Safe SDK initialized

═══════════════════════════════════════════════════

🔥 STAGE 1: Core Security & Token Plumbing (11 txns)

[1/11] Grant MINTER_ROLE to Treasury on AXM Token
   To: 0x864F...539D
   Safe Tx Hash: 0xabc...
   📝 Executing transaction...
   Tx Hash: 0xdef...
   ⏳ Waiting for confirmation...
   ✅ SUCCESS! Gas used: 45123
   🔗 https://arbitrum.blockscout.com/tx/0xdef...

...

✅ ALL STAGES COMPLETED SUCCESSFULLY!
🎉 Your 22 Axiom contracts are now fully integrated!
```

---

## ✅ Verify Success

After completion, check on Blockscout:

**AXM Token Roles:**
https://arbitrum.blockscout.com/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D

**Treasury Vaults:**
https://arbitrum.blockscout.com/address/0x3fD63728288546AC41dAe3bf25ca383061c3A929

---

## ❌ Troubleshooting

**Error: "PRIVATE_KEY not set"**
→ Run: `export PRIVATE_KEY="0x..."`

**Error: "Insufficient funds"**
→ Send more ETH to Safe: `0x9369...AED365`

**Error: "Transaction failed"**
→ Check Safe has ETH and signer controls Safe

---

## 📚 Full Documentation

For detailed info, see: `integration/SAFE-CLI-EXECUTION-GUIDE.md`

---

**Ready? Run the 3 steps above and you're done!** 🎯
