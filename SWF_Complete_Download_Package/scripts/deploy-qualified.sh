#!/bin/bash

# Script to deploy SWF contracts with qualified paths to Polygon Mainnet
echo "Starting deployment to Polygon Mainnet using qualified paths..."

# Check if required environment variables are set
if [ -z "$PRIVATE_KEY" ]; then
  echo "Error: PRIVATE_KEY environment variable is required but not set."
  exit 1
fi

if [ -z "$ALCHEMY_API_KEY" ]; then
  echo "Error: ALCHEMY_API_KEY environment variable is required but not set."
  exit 1
fi

if [ -z "$POLYGONSCAN_API_KEY" ]; then
  echo "Warning: POLYGONSCAN_API_KEY environment variable is not set. Contract verification will not be possible."
fi

# Check if LP token addresses are set
if [ -z "$LP_TOKEN_ADDRESS" ]; then
  echo "Error: LP_TOKEN_ADDRESS environment variable is required but not set."
  exit 1
fi

if [ -z "$LP_TOKEN_ADDRESS_USDC" ]; then
  echo "Error: LP_TOKEN_ADDRESS_USDC environment variable is required but not set."
  exit 1
fi

# Check if SWF token address is set
if [ -z "$SWF_TOKEN_ADDRESS" ]; then
  echo "Error: SWF_TOKEN_ADDRESS environment variable is required but not set."
  exit 1
fi

# Run the deployment script
echo "Running deployment script with qualified paths..."
npx hardhat run scripts/deploy-qualified.js --network polygon

# Check if deployment was successful
if [ $? -eq 0 ]; then
  echo "Deployment completed successfully!"
  echo "You can now verify the contracts on PolygonScan by running:"
  echo "chmod +x scripts/verify-contracts.sh"
  echo "./scripts/verify-contracts.sh"
else
  echo "Deployment failed. Please check the error messages above."
  exit 1
fi