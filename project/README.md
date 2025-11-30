# SovranWealthFund (SWF) Integration

This project connects to the existing verified SWF token contract on Ethereum Mainnet.

## Project Structure

- `/contracts` - Contains the SovranWealthFund.sol contract source code
- `/abis` - Contains the SWF_abi.json file with the contract's ABI
- `/scripts` - Contains the connectSWF.js script to interact with the contract
- `/config` - Contains configuration settings

## Setup Instructions

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables in .env:
   - `PROVIDER_URL`: Your Ethereum Mainnet provider URL
   - `PRIVATE_KEY`: Your wallet's private key
   - `CONTRACT_ADDRESS`: The verified SWF contract address

3. Run the script:
   ```
   npm start
   ```

## Features

- Connects to the verified SWF token contract
- Reads basic token information (name, symbol, decimals, total supply)
- Can be extended for more advanced interactions

## Important Notes

- This integration uses Ethereum Mainnet (chainId: 1)
- The contract is already deployed and verified
- No redeployment is necessary