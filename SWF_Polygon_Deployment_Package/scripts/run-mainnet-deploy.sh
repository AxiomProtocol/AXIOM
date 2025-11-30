#!/bin/bash

# Deployment script for Sovran Wealth Fund Staking Contracts
echo "Starting Polygon Mainnet deployment..."

# Export all required environment variables directly
export SWF_TOKEN_ADDRESS="0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7"
export LP_TOKEN_ADDRESS="0xb23F5d348fa157393E75Bc80C92516F81786Fc28"
export LP_TOKEN_ADDRESS_USDC="0x7f47199A8a5ff683FeDb86c782adb80eF598D5E0"
export TREASURY_WALLET="0x26a8401287ce33cc4AEb5a106cD6D282a9c2f51D"

# Show all environment variables
echo "Environment variables set:"
echo "SWF_TOKEN_ADDRESS: $SWF_TOKEN_ADDRESS"
echo "LP_TOKEN_ADDRESS: $LP_TOKEN_ADDRESS"
echo "LP_TOKEN_ADDRESS_USDC: $LP_TOKEN_ADDRESS_USDC"
echo "TREASURY_WALLET: $TREASURY_WALLET"

# Run the deployment using the optimized script
echo "Running optimized deployment script..."
npx hardhat run scripts/deploy-combined-contracts.js --network polygon

echo "Deployment completed."