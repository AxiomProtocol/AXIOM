# SovranWealthFund (SWF) Deployment Instructions

This guide covers how to deploy the SovranWealthFund token contract to Ethereum Mainnet.

## Prerequisites

1. Ethereum wallet with:
   - ETH for gas fees (recommend at least 0.1 ETH)
   - Private key accessible for deployment
   
2. Infura API key or other Ethereum RPC endpoint

## Setup Instructions

1. **Environment Variables**

   Copy the example environment file and add your credentials:
   ```
   cp .env.example .env
   ```
   
   Edit `.env` to include your:
   - `MAINNET_RPC_URL`: Your Ethereum Mainnet RPC URL
   - `PRIVATE_KEY`: Your wallet's private key (keep this secure!)

2. **Install Dependencies**

   ```
   npm install
   ```

3. **Compile Contract**

   ```
   npx hardhat compile
   ```
   
   This will create the artifacts directory with:
   `./artifacts/contracts/SovranWealthFund.sol/Sovran_Wealth_Fund.json`

## Deployment Process

1. **Review Router Address**

   In `DeploySovranWealthFund.js`, verify the router address:
   ```javascript
   const UNISWAP_V2_ROUTER_MAINNET = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
   ```
   
   Adjust if you're using a different DEX or router.

2. **Deploy Contract**

   ```
   node DeploySovranWealthFund.js
   ```

3. **Verify Deployment**

   After deployment completes, you'll receive:
   - Contract address
   - Confirmation of afterConstructor() initialization

## Important Notes

- **Mainnet Only**: This script is configured for Ethereum Mainnet deployment
- **Uniswap Integration**: The contract is configured to work with Uniswap V2 by default
- **Gas Costs**: Deployment can be expensive, ensure you have sufficient ETH

## Post-Deployment Steps

After deployment:

1. Verify the contract on Etherscan
2. Set up liquidity pools
3. Configure additional contract parameters (optional)
4. Transfer ownership if needed

## Troubleshooting

If you encounter issues:

- Ensure your private key and RPC URL are correct
- Check you have sufficient ETH for gas
- Verify your artifacts directory contains the compiled contract