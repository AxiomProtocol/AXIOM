#!/bin/bash
# Polygon Mainnet Deployment Script for Sovran Wealth Fund (SWF)
# This script automates the deployment process for SWF contracts to Polygon Mainnet

set -e

# Print colored text
print_green() {
  echo -e "\e[32m$1\e[0m"
}

print_yellow() {
  echo -e "\e[33m$1\e[0m"
}

print_red() {
  echo -e "\e[31m$1\e[0m"
}

print_blue() {
  echo -e "\e[34m$1\e[0m"
}

# Check if .env file exists
if [ ! -f .env ]; then
  print_red "Error: .env file not found. Please create one with the required variables."
  exit 1
fi

# Source .env file
source .env

# Check required environment variables
required_vars=(
  "PRIVATE_KEY"
  "ALCHEMY_API_KEY"
  "POLYGONSCAN_API_KEY"
  "NETWORK"
  "SWF_TOKEN_ADDRESS"
  "LP_TOKEN_ADDRESS"
  "LP_TOKEN_ADDRESS_USDC"
  "TREASURY_WALLET"
)

missing_vars=0
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    print_red "Error: $var environment variable is required but not set."
    missing_vars=1
  fi
done

if [ $missing_vars -eq 1 ]; then
  exit 1
fi

# Pre-deployment checks
print_blue "==== Starting Pre-deployment Checks ===="
print_yellow "Compiling contracts..."
npx hardhat compile
if [ $? -ne 0 ]; then
  print_red "Error: Contract compilation failed."
  exit 1
fi
print_green "✓ Contract compilation successful!"

# Deployment of Staking Contracts
print_blue "==== Deploying Staking Contracts ===="
print_yellow "Running deploy-staking-contracts.js script..."
npx hardhat run scripts/deploy-staking-contracts.js --network polygon

# Check if the deployment was successful
if [ $? -ne 0 ]; then
  print_red "Error: Staking contracts deployment failed."
  exit 1
fi
print_green "✓ Staking contracts deployed successfully!"

# Source .env again to get updated contract addresses (assumed to be updated by the deployment script)
source .env

# Verify if addresses are set
print_yellow "Checking if contract addresses are set in .env..."
if [ -z "$LIQUIDITY_VAULT_ETH" ] || [ -z "$LIQUIDITY_VAULT_USDC" ] || [ -z "$GOVERNANCE_POOL" ] || [ -z "$VAULT_ADAPTER" ]; then
  print_red "Error: One or more contract addresses are not set after deployment."
  print_red "Please manually set LIQUIDITY_VAULT_ETH, LIQUIDITY_VAULT_USDC, GOVERNANCE_POOL, VAULT_ADAPTER in your .env file."
  print_yellow "Addresses should be available in the staking-modules-latest.json file."
  exit 1
fi
print_green "✓ Contract addresses are set!"

# Contract verification
print_blue "==== Verifying Contracts on PolygonScan ===="
print_yellow "This step requires the POLYGONSCAN_API_KEY to be set correctly."

print_yellow "Verifying ETH Liquidity Vault..."
npx hardhat verify --network polygon $LIQUIDITY_VAULT_ETH $LP_TOKEN_ADDRESS

print_yellow "Verifying USDC Liquidity Vault..."
npx hardhat verify --network polygon $LIQUIDITY_VAULT_USDC $LP_TOKEN_ADDRESS_USDC

print_yellow "Verifying Governance Dividend Pool..."
# Assuming MONTHLY_REWARD_RATE is set in .env, otherwise use 10000000000000000 (1%)
REWARD_RATE=${MONTHLY_REWARD_RATE:-10000000000000000}
npx hardhat verify --network polygon $GOVERNANCE_POOL $SWF_TOKEN_ADDRESS $REWARD_RATE

print_yellow "Verifying Vault Adapter..."
npx hardhat verify --network polygon $VAULT_ADAPTER $SWF_TOKEN_ADDRESS $TREASURY_WALLET

print_green "✓ Contract verification completed!"

# Deploy Module Integrator (Optional)
print_blue "==== Would you like to deploy the Module Integrator? (y/n) ===="
read -p "Deploy Module Integrator? (y/n): " deploy_integrator
if [[ $deploy_integrator == "y" || $deploy_integrator == "Y" ]]; then
  print_yellow "Running deploy-module-integrator.js script..."
  npx hardhat run scripts/deploy-module-integrator.js --network polygon
  
  # Source .env again to get updated MODULE_INTEGRATOR_ADDRESS
  source .env
  
  if [ -z "$MODULE_INTEGRATOR_ADDRESS" ]; then
    print_red "Module Integrator address not found in .env."
    print_red "Please manually set MODULE_INTEGRATOR_ADDRESS in your .env file."
    print_yellow "The address should be available in the module-integrator-deployment-*.json file."
  else
    print_yellow "Verifying Module Integrator..."
    npx hardhat verify --network polygon $MODULE_INTEGRATOR_ADDRESS $SWF_TOKEN_ADDRESS $LIQUIDITY_VAULT_ETH $GOVERNANCE_POOL $VAULT_ADAPTER $TREASURY_WALLET
    print_green "✓ Module Integrator verification completed!"
  fi
fi

# Final Summary
print_blue "==== Deployment Summary ===="
print_green "Deployment to Polygon Mainnet completed successfully!"
print_yellow "Contract Addresses:"
echo "- SWF Token: $SWF_TOKEN_ADDRESS"
echo "- Liquidity Vault (ETH): $LIQUIDITY_VAULT_ETH"
echo "- Liquidity Vault (USDC): $LIQUIDITY_VAULT_USDC"
echo "- Governance Dividend Pool: $GOVERNANCE_POOL"
echo "- Vault Adapter: $VAULT_ADAPTER"
if [ ! -z "$MODULE_INTEGRATOR_ADDRESS" ]; then
  echo "- Module Integrator: $MODULE_INTEGRATOR_ADDRESS"
fi

print_blue "==== Next Steps ===="
print_yellow "1. Initialize contracts with initial liquidity"
print_yellow "2. Test contract interactions (staking, withdrawal, rewards)"
print_yellow "3. Monitor contract activity on PolygonScan"
print_yellow "4. Update frontend to interact with the deployed contracts"

print_green "Refer to MAINNET_DEPLOYMENT_GUIDE.md for detailed instructions."

exit 0