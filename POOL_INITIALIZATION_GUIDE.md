# 🏊 Axiom DEX - First Pool Initialization Guide

## Current Status

✅ **DEX Contract**: Deployed and verified on Arbitrum One  
✅ **Initialization Script**: Ready and tested  
⏳ **Deployer Wallet Funding**: Required before pool creation

---

## 📍 Deployer Wallet Information

**Address**: `0xDFf9e47eb007bF02e47477d577De9ffA99791528`

### Current Balances:
- **ETH**: 0.000000135371 ETH ⚠️ (Insufficient for gas)
- **AXM**: Unknown (needs checking)
- **USDC**: Unknown (needs checking)

---

## 💰 Required Funds for Pool Initialization

To create the first AXM/USDC liquidity pool, you need to send the following to the deployer wallet:

### Minimum Requirements:

| Asset | Amount Needed | Purpose | Network |
|-------|---------------|---------|---------|
| **ETH** | 0.01 ETH (~$30) | Gas fees for transactions | Arbitrum One |
| **AXM** | 100 tokens | Initial liquidity (Token A) | Arbitrum One |
| **USDC** | 10 tokens | Initial liquidity (Token B) | Arbitrum One |

### Initial Pool Ratio:
- **Starting Price**: 1 AXM = $0.10 USDC
- **Total Liquidity Value**: ~$20 USD equivalent
- **Pool Pair**: AXM/USDC

---

## 📋 Step-by-Step Funding Instructions

### Step 1: Fund with ETH for Gas Fees

Send **0.01 ETH** (or more) to the deployer wallet on **Arbitrum One**:

```
Deployer Wallet: 0xDFf9e47eb007bF02e47477d577De9ffA99791528
Network: Arbitrum One (Chain ID: 42161)
Asset: ETH
Amount: 0.01 ETH minimum
```

**Why ETH?**
- Approve AXM spending: ~0.0001 ETH
- Approve USDC spending: ~0.0001 ETH  
- Create pool transaction: ~0.0005 ETH
- Buffer for price fluctuations: ~0.0094 ETH

### Step 2: Send AXM Tokens

Send **100 AXM** tokens to the deployer wallet on Arbitrum One:

```
Deployer Wallet: 0xDFf9e47eb007bF02e47477d577De9ffA99791528
Network: Arbitrum One
AXM Contract: 0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D
Amount: 100 AXM
```

**How to send:**
1. Connect your wallet to Arbitrum One network
2. Go to the AXM token contract on Blockscout
3. Use the "Transfer" function to send to deployer wallet
4. Or use MetaMask to send tokens directly

### Step 3: Send USDC Tokens  

Send **10 USDC** tokens to the deployer wallet on Arbitrum One:

```
Deployer Wallet: 0xDFf9e47eb007bF02e47477d577De9ffA99791528
Network: Arbitrum One
USDC Contract: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
Amount: 10 USDC
```

**Getting USDC on Arbitrum:**
- Bridge from Ethereum using official Arbitrum Bridge
- Buy on centralized exchange (Coinbase, Binance) and withdraw to Arbitrum
- Swap for USDC on existing Arbitrum DEXs (Uniswap, SushiSwap)

---

## 🚀 Running the Pool Initialization

Once the deployer wallet is funded with all required assets, run:

```bash
node scripts/initialize-first-pool.js
```

### What the Script Does:

1. ✅ Connects to Arbitrum One network
2. ✅ Verifies deployer wallet has sufficient balances
3. ✅ Checks if AXM/USDC pool already exists
4. ✅ Approves AXM spending to DEX contract
5. ✅ Approves USDC spending to DEX contract
6. ✅ Creates new liquidity pool with initial liquidity
7. ✅ Displays pool statistics and transaction hash

### Expected Output:

```
🎉 SUCCESS! First liquidity pool initialized!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Pool Details:
   Pair: AXM/USDC
   Initial AXM: 100
   Initial USDC: 10
   Starting Price: 1 AXM = $0.10
   DEX Contract: 0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D
   Transaction: 0x...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔍 Verification

After pool creation, verify on Blockscout:

1. **View Transaction**:  
   `https://arbitrum.blockscout.com/tx/[TRANSACTION_HASH]`

2. **View DEX Contract**:  
   `https://arbitrum.blockscout.com/address/0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D`

3. **Check Pool on Frontend**:  
   Navigate to `/axiom-dex` and click the "Pools" tab

---

## 📊 Post-Initialization

Once the pool is live, users can:

✅ **Swap Tokens**: Trade AXM <-> USDC with 0.3% fee  
✅ **Add Liquidity**: Provide liquidity and earn trading fees  
✅ **View Pool Stats**: Monitor volume, fees, and reserves

### Liquidity Provider Benefits:

- Earn **0.3% of all trading fees** automatically
- Fees compound as they're added back to the pool
- Withdraw liquidity anytime by burning LP tokens
- No lockup period or minimum time requirement

---

## 🎯 Alternative: Create AXM/WETH Pool

If USDC is difficult to obtain, you can create an AXM/WETH pool instead:

**Required for AXM/WETH Pool:**
- 100 AXM tokens
- 0.05 WETH tokens (Wrapped ETH)
- Starting ratio: 1 AXM = 0.0005 WETH (~$0.10 if ETH = $2000)

**To use WETH instead, modify the script:**
```javascript
const USDC_ADDRESS = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'; // WETH
const usdcAmount = ethers.parseUnits('0.05', 18); // WETH uses 18 decimals
```

---

## ⚠️ Important Security Notes

1. **Deployer Private Key**: Never share the DEPLOYER_PK environment variable
2. **Mainnet Transactions**: All transactions are irreversible on mainnet
3. **Gas Costs**: Arbitrum fees are low but can spike during congestion
4. **Slippage**: First trade may have high slippage with low liquidity
5. **Auditing**: DEX contract should be audited before handling large amounts

---

## 🆘 Troubleshooting

### "Insufficient ETH Balance"
- Send at least 0.01 ETH to deployer wallet
- Check you're on Arbitrum One (not Ethereum mainnet)

### "Insufficient AXM Balance"  
- Verify AXM tokens are on Arbitrum One network
- Check deployer wallet address is correct

### "Pool Already Exists"
- Pool has been created - view in Pools tab
- You can add more liquidity to existing pool

### "Transaction Failed"
- Check gas price isn't too low
- Ensure token approvals succeeded
- Verify sufficient balances for both tokens

---

## 📞 Next Steps

1. ✅ **Fund Deployer Wallet** with ETH, AXM, and USDC
2. ✅ **Run Initialization Script**
3. ✅ **Verify Pool Creation** on Blockscout
4. ✅ **Test First Swap** on frontend
5. ✅ **Invite Liquidity Providers** to add more liquidity
6. ✅ **Monitor Pool Performance** via analytics dashboard

---

## 🔗 Quick Reference Links

- **DEX Frontend**: `/axiom-dex`
- **DEX Contract**: `0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D`
- **AXM Token**: `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D`
- **USDC Token**: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- **Blockscout Explorer**: https://arbitrum.blockscout.com/

---

**Created**: November 22, 2025  
**Network**: Arbitrum One  
**Status**: Ready for funding and initialization
