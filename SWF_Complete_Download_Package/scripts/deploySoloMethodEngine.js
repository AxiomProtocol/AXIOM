// scripts/deploySoloMethodEngine.js
// Deploy the SoloMethodEngine contract that provides staking functionality for SWF token

const hre = require("hardhat");
require('dotenv').config();

async function main() {
  try {
    // Get the SWF token contract address
    const swfAddress = process.env.SWF_CONTRACT_ADDRESS || "0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7";
    
    // Main distributor and treasury addresses as defined in the extracted ZIP
    const mainDistributor = "0xCe36333A88c2EA01f28f63131fA7dfa80AD021F6";
    const treasury = "0x26A8401287cE33CC4aeb5a106cd6D282a9C2f51d";
    
    console.log("=== Deploying SoloMethodEngine Contract ===");
    console.log(`SWF Token Address: ${swfAddress}`);
    
    // Get the current gas price from the network and increase it slightly
    const provider = hre.ethers.provider;
    const gasPrice = await provider.getGasPrice();
    const gasPriceGwei = hre.ethers.utils.formatUnits(gasPrice, "gwei");
    console.log(`Current gas price: ${gasPriceGwei} gwei`);
    
    // Set higher gas price to ensure transaction goes through
    // Using at least 30 gwei or 1.5x current price, whichever is higher
    const minGasPrice = hre.ethers.utils.parseUnits("30", "gwei");
    const recommendedGasPrice = gasPrice.mul(15).div(10); // 1.5x current price
    const finalGasPrice = recommendedGasPrice.gt(minGasPrice) ? recommendedGasPrice : minGasPrice;
    const finalGasPriceGwei = hre.ethers.utils.formatUnits(finalGasPrice, "gwei");
    
    console.log(`Using gas price: ${finalGasPriceGwei} gwei`);
    
    // Get the contract factory
    const SoloMethodEngine = await hre.ethers.getContractFactory("contracts/SovranWealthEngine.sol:SoloMethodEngine");
    
    // Deploy the contract with the SWF token address as a parameter
    console.log("Deploying SoloMethodEngine...");
    const engine = await SoloMethodEngine.deploy(swfAddress, {
      gasPrice: finalGasPrice,
      gasLimit: 5000000 // Setting an appropriate gas limit
    });
    
    // Wait for the contract to be deployed
    await engine.deployed();
    
    console.log(`✅ SoloMethodEngine deployed to: ${engine.address}`);
    console.log(`Transaction hash: ${engine.deployTransaction.hash}`);
    
    // Write deployment info to a file
    const fs = require('fs');
    const deploymentInfo = {
      network: hre.network.name,
      soloMethodEngine: {
        address: engine.address,
        transactionHash: engine.deployTransaction.hash,
        timestamp: new Date().toISOString(),
        swfTokenAddress: swfAddress
      }
    };
    
    fs.writeFileSync(
      'soloMethodEngine-deployment.json', 
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("Deployment information saved to soloMethodEngine-deployment.json");
    
    // Wait for a couple of seconds for the transaction to propagate
    console.log("Waiting for transaction to be indexed...");
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    // Verify the contract on Etherscan if not on a local network
    if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
      console.log("Verifying contract on Polygonscan...");
      try {
        await hre.run("verify:verify", {
          address: engine.address,
          constructorArguments: [swfAddress],
        });
        console.log("✅ Contract verified on Polygonscan");
      } catch (error) {
        console.log("❌ Error verifying contract:", error.message);
      }
    }
    
    console.log("=== Deployment Complete ===");
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });