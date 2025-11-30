const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    console.log("Deploying DynamicAPRController...");
    
    // Get the deployer's address
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying from address: ${deployer.address}`);
    
    // Get the basket vault address
    const basketVaultInfo = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../basket-vault-latest.json"), "utf8")
    );
    const basketVaultAddress = basketVaultInfo.basketVaultAddress;
    
    // Get the staking contract address from environment variables or use a default for testing
    let stakingContractAddress = process.env.STAKING_CONTRACT_ADDRESS;
    
    if (!stakingContractAddress) {
      console.log("STAKING_CONTRACT_ADDRESS not set, deploying a mock SoloMethodEngine for testing...");
      
      // Deploy a simple mock staking contract for testing
      const MockStaking = await ethers.getContractFactory("contracts/SoloMethodEngine.sol:SoloMethodEngine");
      const mockStaking = await MockStaking.deploy(process.env.SWF_TOKEN_ADDRESS || ethers.constants.AddressZero, deployer.address);
      await mockStaking.deployed();
      
      stakingContractAddress = mockStaking.address;
      console.log(`Mock staking contract deployed to: ${stakingContractAddress}`);
    }
    
    console.log(`Using Basket Vault address: ${basketVaultAddress}`);
    console.log(`Using Staking Contract address: ${stakingContractAddress}`);
    
    // Initial APR (2000 basis points = 20%)
    const initialAPR = 2000;
    
    // Deploy the DynamicAPRController contract
    const DynamicAPRController = await ethers.getContractFactory("DynamicAPRController");
    const controller = await DynamicAPRController.deploy(
      basketVaultAddress,
      stakingContractAddress,
      initialAPR,
      deployer.address
    );
    await controller.deployed();
    
    console.log(`DynamicAPRController deployed to: ${controller.address}`);
    
    // Save deployment information
    const deploymentInfo = {
      network: network.name,
      controllerAddress: controller.address,
      basketVaultAddress: basketVaultAddress,
      stakingContractAddress: stakingContractAddress,
      initialAPR: initialAPR,
      deploymentTime: new Date().toISOString(),
      deployer: deployer.address
    };
    
    // Create a deployment file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const deploymentPath = path.join(__dirname, `../apr-controller-deployment-${timestamp}.json`);
    
    fs.writeFileSync(
      deploymentPath,
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log(`Deployment information saved to: ${deploymentPath}`);
    
    // Also update the latest deployment file
    const latestDeploymentPath = path.join(__dirname, "../apr-controller-latest.json");
    fs.writeFileSync(
      latestDeploymentPath,
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log(`Latest deployment information saved to: ${latestDeploymentPath}`);
    console.log("\nDynamicAPRController deployment completed successfully!");
    
  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error in main execution:", error);
    process.exit(1);
  });