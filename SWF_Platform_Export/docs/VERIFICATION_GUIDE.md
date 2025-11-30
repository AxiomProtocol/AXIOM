# SWF Token Verification Guide

This guide provides detailed instructions for deploying and verifying the SWF Token on the Polygon network.

## Prerequisites

Before starting the verification process, you need:

1. A Polygon Mainnet RPC URL (or Mumbai Testnet for testing)
2. A Polygonscan API Key
3. The private key of the deployment account
4. Sufficient MATIC for gas fees

## Deployment Process

### Step 1: Prepare Environment Variables

1. Navigate to the `SWF_Verified_Token` directory
2. Copy the `.env.example` file to create a `.env` file:
   ```bash
   cp .env.example .env
   ```
3. Edit the `.env` file with your specific values:
   ```
   # Network Information
   POLYGON_RPC_URL=https://polygon-rpc.com
   MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com

   # Deployment Account
   PRIVATE_KEY=your_private_key_here

   # API Keys
   POLYGONSCAN_API_KEY=your_polygonscan_api_key_here

   # Contract Parameters
   INITIAL_SUPPLY=1000000000
   ADMIN_ADDRESS=your_admin_address_here
   MINTER_ADDRESS=your_minter_address_here
   PAUSER_ADDRESS=your_pauser_address_here
   ```

### Step 2: Install Dependencies

Install all required Node.js dependencies:

```bash
cd SWF_Verified_Token
npm install
```

### Step 3: Compile the Contract

Compile the token contract to ensure it builds correctly:

```bash
npm run compile
```

This will generate all the necessary artifacts in the `artifacts` directory.

### Step 4: Deploy the Contract

Deploy to the Polygon Mumbai Testnet first for testing:

```bash
npm run deploy:test
```

Once you've verified everything works correctly on the testnet, deploy to Polygon Mainnet:

```bash
npm run deploy
```

The deployment script will:
1. Deploy the SWF token contract
2. Set up the initial roles (Admin, Minter, Pauser)
3. Add BTC and XRP to the pegged assets (if oracle addresses are provided)
4. Save the deployment information to a file

### Step 5: Verify the Contract

After deployment, the contract needs to be verified on Polygonscan. There are two methods:

#### Method 1: Direct Hardhat Verification

Use the Hardhat verify command:

```bash
# For Testnet
npm run verify:test DEPLOYED_CONTRACT_ADDRESS

# For Mainnet
npm run verify DEPLOYED_CONTRACT_ADDRESS
```

Replace `DEPLOYED_CONTRACT_ADDRESS` with your deployed contract address.

#### Method 2: Web Interface Verification

1. Access the verification interface at `/admin/verification.html`
2. Enter the deployed contract address and select the correct network
3. Click "Submit Verification Request"
4. Use the GUID provided to check the verification status

## Contract Verification Status

The verification process can take a few minutes. You can check the status by:

1. Using the verification interface to check the status by GUID
2. Directly visiting Polygonscan and searching for your contract address
3. Checking the console output from the Hardhat verification command

## Troubleshooting

### Compiler Version Mismatch

If you encounter a compiler version mismatch, ensure that the compiler version in `hardhat.config.js` matches the one used in the contract:

```javascript
solidity: {
  version: "0.8.17",
  // ...
}
```

### Missing Source Files

If verification fails with "Source file not found", ensure that all imported contracts are accessible and correctly referenced.

### Flattening the Contract

In some cases, you may need to flatten the contract before verification:

```bash
npx hardhat flatten contracts/SovranWealthFund.sol > SovranWealthFundFlat.sol
```

Then, manually verify using the flattened contract on Polygonscan.

## After Verification

Once successfully verified:

1. Your contract code will be visible on Polygonscan
2. The "Read Contract" and "Write Contract" tabs will be available
3. Users can interact with your contract directly through Polygonscan
4. The verification status will be updated in the SWF token info file

## Next Steps

After verification, you should:

1. Test the token functionality on the live network
2. Set up additional pegged assets with oracle addresses
3. Configure the APR for staking rewards
4. Transfer necessary roles to secure multi-sig wallets
5. Update the documentation with the verified contract address