const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Deploying SWFIntegratedEngine...");
    
    // Get the deployer's address
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying from address: ${deployer.address}`);
    
    // Get the SWF token address (already deployed)
    if (!process.env.SWF_CONTRACT_ADDRESS) {
      throw new Error("SWF_CONTRACT_ADDRESS not set in .env file");
    }
    const swfAddress = process.env.SWF_CONTRACT_ADDRESS;
    console.log(`Using SWF token address: ${swfAddress}`);
    
    // Deploy the SWFIntegratedEngine contract
    const SWFIntegratedEngine = await ethers.getContractFactory("SWFIntegratedEngine");
    const engine = await SWFIntegratedEngine.deploy(swfAddress);
    await engine.deployed();
    
    console.log(`SWFIntegratedEngine deployed to: ${engine.address}`);
    console.log("");
    
    // Load the SWF token contract
    const SovranWealthFund = await ethers.getContractFactory("SovranWealthFund");
    const swfToken = await SovranWealthFund.attach(swfAddress);
    
    // Grant the MINTER_ROLE to the engine
    console.log("Granting MINTER_ROLE to the integrated engine...");
    
    // Check if the deployer has the DEFAULT_ADMIN_ROLE in the token contract
    const DEFAULT_ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""));
    const hasAdminRole = await swfToken.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
    
    if (!hasAdminRole) {
      console.log("⚠️ WARNING: Deployer does not have DEFAULT_ADMIN_ROLE in the token contract.");
      console.log("Please ensure the engine gets the MINTER_ROLE to be able to distribute rewards.");
    } else {
      const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
      const tx = await swfToken.grantRole(MINTER_ROLE, engine.address);
      await tx.wait();
      console.log("✅ MINTER_ROLE granted to the integrated engine.");
    }
    
    // Write the deployment information to a file
    const fs = require('fs');
    const deployInfo = {
      network: hre.network.name,
      swfTokenAddress: swfAddress,
      integratedEngineAddress: engine.address,
      deployerAddress: deployer.address,
      deploymentTime: new Date().toISOString(),
    };
    
    fs.writeFileSync(
      'integrated-engine-deployment.json',
      JSON.stringify(deployInfo, null, 2)
    );
    
    console.log("Deployment information saved to integrated-engine-deployment.json");
    console.log("");
    console.log("=======================================");
    console.log("Next steps:");
    console.log("1. Update the .env file with the new engine address:");
    console.log(`   INTEGRATED_ENGINE_ADDRESS=${engine.address}`);
    console.log("2. Run tests to verify the deployment:");
    console.log("   npx hardhat test scripts/testIntegratedEngine.js --network <network>");
    console.log("=======================================");
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