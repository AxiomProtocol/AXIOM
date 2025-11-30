# Sovran Wealth Fund - Polygon Mainnet Deployment Package

This package contains all the contracts and scripts needed to deploy the SWF staking system to Polygon Mainnet.

## Files Included

- `contracts/` - Smart contract source files
- `scripts/` - Deployment scripts
- `config/` - Configuration files

## Deployment Instructions

1. Copy the config/.env.example file to .env and update with your credentials:
   - ALCHEMY_API_KEY: Your Alchemy API key for Polygon network
   - POLYGONSCAN_API_KEY: Your PolygonScan API key for contract verification
   - PRIVATE_KEY: Your wallet's private key for signing transactions

2. Choose one of the deployment scripts:

   ### Option 1: Using the standard deployment script
   ```
   chmod +x scripts/run-mainnet-deploy.sh
   ./scripts/run-mainnet-deploy.sh
   ```

   ### Option 2: Using the qualified names deployment script (recommended)
   ```
   chmod +x scripts/deploy-qualified.sh
   ./scripts/deploy-qualified.sh
   ```

   The qualified names script resolves the contract ambiguity issues by specifying the exact contract path:
   ```javascript
   const LiquidityVault = await hre.ethers.getContractFactory("contracts/CombinedStakingContracts.sol:LiquidityVault");
   ```

3. After deployment, verify your contracts on PolygonScan:
   ```
   chmod +x scripts/verify-contracts.sh
   ./scripts/verify-contracts.sh
   ```

4. Update your .env file with the new contract addresses.

## Contract Details

### CombinedStakingContracts.sol
Contains three main components:
- LiquidityVault: For staking LP tokens
- GovernanceDividendPool: For SWF staking rewards
- SWFVaultAdapter: Treasury interface

### SWFModules.sol
Contains modular components for the entire SWF ecosystem.

### SovranWealthFund.sol
The main token contract for the SWF ecosystem.
