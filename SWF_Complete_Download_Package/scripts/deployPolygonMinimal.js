// Minimal deployment script for Polygon mainnet
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  try {
    // Get the deployment account
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    
    // Get balance and display in a readable format
    const balance = await deployer.getBalance();
    const balanceInPOL = ethers.utils.formatEther(balance);
    console.log("Account balance:", balanceInPOL, "POL");
    
    if (balance.eq(0)) {
      console.error("ERROR: Account has no POL tokens. Please fund your account first.");
      return;
    }
    
    // Deploy with minimal gas settings
    console.log("Compiling contract...");
    await hre.run("compile");
    
    console.log("Preparing deployment with ultra-minimal settings...");
    const SovranWealthFund = await ethers.getContractFactory("contracts/SovranWealthFund.sol:SovranWealthFund");
    
    // Use minimum required gas price (25 gwei)
    const gasPrice = ethers.utils.parseUnits("25", "gwei");
    
    // Reduce gas limit further, around 4.2 million should be enough
    const gasLimit = 4200000;
    
    // Calculate expected cost
    const deploymentCost = ethers.utils.formatEther(
      ethers.BigNumber.from(gasLimit).mul(gasPrice)
    );
    console.log(`Estimated deployment cost: ${deploymentCost} POL (${gasLimit} gas at ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei)`);
    
    if (parseFloat(deploymentCost) > parseFloat(balanceInPOL) * 0.9) {
      console.error(`ERROR: Insufficient funds. Need at least ${deploymentCost} POL but have ${balanceInPOL} POL`);
      return;
    }
    
    console.log("Deploying contract, this may take several minutes...");
    
    // Option 1: Deploy with explicit overrides
    const deploymentOptions = {
      gasPrice: gasPrice,
      gasLimit: gasLimit
    };
    
    // Deploy with reduced transaction parameters
    const tokenContract = await SovranWealthFund.deploy(deploymentOptions);
    
    console.log("Transaction sent:", tokenContract.deployTransaction.hash);
    console.log("Waiting for confirmation (this may take a few minutes on Polygon mainnet)...");
    
    // Wait with extended timeout
    const deployedToken = await tokenContract.deployed();
    
    // Log deployment details
    console.log("-----------------------------------------------");
    console.log("CONTRACT DEPLOYED SUCCESSFULLY!");
    console.log("-----------------------------------------------");
    console.log("Contract address:", deployedToken.address);
    console.log("Transaction hash:", tokenContract.deployTransaction.hash);
    console.log("Block number:", tokenContract.deployTransaction.blockNumber);
    console.log("Gas used:", tokenContract.deployTransaction.gasLimit.toString());
    
    // Save to a file
    const fs = require("fs");
    const deploymentInfo = {
      network: "Polygon Mainnet",
      contractAddress: deployedToken.address,
      txHash: tokenContract.deployTransaction.hash,
      timestamp: new Date().toISOString(),
      deployedBy: deployer.address
    };
    
    fs.writeFileSync(
      "polygon-mainnet-deployment.json", 
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("Deployment information saved to polygon-mainnet-deployment.json");
    console.log("You can now verify the contract on Polygonscan");
    
  } catch (error) {
    console.error("Deployment failed with error:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    if (error.code) {
      console.error("Error code:", error.code);
    }
    if (error.transaction) {
      console.error("Transaction data:", error.transaction);
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