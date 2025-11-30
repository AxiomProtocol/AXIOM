const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Deploying SWFSovereignEngine...");
    
    // Get the deployer's address
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying from address: ${deployer.address}`);
    
    // Get the SWF token address (already deployed)
    if (!process.env.SWF_CONTRACT_ADDRESS) {
      throw new Error("SWF_CONTRACT_ADDRESS not set in .env file");
    }
    const swfAddress = process.env.SWF_CONTRACT_ADDRESS;
    console.log(`Using SWF token address: ${swfAddress}`);
    
    // Deploy the SWFSovereignEngine contract
    const SWFSovereignEngine = await ethers.getContractFactory("SWFSovereignEngine");
    const engine = await SWFSovereignEngine.deploy(swfAddress);
    await engine.deployed();
    
    console.log(`SWFSovereignEngine deployed to: ${engine.address}`);
    console.log("");
    
    // Write the deployment information to a file
    const fs = require('fs');
    const deployInfo = {
      network: hre.network.name,
      swfTokenAddress: swfAddress,
      sovereignEngineAddress: engine.address,
      deployerAddress: deployer.address,
      deploymentTime: new Date().toISOString(),
    };
    
    fs.writeFileSync(
      'sovereign-engine-deployment.json',
      JSON.stringify(deployInfo, null, 2)
    );
    
    console.log("Deployment information saved to sovereign-engine-deployment.json");
    console.log("✅ Deployment completed successfully!");
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });