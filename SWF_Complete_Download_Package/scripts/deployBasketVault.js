const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    console.log("Deploying SWFBasketVault...");
    
    // Get the deployer's address
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying from address: ${deployer.address}`);
    
    // Get the token address from the environment variables
    const swfTokenAddress = process.env.SWF_TOKEN_ADDRESS;
    
    if (!swfTokenAddress) {
      throw new Error("SWF_TOKEN_ADDRESS environment variable is not set");
    }
    
    console.log(`Using SWF token address: ${swfTokenAddress}`);
    
    // Deploy the SWFBasketVault contract
    const SWFBasketVault = await ethers.getContractFactory("SWFBasketVault");
    const basketVault = await SWFBasketVault.deploy(swfTokenAddress);
    await basketVault.deployed();
    
    console.log(`SWFBasketVault deployed to: ${basketVault.address}`);
    
    // Save deployment information
    const deploymentInfo = {
      network: network.name,
      swfTokenAddress: swfTokenAddress,
      basketVaultAddress: basketVault.address,
      deploymentTime: new Date().toISOString(),
      deployer: deployer.address
    };
    
    // Create a deployment file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const deploymentPath = path.join(__dirname, `../basket-vault-deployment-${timestamp}.json`);
    
    fs.writeFileSync(
      deploymentPath,
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log(`Deployment information saved to: ${deploymentPath}`);
    
    // Also update the latest deployment file
    const latestDeploymentPath = path.join(__dirname, "../basket-vault-latest.json");
    fs.writeFileSync(
      latestDeploymentPath,
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log(`Latest deployment information saved to: ${latestDeploymentPath}`);
    console.log("\nSWFBasketVault deployment completed successfully!");
    
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