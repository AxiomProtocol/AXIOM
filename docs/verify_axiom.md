# How to Verify the AXM Token

> **A Simple Guide for Users**
> 
> This guide explains how to verify that you are interacting with the official Axiom Protocol Token (AXM) on Arbitrum One.

---

## Quick Reference

| Detail | Value |
|--------|-------|
| **Token Name** | Axiom Protocol Token |
| **Symbol** | AXM |
| **Network** | Arbitrum One |
| **Contract Address** | `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D` |
| **Decimals** | 18 |
| **Max Supply** | 15,000,000,000 (15 billion) |

---

## Step 1: Verify on Block Explorer

The easiest way to verify the token is to check it on the blockchain explorer:

1. Go to [Arbitrum Blockscout](https://arbitrum.blockscout.com)
2. Paste this address in the search bar: `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D`
3. Or click this direct link: [View AXM Token on Blockscout](https://arbitrum.blockscout.com/address/0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D)

### What to Check:

| Field | Expected Value |
|-------|----------------|
| Contract Name | AxiomV2 |
| Token Name | Axiom Protocol Token |
| Token Symbol | AXM |
| Decimals | 18 |
| Verified | Yes (green checkmark) |

---

## Step 2: Add AXM to Your Wallet

### MetaMask (Desktop/Mobile)

1. Open MetaMask
2. Make sure you're on **Arbitrum One** network
3. Click "Import tokens" at the bottom
4. Paste the contract address: `0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D`
5. The token symbol (AXM) and decimals (18) will auto-fill
6. Click "Add Custom Token"
7. Click "Import Tokens"

### If Arbitrum One is not in your networks:

1. Click the network dropdown in MetaMask
2. Click "Add Network"
3. Use these settings:
   - Network Name: `Arbitrum One`
   - RPC URL: `https://arb1.arbitrum.io/rpc`
   - Chain ID: `42161`
   - Currency Symbol: `ETH`
   - Block Explorer: `https://arbitrum.blockscout.com`

---

## Step 3: Verify Token Details

Once you've added the token, verify these details match:

### In MetaMask:
- Symbol shows as **AXM**
- Network shows **Arbitrum One**

### On Blockscout:
- Total Supply: 15,000,000,000 AXM
- Contract is verified (source code visible)
- Compiler version: 0.8.20

---

## Warning Signs of Fake Tokens

Be cautious of tokens that:

- Have a **different contract address** than shown above
- Are on a **different network** (not Arbitrum One)
- Have **unverified** source code on the block explorer
- Have a **different name or symbol** (slight misspellings)
- Promise unrealistic returns or airdrops

---

## Official Resources

| Resource | Link |
|----------|------|
| Official Website | https://axiomprotocol.io |
| Contract Registry | See `docs/contract_registry.md` in this repository |
| Tokenomics | See `docs/tokenomics.md` in this repository |

---

## Need Help?

If you're unsure whether you have the correct token:

1. Compare the contract address character-by-character
2. Check that the source code is verified on Blockscout
3. Confirm the network is Arbitrum One (Chain ID: 42161)

**Never share your private keys or seed phrase with anyone.**

---

**Copyright (c) 2024 Axiom Protocol. All Rights Reserved.**
