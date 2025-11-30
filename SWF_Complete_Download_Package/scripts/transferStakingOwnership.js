const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    console.log("Transferring SoloMethodEngine ownership to DynamicAPRController...");
    
    // Get the deployer's address
    const [deployer] = await ethers.getSigners();
    console.log(`Executing from address: ${deployer.address}`);
    
    // Get the staking contract address
    const stakingContractAddress = process.env.STAKING_CONTRACT_ADDRESS;
    if (!stakingContractAddress) {
      throw new Error("STAKING_CONTRACT_ADDRESS environment variable is not set");
    }
    
    // Get the DynamicAPRController address
    const aprControllerPath = path.join(__dirname, "../apr-controller-latest.json");
    if (!fs.existsSync(aprControllerPath)) {
      throw new Error("DynamicAPRController deployment information not found. Please deploy the controller first.");
    }
    
    const controllerInfo = JSON.parse(fs.readFileSync(aprControllerPath, "utf8"));
    const aprControllerAddress = controllerInfo.controllerAddress;
    
    console.log(`Staking contract address: ${stakingContractAddress}`);
    console.log(`APR controller address: ${aprControllerAddress}`);
    
    // Connect to the staking contract
    const SoloMethodEngine = await ethers.getContractFactory("contracts/SoloMethodEngine.sol:SoloMethodEngine");
    const stakingContract = SoloMethodEngine.attach(stakingContractAddress);
    
    // Check the current owner
    const currentOwner = await stakingContract.owner();
    console.log(`Current owner of staking contract: ${currentOwner}`);
    
    if (currentOwner.toLowerCase() === aprControllerAddress.toLowerCase()) {
      console.log("DynamicAPRController is already the owner of the staking contract. No action needed.");
      return;
    }
    
    // Transfer ownership
    console.log("Transferring ownership...");
    const tx = await stakingContract.transferOwnership(aprControllerAddress);
    await tx.wait();
    
    // Verify the new owner
    const newOwner = await stakingContract.owner();
    console.log(`New owner of staking contract: ${newOwner}`);
    
    if (newOwner.toLowerCase() === aprControllerAddress.toLowerCase()) {
      console.log("\n✅ Ownership transfer completed successfully!");
    } else {
      console.error("\n❌ Ownership transfer failed: new owner doesn't match expected address");
    }
    
  } catch (error) {
    console.error("Ownership transfer failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error in main execution:", error);
    process.exit(1);
  });