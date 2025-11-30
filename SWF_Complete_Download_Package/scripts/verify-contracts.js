// scripts/verify-contracts.js
// Script to verify deployed contracts on PolygonScan

const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Starting contract verification process...");
  
  // Load deployment information
  let deploymentData;
  try {
    deploymentData = JSON.parse(fs.readFileSync('staking-modules-latest.json', 'utf8'));
    console.log("Loaded deployment data from staking-modules-latest.json");
  } catch (error) {
    console.error("Failed to load deployment data:", error);
    process.exit(1);
  }
  
  const {
    liquidityVaultETH,
    liquidityVaultUSDC,
    governancePool,
    vaultAdapter,
    swfToken,
    lpTokenETH,
    lpTokenUSDC,
    treasury
  } = deploymentData;
  
  console.log("Verifying contracts with the following addresses:");
  console.log("- LiquidityVault (ETH):", liquidityVaultETH);
  console.log("- LiquidityVault (USDC):", liquidityVaultUSDC);
  console.log("- GovernanceDividendPool:", governancePool);
  console.log("- SWFVaultAdapter:", vaultAdapter);
  
  // Verify LiquidityVault (ETH)
  console.log("\nVerifying LiquidityVault (ETH)...");
  try {
    await hre.run("verify:verify", {
      address: liquidityVaultETH,
      constructorArguments: [lpTokenETH],
      contract: "contracts/CombinedStakingContracts.sol:LiquidityVault"
    });
    console.log("LiquidityVault (ETH) verified successfully");
  } catch (error) {
    // If already verified, consider it a success
    if (error.message.includes("already verified")) {
      console.log("LiquidityVault (ETH) already verified");
    } else {
      console.error("Failed to verify LiquidityVault (ETH):", error.message);
    }
  }
  
  // Verify LiquidityVault (USDC)
  console.log("\nVerifying LiquidityVault (USDC)...");
  try {
    await hre.run("verify:verify", {
      address: liquidityVaultUSDC,
      constructorArguments: [lpTokenUSDC],
      contract: "contracts/CombinedStakingContracts.sol:LiquidityVault"
    });
    console.log("LiquidityVault (USDC) verified successfully");
  } catch (error) {
    // If already verified, consider it a success
    if (error.message.includes("already verified")) {
      console.log("LiquidityVault (USDC) already verified");
    } else {
      console.error("Failed to verify LiquidityVault (USDC):", error.message);
    }
  }
  
  // Verify GovernanceDividendPool
  console.log("\nVerifying GovernanceDividendPool...");
  try {
    await hre.run("verify:verify", {
      address: governancePool,
      constructorArguments: [swfToken, "10000000000000000"], // 1% monthly reward rate
      contract: "contracts/CombinedStakingContracts.sol:GovernanceDividendPool"
    });
    console.log("GovernanceDividendPool verified successfully");
  } catch (error) {
    // If already verified, consider it a success
    if (error.message.includes("already verified")) {
      console.log("GovernanceDividendPool already verified");
    } else {
      console.error("Failed to verify GovernanceDividendPool:", error.message);
    }
  }
  
  // Verify SWFVaultAdapter
  console.log("\nVerifying SWFVaultAdapter...");
  try {
    await hre.run("verify:verify", {
      address: vaultAdapter,
      constructorArguments: [swfToken, treasury],
      contract: "contracts/CombinedStakingContracts.sol:SWFVaultAdapter"
    });
    console.log("SWFVaultAdapter verified successfully");
  } catch (error) {
    // If already verified, consider it a success
    if (error.message.includes("already verified")) {
      console.log("SWFVaultAdapter already verified");
    } else {
      console.error("Failed to verify SWFVaultAdapter:", error.message);
    }
  }
  
  console.log("\nVerification process completed!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});