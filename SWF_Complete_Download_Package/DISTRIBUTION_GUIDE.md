# SWF Token Distribution Guide

This guide explains the various token distribution scripts for the Sovran Wealth Fund (SWF) token.

## Overview

The SWF token distribution system includes several scripts for different distribution scenarios:

1. **Initial Distribution** (`distribute-tokens.js`) - One-time distribution of tokens from the main holder wallet to all designated allocation wallets according to their percentages.
2. **Bank Wallet Funding** (`fund-bank-wallet.js`) - Transfer tokens from the main holder wallet to the bank wallet (Liquidity Wallet) for auto-funding distribution.
3. **Auto-Funding Distribution** (`runAutoFunding.js`) - Periodic distribution of small amounts of tokens from the bank wallet to all eligible wallets.
4. **Token Redistribution** (`redistributeTokens.js`) - Rebalancing tokens from the Charity Wallet to other wallets based on the SOLO plan percentages.
5. **Wallet Balance Checking** (`check-wallet-balances.js`) - Verify the token distribution by checking all wallet balances.

## Initial Setup

1. Ensure all the private keys for relevant wallets are stored in the `.env` file:
```
PRIVATE_KEY=0x... # Main holder private key
BANK_WALLET_PRIVATE_KEY=0x... # Liquidity Wallet private key
WALLET_CHARITY=0x... # Charity Wallet private key
```

2. Make sure the `wallets.json` file is correctly set up with all the wallet addresses and allocations.

## Script Usage Guide

### 1. Initial Distribution

The `distribute-tokens.js` script distributes tokens from the main holder wallet to all wallets according to their allocations in `wallets.json`.

**Usage:**
```
node distribute-tokens.js [private_key]
```

- `private_key` (optional): The private key of the main holder wallet. If not provided, it will use the one from the `.env` file.

**Example:**
```
node distribute-tokens.js 0xd9d1acde0fd6c7e9f776b1ae4a826cb98ae8818c3185945ec65f1b647ef67601
```

### 2. Check Wallet Balances

The `check-wallet-balances.js` script verifies the token distribution by checking all wallet balances.

**Usage:**
```
node check-wallet-balances.js
```

This will display a table showing each wallet's allocation, target balance, current balance, and progress percentage.

### 3. Fund Bank Wallet

The `fund-bank-wallet.js` script transfers tokens from the main holder wallet to the bank wallet (Liquidity Wallet).

**Usage:**
```
node fund-bank-wallet.js [private_key] [percentage]
```

- `private_key` (optional): The private key of the main holder wallet.
- `percentage` (optional): The percentage of the main holder's balance to transfer (default: 10%).

**Example:**
```
node fund-bank-wallet.js 0xd9d1acde0fd6c7e9f776b1ae4a826cb98ae8818c3185945ec65f1b647ef67601 20
```

This transfers 20% of the main holder's balance to the bank wallet.

### 4. Auto-Funding Distribution

The `runAutoFunding.js` script distributes tokens from the bank wallet to all eligible wallets.

**Usage:**
```
node runAutoFunding.js [private_key]
```

- `private_key` (optional): The private key of the bank wallet.

**Example:**
```
node runAutoFunding.js 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

By default, this distributes 1% of the bank wallet balance to each eligible wallet. The distribution logs are saved in the `logs` directory.

### 5. Token Redistribution

The `redistributeTokens.js` script rebalances tokens from the Charity Wallet to other wallets based on the SOLO plan percentages.

**Usage:**
```
node redistributeTokens.js [private_key] [percentage]
```

- `private_key` (optional): The private key of the Charity Wallet.
- `percentage` (optional): The percentage of the Charity Wallet's balance to redistribute (default: 50%).

**Example:**
```
node redistributeTokens.js 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890 30
```

This redistributes 30% of the Charity Wallet's balance to other wallets proportionally based on their allocations.

## Automation and Scheduling

For automated distribution, you can set up cron jobs to run the auto-funding script periodically:

```bash
# Example crontab entry to run auto-funding every Monday at 12:00 PM
0 12 * * 1 /usr/bin/node /path/to/runAutoFunding.js >> /path/to/auto-funding.log 2>&1
```

## Logs and Monitoring

All distribution scripts generate detailed logs and save transaction records in the `logs` directory. These logs include:

- Transaction hashes
- Token amounts
- Success/failure status
- Wallet balances before and after transfers

## Troubleshooting

### Common Issues

1. **Rate Limiting Errors**

   If you see rate limit errors from RPC providers, the scripts include automatic retry with exponential backoff logic. However, if persistent issues occur, you can:
   - Run the scripts during off-peak hours
   - Modify the RPC endpoints in the scripts to use different providers

2. **Insufficient Balance**

   If the source wallet doesn't have enough balance:
   - Check the wallet balance using `check-wallet-balances.js`
   - Verify that the correct wallet address is being used

3. **Transaction Failures**

   If transactions fail repeatedly:
   - Check for network congestion and increase gas price if needed
   - Verify that the private keys match the wallet addresses
   - Ensure the BSC network is accessible from your location

## Security Notes

- Keep your private keys secure and never share them
- Consider using a hardware wallet for additional security
- Regularly rotate private keys for sensitive wallets
- Store the `.env` file securely and exclude it from version control systems