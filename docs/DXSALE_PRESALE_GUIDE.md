# AXM Token Presale on DxSale - Complete Guide

## Overview

This guide walks you through launching the AXM token presale on DxSale (Arbitrum One).

**Token Details:**
- Contract: `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D`
- Network: Arbitrum One (Chain ID: 42161)
- Max Supply: 15,000,000,000 AXM
- Presale Allocation: 80,000,000 AXM (0.53% of supply)
  - Presale tokens: 50M AXM (50 ETH × 1M rate)
  - Liquidity tokens: ~24M AXM (60% × 50 ETH × 800K rate)
  - Buffer: ~6M AXM

---

## Pre-Launch Checklist

### Contract Compatibility (All Verified)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Transfer fees disabled | ✅ | 0% by default |
| Anti-whale disabled | ✅ | maxTxEnabled = false |
| Ownership maintained | ✅ | Admin has all roles |
| Compliance module off | ✅ | No KYC restrictions |
| Pausable | ✅ | Not paused |

### Required Before Creating Presale

1. [ ] Mint 80M AXM (presale + liquidity allocation)
2. [ ] Have ~0.01 ETH on Arbitrum for gas
3. [ ] Have ~$100 in ETH for DxSale creation fee

---

## Step 1: Mint Presale Tokens

Run the minting script from your terminal:

```bash
npx hardhat run scripts/mint-presale-allocation.js --network arbitrum
```

This will:
- Grant MINTER_ROLE if needed
- Mint 80,000,000 AXM to your wallet (50M presale + 24M liquidity + 6M buffer)
- Display confirmation and next steps

---

## Step 2: Create Presale on DxSale

### A. Connect to DxSale

1. Go to https://dx.app
2. Connect MetaMask wallet (use deployer wallet)
3. Switch to **Arbitrum One** network
4. Click **"Create"** → **"Create Your IDO"** → **"Standard Presale"**

### B. Enter Token Details

- **Token Address**: `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D`
- DxSale will auto-detect: Name (Axiom Protocol Token), Symbol (AXM), Decimals (18)

### C. Configure Presale Parameters

| Parameter | Recommended Value | Notes |
|-----------|-------------------|-------|
| **Presale Rate** | 1,000,000 AXM per ETH | Early investor price |
| **Listing Rate** | 800,000 AXM per ETH | 25% markup at listing |
| **Soft Cap** | 25 ETH (~$50K) | Minimum to succeed |
| **Hard Cap** | 50 ETH (~$100K) | Maximum raise |
| **Min Contribution** | 0.01 ETH | Per wallet minimum |
| **Max Contribution** | 5 ETH | Per wallet maximum |
| **Liquidity %** | 60% | Goes to DEX pool |
| **Liquidity Lock** | 12 months | Investor protection |

### D. Set Timing

| Parameter | Recommendation |
|-----------|----------------|
| **Start Time** | 24-48 hours from now |
| **End Time** | 7 days after start |
| **Liquidity Lock End** | 12 months after presale ends |

### E. Add Project Information

**Required:**
- Logo: 256x256 PNG (use Axiom logo)
- Banner: 1024x512 PNG
- Website: https://axiomprotocol.app
- Description: Brief project overview

**Social Links:**
- Twitter/X: @AxiomProtocol
- Telegram: (your channel)
- Discord: (your server)

### F. Optional Features

| Feature | Recommendation |
|---------|----------------|
| **Whitelist** | Enable (48h early access for community) |
| **Vesting** | Enable: 25% TGE, 25% each month for 3 months |
| **Affiliate** | Optional (10% referral bonus) |

### G. Review and Submit

1. Preview your presale card
2. Double-check all parameters
3. Click **"Start Presale"**
4. **Approve** DxSale to spend your AXM tokens (80M)
5. **Confirm** the presale creation transaction
6. Pay the ~$100 creation fee in ETH

---

## Step 3: Post-Creation Setup

### Add Whitelist Addresses (if enabled)

1. Go to your presale page
2. Click **"Whitelist"** tab
3. Add community/early supporter addresses
4. Set whitelist-only period (first 48 hours recommended)

### Enable Vesting Schedule

1. Go to presale settings
2. Enable vesting
3. Configure: 25% at TGE, then 25% monthly for 3 months

---

## Step 4: After Presale Ends

### If Successful (Soft Cap Reached)

1. Go to your presale page
2. Click **"Finalize"**
3. DxSale automatically:
   - Creates liquidity pool on DEX
   - Locks liquidity for 12 months
   - Enables token claims for participants

### If Failed (Soft Cap Not Reached)

- Participants can claim refunds
- Your unsold tokens return to your wallet
- No listing occurs

---

## Important Notes

### Fees

| Fee Type | Amount |
|----------|--------|
| Creation Fee | ~$100 in ETH |
| Success Fee | 4% of raised ETH OR 2% ETH + 2% tokens |

### Security Tips

- Never share your private key
- Verify you're on dx.app (official site)
- Double-check all parameters before confirming
- Keep ownership until presale is finalized
- Don't add liquidity manually (DxSale handles it)

### After Listing

1. Announce listing on social media
2. Share DEX link with community
3. Consider additional marketing push
4. Monitor liquidity and trading activity

---

## Quick Reference

**Token**: `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D`  
**Network**: Arbitrum One  
**DxSale**: https://dx.app  
**Explorer**: https://arbiscan.io/token/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D

---

## Support

If you encounter issues:
1. Check DxSale documentation: https://docs.dxsale.network
2. Join DxSale Telegram for support
3. Verify transaction on Arbiscan
