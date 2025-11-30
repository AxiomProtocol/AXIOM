// scripts/deploy-solo-method-bsc.js
// Deploy SoloMethodEngine to BSC Mainnet
require('dotenv').config();
const { ethers, network } = require("hardhat");
const fs = require('fs');

async function main() {
  try {
    // Validate network
    if (network.name !== 'bsc') {
      console.error(`You're trying to deploy to ${network.name} instead of BSC`);
      console.error(`Please run: npx hardhat run scripts/deploy-solo-method-bsc.js --network bsc`);
      return;
    }

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying contracts with the account: ${deployer.address}`);
    console.log(`Account balance: ${ethers.utils.formatEther(await deployer.getBalance())} BNB`);

    // Get SWF token address from environment
    const swfTokenAddress = process.env.SWF_TOKEN_ADDRESS;
    if (!swfTokenAddress) {
      throw new Error("SWF_TOKEN_ADDRESS not defined in .env file");
    }
    console.log(`Using SWF token address: ${swfTokenAddress}`);

    // Compile SoloMethodEngine contract
    console.log("Compiling SoloMethodEngine contract...");
    const SoloMethodEngine = await ethers.getContractFactory("SoloMethodEngine");

    // Get gas price
    const gasPrice = await deployer.getGasPrice();
    console.log(`Current gas price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei`);

    // Estimate gas
    const deploymentData = SoloMethodEngine.getDeployTransaction(swfTokenAddress, deployer.address);
    const estimatedGas = await ethers.provider.estimateGas(deploymentData);
    console.log(`Estimated gas for deployment: ${estimatedGas.toString()}`);

    // Deploy the contract
    console.log("Deploying SoloMethodEngine contract...");
    const soloMethodEngine = await SoloMethodEngine.deploy(
      swfTokenAddress,
      deployer.address,
      {
        gasPrice: gasPrice,
        gasLimit: Math.ceil(estimatedGas.toNumber() * 1.2) // Add 20% buffer
      }
    );

    console.log("Waiting for deployment transaction to be mined...");
    await soloMethodEngine.deployed();

    // Log deployment details
    console.log("SoloMethodEngine deployed successfully!");
    console.log(`Contract address: ${soloMethodEngine.address}`);
    console.log(`Transaction hash: ${soloMethodEngine.deployTransaction.hash}`);
    
    // Add contract address to environment variables
    updateEnvFile(soloMethodEngine.address);

    // Save deployment info to file
    const deploymentInfo = {
      network: network.name,
      chainId: network.config.chainId,
      soloMethodEngine: {
        address: soloMethodEngine.address,
        deploymentTransaction: soloMethodEngine.deployTransaction.hash,
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        swfTokenAddress: swfTokenAddress
      }
    };

    // Save to file
    fs.writeFileSync(
      'solo-method-deployment.json',
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("Deployment information saved to solo-method-deployment.json");

    // Wait for better etherscan indexing
    console.log("Waiting 30 seconds for BSCScan indexing...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Verify the contract on BSCScan
    if (process.env.BSCSCAN_API_KEY) {
      console.log("Verifying contract on BSCScan...");
      try {
        await hre.run("verify:verify", {
          address: soloMethodEngine.address,
          constructorArguments: [swfTokenAddress, deployer.address],
          network: network.name
        });
        console.log("Contract verified on BSCScan!");
      } catch (error) {
        console.error("Error verifying contract:", error);
      }
    } else {
      console.log("Skipping BSCScan verification (BSCSCAN_API_KEY not found)");
    }

    console.log("=== Deployment Complete ===");
    console.log(`SoloMethodEngine: ${soloMethodEngine.address}`);
    console.log(`Current APR: ${await soloMethodEngine.getAPR()}%`);
    console.log("");
    console.log("Next steps:");
    console.log("1. Add the contract address to your frontend code");
    console.log("2. Update the SOLO_METHOD_ENGINE_ADDRESS in the .env file");
    console.log("3. Test staking functionality on the BSC Mainnet");

  } catch (error) {
    console.error("Deployment failed with error:", error);
    process.exit(1);
  }
}

// Updates .env file with new contract address
function updateEnvFile(contractAddress) {
  try {
    // Read current .env content
    let envContent = fs.readFileSync('.env', 'utf8');
    
    // Check if SOLO_METHOD_ENGINE_ADDRESS already exists
    if (envContent.includes('SOLO_METHOD_ENGINE_ADDRESS=')) {
      // Replace existing entry
      envContent = envContent.replace(
        /SOLO_METHOD_ENGINE_ADDRESS=.*/,
        `SOLO_METHOD_ENGINE_ADDRESS=${contractAddress}`
      );
    } else {
      // Add new entry
      envContent += `\nSOLO_METHOD_ENGINE_ADDRESS=${contractAddress}`;
    }
    
    // Write updated content back to .env
    fs.writeFileSync('.env', envContent);
    console.log(`Updated .env file with SOLO_METHOD_ENGINE_ADDRESS=${contractAddress}`);
  } catch (error) {
    console.error("Error updating .env file:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });