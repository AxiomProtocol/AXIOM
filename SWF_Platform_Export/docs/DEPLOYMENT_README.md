# Sovran Wealth Fund - Complete Deployment Guide

This document provides detailed instructions for deploying the complete Sovran Wealth Fund (SWF) ecosystem to the Polygon mainnet, including the DynamicAPR system and the SWFBasketVault.

## System Components

The SWF ecosystem consists of the following contracts:

1. **SovranWealthFund (SWF) Token**: The main ERC20 token with role-based permissions.
2. **SoloMethodEngine**: The staking contract that handles user deposits and rewards.
3. **SWFBasketVault**: A vault that allows users to deposit SWF tokens and receive SWF-BASKET tokens.
4. **DynamicAPRController**: A controller that adjusts the staking APR based on vault deposits.

## Prerequisites

Before deployment, ensure you have:

1. **Private Key**: The private key for the deployment wallet (Treasury wallet).
2. **Sufficient MATIC**: At least 1 MATIC in the deployment wallet to cover gas fees.
3. **API Keys**:
   - Alchemy API key for reliable RPC connection
   - Polygonscan API key for contract verification

## Setup Environment Variables

Create a `.env` file with the following variables:

```
# Private key for deployment
PRIVATE_KEY=your_private_key_here

# API keys
ALCHEMY_API_KEY=your_alchemy_api_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here

# Contract addresses (if SWF token is already deployed)
SWF_TOKEN_ADDRESS=0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7
```

## Deployment Steps

### 1. Deploy the SWF Token (if not already deployed)

```bash
npx hardhat run scripts/deploy.js --network polygon
```

This will deploy the SovranWealthFund token and update the `.env` file with its address.

### 2. Deploy the Dynamic APR System

```bash
npx hardhat run scripts/deployDynamicSystem.js --network polygon
```

This script:
1. Deploys the SWFBasketVault
2. Deploys the SoloMethodEngine (staking contract)
3. Deploys the DynamicAPRController
4. Transfers ownership of the staking engine to the DynamicAPRController
5. Updates the `.env` file with all contract addresses
6. Saves deployment information to JSON files

### 3. Verify Contracts on Polygonscan

```bash
npx hardhat run scripts/verifyContracts.js --network polygon
```

This script verifies all deployed contracts on Polygonscan, making their code and ABIs publicly accessible.

## Post-Deployment Configuration

After deployment, the contract addresses will be available in:
- The `.env` file
- The `dynamic-system-latest.json` file

### Granting Minter Role to SoloMethodEngine (Optional)

To allow the staking engine to mint tokens for rewards, grant it the MINTER_ROLE:

```bash
npx hardhat run scripts/grantMinterRoleToSoloMethodEngine.js --network polygon
```

### Setting Up APR Adjustment Schedule

To enable automatic APR adjustments:

1. Set up a recurring task to call the `adjustAPR()` function on the DynamicAPRController
2. This can be done through:
   - A cron job using `node-cron`
   - A service like Chainlink Keepers
   - A service like Gelato Network

## Interacting with the Contracts

You can use the following management scripts to interact with the deployed contracts:

- `swf-token-manager.js`: Manage SWF token (mint, check balances, grant roles)
- `swf-staking-manager.js`: Interact with the staking engine (stake, withdraw, claim rewards)
- `swf-integrated-manager.js`: Interact with the integrated system

Example:
```bash
node swf-token-manager.js checkBalance 0x26a8401287ce33cc4AEb5a106cD6D282a9c2f51D
node swf-staking-manager.js getInfo
```

## APR Adjustment Logic

The DynamicAPRController adjusts the APR based on vault deposits:

- Deposits ≤ 10,000 SWF: 30% APR (maximum)
- Deposits ≥ 100,000 SWF: 10% APR (minimum)
- Between 10K and 100K: Linear interpolation

This mechanism encourages early deposits while ensuring sustainability as the protocol grows.

## Monitoring and Maintenance

- Regularly monitor the system using the management scripts
- Check vault deposit levels and current APR
- Ensure the APR adjustment schedule is working correctly
- Monitor token distribution and staking metrics

## Security Considerations

- The contracts implement role-based access control
- The SWF token has pausable functionality for emergency situations
- Ownership of the staking engine is transferred to the DynamicAPRController
- Always verify contracts on Polygonscan after deployment

## Troubleshooting

If you encounter any issues during deployment:

1. Check that you have sufficient MATIC for gas fees
2. Ensure your private key and API keys are correctly set in the `.env` file
3. Verify that the network configuration in `hardhat.config.js` is correct
4. Check the console output for specific error messages