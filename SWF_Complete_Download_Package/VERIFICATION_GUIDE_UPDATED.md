# Sovran Wealth Fund Token Verification Guide

This guide provides step-by-step instructions for verifying the SovranWealthFund token contract on Polygonscan after deployment.

## Prerequisites

Before verification, ensure you have:

1. Deployed the contract to Polygon
2. Saved the contract address
3. Installed the required dependencies:
   - Hardhat
   - @nomiclabs/hardhat-ethers
   - @nomiclabs/hardhat-etherscan

## Contract Details

The SovranWealthFund token is:
- An ERC20 token with 18 decimals
- Has a total supply of 1 billion tokens
- Implements role-based access control
- Supports a multi-asset pegging system with 11 currencies
- Features a dynamic APR staking system
- Contains pausable functionality
- Implements burnable token capabilities

## Verification Steps

### 1. Update the Environment Variables

Ensure your `.env` file contains the following:

```
POLYGONSCAN_API_KEY=your_polygonscan_api_key
ALCHEMY_API_KEY=your_alchemy_api_key
PRIVATE_KEY=your_wallet_private_key
```

### 2. Update Hardhat Config

Make sure your `hardhat.config.js` is properly configured:

```javascript
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    polygon: {
      url: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY]
    },
    polygonMumbai: {
      url: `https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY
  }
};
```

### 3. Verify the Contract

Use the Hardhat verify task with your deployed contract address:

```bash
npx hardhat verify --network polygon TOKEN_ADDRESS
```

Replace `TOKEN_ADDRESS` with your deployed contract address.

### 4. Alternative Verification Methods

If the automatic verification fails, you can:

1. **Use Flatten Method:**

```bash
npx hardhat flatten contracts/SovranWealthFund.sol > SovranWealthFund_flattened.sol
```

Then upload the flattened contract manually on Polygonscan.

2. **Verify Directly on Polygonscan:**
   - Go to your contract address on Polygonscan
   - Click the "Verify and Publish" link
   - Select "Single file" verification method
   - Select the compiler version used (0.8.20)
   - Set optimization to "Yes" with 200 runs
   - Paste the flattened contract code
   - Enter the constructor arguments (none for this contract)
   - Click "Verify and Publish"

## Troubleshooting

If you encounter verification errors:

1. **Ensure compiler versions match** - The contract uses Solidity 0.8.20
2. **Check constructor arguments** - This contract does not need constructor arguments for verification
3. **Verify dependencies** - Ensure all imported contracts are available and their paths are correct
4. **SPDX License** - Make sure license identifiers are included

## Post-Verification

After successful verification:

1. Check that all contract functions appear correctly on Polygonscan
2. Verify token information is correct (name, symbol, total supply)
3. Add token metadata (logo, website, description) on Polygonscan

## Administration

After verification, the contract deployer will have the following roles:
- DEFAULT_ADMIN_ROLE
- MINTER_ROLE
- PAUSER_ROLE
- PEG_MANAGER_ROLE
- RESERVE_MANAGER_ROLE
- TRANSFER_ROLE

Use the admin dashboard to manage these roles and perform administrative functions.