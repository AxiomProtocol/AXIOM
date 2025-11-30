// Deployment script for Polygon mainnet
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  try {
    // Get the deployment account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Get balance and display in a readable format
    const balance = await deployer.getBalance();
    console.log("Account balance:", ethers.utils.formatEther(balance), "POL");
    
    if (balance.eq(0)) {
      console.error("ERROR: Account has no POL tokens. Please fund your account first.");
      return;
    }
    
    // Calculate maximum gas we can afford (leaving 10% buffer for safety)
    const maxGasAffordable = balance.mul(90).div(100).div(ethers.utils.parseUnits("25", "gwei"));
    console.log("Max affordable gas units:", maxGasAffordable.toString());
    
    // Deploy with minimal settings
    console.log("Deploying SovranWealthFund token...");
    const SovranWealthFund = await ethers.getContractFactory("SovranWealthFund");
    
    const deploymentParams = {
      gasPrice: ethers.utils.parseUnits("25", "gwei"),
      gasLimit: 4500000 // Estimated from previous deployment attempts + small buffer
    };
    
    console.log(`Deployment parameters:
- Gas price: 25 gwei
- Gas limit: ${deploymentParams.gasLimit}`);
    
    // Calculate max cost in POL
    const maxCost = ethers.utils.formatEther(
      ethers.BigNumber.from(deploymentParams.gasLimit).mul(deploymentParams.gasPrice)
    );
    console.log(`Maximum deployment cost: ${maxCost} POL`);
    
    // Deploy the contract
    const token = await SovranWealthFund.deploy(deploymentParams);
    console.log("Deployment transaction sent:", token.deployTransaction.hash);
    console.log("Waiting for confirmation (this may take several minutes)...");
    
    // Wait for deployment to complete
    await token.deployed();
    
    // Display success info
    console.log("-----------------------------------");
    console.log("DEPLOYMENT SUCCESSFUL!");
    console.log("-----------------------------------");
    console.log("Contract address:", token.address);
    console.log("Block number:", token.deployTransaction.blockNumber);
    console.log("Transaction hash:", token.deployTransaction.hash);
    console.log("Gas used:", token.deployTransaction.gasLimit.toString());
    
    // Save to a file for easy reference
    const fs = require("fs");
    const deploymentInfo = {
      network: "Polygon Mainnet",
      contractAddress: token.address,
      txHash: token.deployTransaction.hash,
      deployedBy: deployer.address,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(
      "deployment-polygon.json", 
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("Deployment information saved to deployment-polygon.json");
    
  } catch (error) {
    console.error("Deployment failed:", error.message);
    // Show more detailed error info for debugging
    if (error.error) {
      console.error("Error details:", error.error);
    }
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });