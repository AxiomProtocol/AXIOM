// Script to adjust the APR based on vault deposits
require("dotenv").config();
const { ethers } = require("hardhat");
const cron = require("node-cron");

async function adjustAPR() {
  try {
    console.log("==== APR Adjustment - " + new Date().toISOString() + " ====");
    
    // Get the account that will interact with the contracts
    const [signer] = await ethers.getSigners();
    console.log("Using account:", signer.address);
    
    // Get contract addresses from .env file
    const aprControllerAddress = process.env.DYNAMIC_APR_CONTROLLER_ADDRESS;
    const vaultAddress = process.env.SWF_BASKET_VAULT_ADDRESS;
    const stakingAddress = process.env.SOLO_METHOD_ENGINE_ADDRESS;
    
    if (!aprControllerAddress || !vaultAddress || !stakingAddress) {
      throw new Error("Missing contract addresses in .env file");
    }
    
    // Connect to the contracts
    const aprController = await ethers.getContractAt("DynamicAPRController", aprControllerAddress);
    const vault = await ethers.getContractAt("SWFBasketVault", vaultAddress);
    const stakingEngine = await ethers.getContractAt("SoloMethodEngine", stakingAddress);
    
    // Get current information
    const aprInfo = await aprController.getAPRInfo();
    const currentAPR = aprInfo[0];
    const nextAdjustmentTime = aprInfo[1];
    const totalDeposited = aprInfo[2];
    
    console.log("Current APR:", currentAPR.toNumber() / 100, "%");
    console.log("Next adjustment time:", new Date(nextAdjustmentTime.toNumber() * 1000).toISOString());
    console.log("Total deposited in vault:", ethers.utils.formatEther(totalDeposited));
    
    // Check if adjustment is allowed
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime < nextAdjustmentTime.toNumber()) {
      const timeRemaining = nextAdjustmentTime.toNumber() - currentTime;
      console.log(`Cannot adjust APR yet. ${timeRemaining} seconds remaining until next adjustment.`);
      return;
    }
    
    // Perform APR adjustment
    console.log("Adjusting APR...");
    const tx = await aprController.adjustAPR();
    console.log("Waiting for transaction to be mined...");
    await tx.wait();
    console.log("APR adjustment successful! Transaction hash:", tx.hash);
    
    // Get updated APR
    const stakingAPR = await stakingEngine.aprBasisPoints();
    const updatedAPRInfo = await aprController.getAPRInfo();
    
    console.log("\n=== UPDATED APR INFO ===");
    console.log("New APR:", updatedAPRInfo[0].toNumber() / 100, "%");
    console.log("Current staking APR:", stakingAPR.toNumber() / 100, "%");
    console.log("Next adjustment time:", new Date(updatedAPRInfo[1].toNumber() * 1000).toISOString());
    
    console.log("APR adjustment completed successfully!");
    
  } catch (error) {
    console.error("Error during APR adjustment:", error);
  }
}

// If run directly, adjust APR once
if (require.main === module) {
  adjustAPR()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Unhandled error:", error);
      process.exit(1);
    });
}

// Export for use in scheduled jobs
module.exports = {
  adjustAPR,
  // Function to schedule daily APR adjustments at midnight
  scheduleAdjustments: () => {
    // Schedule to run daily at midnight
    cron.schedule("0 0 * * *", async () => {
      console.log("Running scheduled APR adjustment...");
      await adjustAPR();
    });
    console.log("APR adjustments scheduled to run daily at midnight");
  }
};