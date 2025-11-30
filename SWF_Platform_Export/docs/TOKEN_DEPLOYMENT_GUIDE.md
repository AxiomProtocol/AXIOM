# Sovran Wealth Fund (SWF) Token Deployment Guide

This guide provides instructions for managing and deploying the SWF token on the Polygon Mainnet.

## Token Information

- **Name:** Sovran Wealth Fund
- **Symbol:** SWF
- **Decimals:** 18
- **Total Supply:** 1,000,000,000 SWF
- **Current Deployment:** Polygon Mainnet
- **Contract Address:** 0xa0b0AaCbf4E7261691689e5F240C278fB295edF7 (Updated April 2025)

## Prerequisites

Before starting, ensure you have:

1. Node.js and NPM installed
2. A wallet with MATIC for gas fees
3. Access to the private key for deployment
4. Alchemy API key for Polygon RPC access
5. PolygonScan API key for contract verification

## Setup

The required environment variables are stored in the `.env` file:

```
PRIVATE_KEY=your_private_key
ALCHEMY_API_KEY=your_alchemy_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
SWF_TOKEN_ADDRESS=existing_token_address
MAIN_DISTRIBUTOR_ADDRESS=main_distributor_wallet
TREASURY_WALLET=treasury_wallet_address
```

## Token Management Scripts

We've created several scripts to help manage the SWF token:

### 1. Token Information

To view information about the currently deployed token:

```bash
npx hardhat run scripts/token-info.js --network polygon
```

This will display:
- Token name, symbol, and decimals
- Total supply
- Current wallet balance
- Main distributor balance
- Treasury wallet balance
- Token owner address
- PolygonScan link

### 2. Token Deployment

To deploy a new token (only if needed):

```bash
npx hardhat run scripts/deploy-token.js --network polygon
```

This script will:
- Check if a token is already deployed
- Connect to existing token if found
- Deploy a new token if needed
- Update the `.env` file with the new token address
- Save deployment information to `token-deployment-info.json`

### 3. Contract Verification

To verify the token contract on PolygonScan:

```bash
npx hardhat run scripts/verify-token.js --network polygon
```

This will make the contract source code visible on PolygonScan.

### 4. Direct Contract Information

For a direct approach to retrieve and verify contract information without relying on Polygonscan:

```bash
node scripts/get-contract-info.js
```

This connects directly to the Polygon network and retrieves essential token information.

### 5. Save Contract Details

To generate a JSON file with all token details for application use:

```bash
node scripts/save-contract-details.js
```

This creates `SovranWealthFund.token.json` with all the contract details needed for frontend and backend integration.

## Interactive Token Management Console

For easier management, we've created an interactive console:

```bash
node token-management.js
```

This provides a menu-driven interface for:
1. Viewing token information
2. Deploying a new token (if needed)
3. Verifying the token on PolygonScan

## Contract Source Code

The token is implemented as a standard ERC20 token using OpenZeppelin contracts:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SovranWealthFund is ERC20, Ownable {
    constructor() ERC20("Sovran Wealth Fund", "SWF") Ownable(msg.sender) {
        _mint(msg.sender, 1000000000 * 10 ** decimals());
    }
}
```

## Token Distribution

The token is initially minted to the deployer address and can then be distributed to:

1. Main Distributor Wallet - For general token distribution
2. Treasury Wallet - For protocol operations
3. Liquidity pools - For market making

## Polygon Network Details

- **Network ID:** 137
- **RPC URL:** https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}
- **Block Explorer:** https://polygonscan.com/

## Important Notes

1. The SWF token is successfully deployed and functional on Polygon Mainnet at address `0xa0b0AaCbf4E7261691689e5F240C278fB295edF7`.
2. Token functionality has been verified through direct blockchain interaction as confirmed in `SovranWealthFund.token.json`.
3. The complete token information is accessible via the provided scripts without requiring PolygonScan verification.
4. The application can directly interact with the token using the standard ERC20 ABI provided in the JSON file.
5. The token owner has special privileges through the Ownable interface, such as the ability to transfer ownership.
6. Keep private keys secure and never share them.
7. The `SovranWealthFund.token.json` file should be used as the primary reference for contract details.

## Troubleshooting

- If you encounter gas price issues, try adjusting the `gasPrice` in `hardhat.config.js`
- For RPC connection issues, ensure your Alchemy API key is valid
- If verification fails, check that your PolygonScan API key is correct