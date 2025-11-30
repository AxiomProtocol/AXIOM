#!/bin/bash

# This script verifies the SovranWealthFund contract on Polygonscan
# using Hardhat and Solidity 0.8.20 for better compatibility

echo "SovranWealthFund Verification using Solidity 0.8.20"
echo "==================================================="
echo "Running verification process..."

# Use the specific 0.8.20 configuration
npx hardhat --config hardhat-0.8.20.config.js run scripts/verify-0.8.20.js

echo "Verification process completed."