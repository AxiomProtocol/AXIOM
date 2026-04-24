#!/usr/bin/env bash
# Verify all 7 AXAU contracts on Arbitrum One (Blockscout / Arbiscan)
set -e

DEPLOYER="0x8d7892CF226B43d48B6e3ce988A1274e6D114C96"
SIGNER2="0x9bE7FCEa316D8e9a09fdD6a67E158A16Acf64f3f"
WETH="0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
ZERO="0x0000000000000000000000000000000000000000"

TOKEN="0xbcCA4D937d427829914498423aE6E04C846dB0Bb"
REGISTRY="0x6D3aAa92793503B40b3F3593d2fCc409Ca610bDa"
GOLDVAULT="0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8"
LANDORACLE="0x8FF5D66d4be4C107362e63f8E9E8283E8c5EA0Fc"
LANDVAULT="0x66Aadce66a359609ec5E18fb3d8927a2363449cf"
NAVENGINE="0x80F8634a43B26a2bd403396A42465F138aeCC519"
CONTROLLER="0x036F05a3fB74d35439c074f25F691b36f5D37792"

echo "=== 1/7  AXAUTokenLite3643 ==="
npx hardhat verify --network arbitrum "$TOKEN" "$DEPLOYER" "$ZERO"

echo "=== 2/7  CommodityRegistry ==="
npx hardhat verify --network arbitrum "$REGISTRY" "$DEPLOYER"

echo "=== 3/7  AXGoldVault ==="
npx hardhat verify --network arbitrum "$GOLDVAULT" "$DEPLOYER" "$WETH"

echo "=== 4/7  LandNAVOracleMultiSig ==="
npx hardhat verify --network arbitrum "$LANDORACLE" \
  --constructor-args scripts/args-landoracle.js

echo "=== 5/7  AXLandVault ==="
npx hardhat verify --network arbitrum "$LANDVAULT" "$DEPLOYER" "$LANDORACLE"

echo "=== 6/7  NAVEngine ==="
npx hardhat verify --network arbitrum "$NAVENGINE" "$DEPLOYER" "$REGISTRY" "$TOKEN"

echo "=== 7/7  MintRedeemController ==="
npx hardhat verify --network arbitrum "$CONTROLLER" \
  "$DEPLOYER" "$TOKEN" "$NAVENGINE" "$REGISTRY" "$DEPLOYER"

echo ""
echo "All verifications submitted."
