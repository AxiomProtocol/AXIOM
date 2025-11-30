# Sovran Wealth Fund (SWF) - Polygon Mainnet Deployment Guide

This guide provides step-by-step instructions for deploying the SWF ecosystem contracts to Polygon Mainnet.

## Pre-Deployment Checklist

1. **Environment Setup**
   - ✓ Ensure `.env` file is configured with accurate values
   - ✓ Private key of the deployer wallet is secure and has sufficient POL for gas
   - ✓ Alchemy API key is valid and has access to Polygon Mainnet
   - ✓ PolygonScan API key is valid (for contract verification)

2. **Contract Preparation**
   - ✓ All contracts compile without errors
   - ✓ All tests pass successfully
   - ✓ Security audits completed and issues addressed

3. **Addresses Configuration**
   - ✓ SWF token address on Polygon Mainnet (`SWF_TOKEN_ADDRESS`) is set
   - ✓ LP token addresses for both ETH and USDC pairs are set
   - ✓ Treasury wallet address is set

## Step 1: Configure Environment Variables

Ensure your `.env` file contains the following required variables:

```
# Wallet private key for sending transactions
PRIVATE_KEY=your_private_key_here

# API keys for blockchain access
ALCHEMY_API_KEY=your_alchemy_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# Network configuration
NETWORK=polygon
ALCHEMY_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/your_alchemy_key

# SWF token address on Polygon mainnet
SWF_TOKEN_ADDRESS=0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7

# LP token addresses
LP_TOKEN_ADDRESS=0xb23F5d348fa157393E75Bc80C92516F81786Fc28  # SWF/ETH
LP_TOKEN_ADDRESS_USDC=0x7f47199A8a5ff683FeDb86c782adb80eF598D5E0  # SWF/USDC

# Treasury wallet
TREASURY_WALLET=0x26a8401287ce33cc4AEb5a106cD6D282a9c2f51D
```

## Step 2: Deploy Staking Contracts

1. Run the deployment script for the staking contracts:

```bash
npx hardhat run scripts/deploy-staking-contracts.js --network polygon
```

2. The script will:
   - Connect to the Polygon Mainnet
   - Deploy LiquidityVault (ETH), LiquidityVault (USDC), GovernanceDividendPool, and SWFVaultAdapter contracts
   - Save deployment information to JSON files for future reference

3. After deployment, the terminal will display the addresses of the deployed contracts. Save these addresses.

## Step 3: Update Environment Variables

Update your `.env` file with the newly deployed contract addresses:

```
# ETH Liquidity Vault
LIQUIDITY_VAULT_ETH=<deployed_eth_liquidity_vault_address>
# USDC Liquidity Vault
LIQUIDITY_VAULT_USDC=<deployed_usdc_liquidity_vault_address>
# Governance Dividend Pool
GOVERNANCE_POOL=<deployed_governance_pool_address>
# Vault Adapter
VAULT_ADAPTER=<deployed_vault_adapter_address>
```

## Step 4: Verify Contracts on PolygonScan

Verify each contract on PolygonScan to enable users to interact with them through the blockchain explorer:

```bash
# Verify ETH Liquidity Vault
npx hardhat verify --network polygon <eth_liquidity_vault_address> <lp_token_eth_address>

# Verify USDC Liquidity Vault
npx hardhat verify --network polygon <usdc_liquidity_vault_address> <lp_token_usdc_address>

# Verify Governance Dividend Pool
npx hardhat verify --network polygon <governance_pool_address> <swf_token_address> <reward_rate>

# Verify Vault Adapter
npx hardhat verify --network polygon <vault_adapter_address> <swf_token_address> <treasury_address>
```

## Step 5: Deploy Module Integrator (Optional)

If you want to deploy the SWFModuleIntegrator contract:

1. Run the deployment script:

```bash
npx hardhat run scripts/deploy-module-integrator.js --network polygon
```

2. Update your `.env` file with the module integrator address:

```
MODULE_INTEGRATOR_ADDRESS=<deployed_module_integrator_address>
```

3. Verify the contract on PolygonScan:

```bash
npx hardhat verify --network polygon <module_integrator_address> <swf_token_address> <eth_liquidity_vault_address> <governance_pool_address> <vault_adapter_address> <treasury_address>
```

## Step 6: Initialize Contracts

1. **Approve Fund Transfers**:
   - Approve the contracts to spend SWF tokens from your treasury wallet
   - For development testing, allocate small amounts first

2. **Initial Staking**:
   - Provide initial liquidity to the staking pools
   - Seed the governance pool with an initial stake

## Step 7: Configure API Server

Update your API server to use the new contract addresses:

1. Restart your server to pick up the new environment variables
2. Test the API endpoints to ensure they can interact with the deployed contracts
3. Verify that the dashboard displays contract information correctly

## Step 8: Deployment Verification

1. **Dashboard Verification**:
   - Check that the dashboard displays the correct contract addresses
   - Verify that contract balances show correctly

2. **Contract Interactions**:
   - Test staking functionality with a small amount
   - Test withdrawal functionality
   - Test reward distribution

## Step 9: Announce Deployment

Once everything is verified and working correctly:

1. Create an announcement for stakeholders
2. Update documentation with the new contract addresses
3. Start monitoring your deployment

## Troubleshooting

- **Transaction Failures**: Check gas settings and PolyGon network conditions
- **Contract Verification Failures**: Ensure constructor parameters match exactly
- **RPC Connection Issues**: Verify your Alchemy API key and try alternative RPC providers
- **Low Balance Errors**: Ensure you have sufficient POL for gas fees

## Security Considerations

- **Private Key Safety**: Never share or expose your private key
- **Admin Functions**: Use admin functions with caution (e.g., `setAPR`, `forwardToVault`)
- **Fund Transfers**: Always double-check addresses when transferring funds
- **Smart Contract Upgrades**: Plan for future upgrades and contract migrations

## Additional Resources

- [Polygon Documentation](https://docs.polygon.technology/)
- [Hardhat Documentation](https://hardhat.org/hardhat-runner/docs/getting-started)
- [SWF Technical Documentation](MAINNET_MIGRATION_SUMMARY.md)