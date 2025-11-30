#!/bin/bash

# Script to verify deployed contracts on PolygonScan
echo "Starting contract verification on PolygonScan..."

# Check if POLYGONSCAN_API_KEY is set
if [ -z "$POLYGONSCAN_API_KEY" ]; then
  echo "Error: POLYGONSCAN_API_KEY environment variable is required but not set."
  exit 1
fi

# Check if deployment file exists
if [ ! -f "staking-modules-latest.json" ]; then
  echo "Error: staking-modules-latest.json not found. Please run the deployment script first."
  exit 1
fi

# Run the verification script
echo "Running verification script..."
npx hardhat run scripts/verify-contracts.js --network polygon

echo "Verification process completed."