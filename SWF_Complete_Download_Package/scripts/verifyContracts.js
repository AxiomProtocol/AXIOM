// Script to verify contracts on Polygonscan
require("dotenv").config();
const { run, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    console.log(`Starting contract verification on ${network.name}...`);

    // Load deployment data
    let deploymentData;
    try {
      const latestDeploymentPath = path.join(__dirname, "../dynamic-system-latest.json");
      deploymentData = JSON.parse(fs.readFileSync(latestDeploymentPath, "utf8"));
      console.log(`Loaded deployment data from ${latestDeploymentPath}`);
    } catch (error) {
      console.error("Failed to load deployment data:", error);
      process.exit(1);
    }

    // Check if the network matches
    if (deploymentData.network !== network.name) {
      console.warn(`WARNING: Deployment was on ${deploymentData.network} but current network is ${network.name}`);
      const proceed = await askToProceed();
      if (!proceed) {
        console.log("Verification cancelled");
        process.exit(0);
      }
    }

    // Extract contract addresses
    const swfTokenAddress = deploymentData.contracts.swfToken.address;
    const basketVaultAddress = deploymentData.contracts.swfBasketVault.address;
    const soloMethodEngineAddress = deploymentData.contracts.soloMethodEngine.address;
    const dynamicAPRControllerAddress = deploymentData.contracts.dynamicAPRController.address;
    const initialAPR = deploymentData.contracts.dynamicAPRController.initialAPR;

    console.log("Contract addresses to verify:");
    console.log(`- SWFBasketVault: ${basketVaultAddress}`);
    console.log(`- SoloMethodEngine: ${soloMethodEngineAddress}`);
    console.log(`- DynamicAPRController: ${dynamicAPRControllerAddress}`);

    // 1. Verify SWFBasketVault
    console.log("\n1. Verifying SWFBasketVault...");
    try {
      await run("verify:verify", {
        address: basketVaultAddress,
        contract: "contracts/SWFBasketVault.sol:SWFBasketVault",
        constructorArguments: [swfTokenAddress]
      });
      console.log("SWFBasketVault verified successfully");
    } catch (error) {
      console.error("Failed to verify SWFBasketVault:", error.message);
    }

    // 2. Verify SoloMethodEngine
    console.log("\n2. Verifying SoloMethodEngine...");
    try {
      await run("verify:verify", {
        address: soloMethodEngineAddress,
        contract: "contracts/SoloMethodEngine.sol:SoloMethodEngine",
        constructorArguments: [swfTokenAddress, deploymentData.deployer]
      });
      console.log("SoloMethodEngine verified successfully");
    } catch (error) {
      console.error("Failed to verify SoloMethodEngine:", error.message);
    }

    // 3. Verify DynamicAPRController
    console.log("\n3. Verifying DynamicAPRController...");
    try {
      await run("verify:verify", {
        address: dynamicAPRControllerAddress,
        contract: "contracts/DynamicAPRController.sol:DynamicAPRController",
        constructorArguments: [
          basketVaultAddress,
          soloMethodEngineAddress,
          initialAPR,
          deploymentData.deployer
        ]
      });
      console.log("DynamicAPRController verified successfully");
    } catch (error) {
      console.error("Failed to verify DynamicAPRController:", error.message);
    }

    console.log("\nVerification process completed");

  } catch (error) {
    console.error("Unexpected error during verification:", error);
    process.exitCode = 1;
  }
}

// Helper function to ask for confirmation
async function askToProceed() {
  return true; // Always proceed in automated environment
}

// Run the verification
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error during verification:", error);
    process.exit(1);
  });