// Script for deploying the SovranWealthFund token to Polygon Mainnet
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("-".repeat(50));
    console.log("POLYGON MAINNET DEPLOYMENT");
    console.log("-".repeat(50));
    console.log("WARNING: You are deploying to the MAINNET, which will cost real POL tokens.");
    console.log("Make sure you have sufficient funds in your wallet.");

    // Display deployer info
    const [deployer] = await ethers.getSigners();
    console.log("\nDeployer address:", deployer.address);
    
    // Get balance
    const balance = await deployer.getBalance();
    const balanceInPOL = ethers.utils.formatEther(balance);
    console.log("Account balance:", balanceInPOL, "POL");
    
    // Verify minimum balance
    if (parseFloat(balanceInPOL) < 1) {
      console.error("\nWARNING: Your balance is below 1 POL. This may not be enough for deployment.");
      console.error("Consider funding your wallet with more POL before proceeding.");
      
      // Add a confirmation prompt
      console.log("\nDo you want to continue with deployment? (Type 'yes' in the terminal)");
      const readline = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const confirmation = await new Promise(resolve => {
        readline.question("> ", answer => {
          readline.close();
          resolve(answer.toLowerCase());
        });
      });
      
      if (confirmation !== "yes") {
        console.log("Deployment cancelled.");
        return;
      }
    }
    
    console.log("\nPreparing to deploy the SovranWealthFund token...");
    console.log("Compiling contracts...");
    await hre.run("compile");
    
    // Check current gas prices
    const provider = ethers.provider;
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log("Current network gas price:", ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");
    
    // Use a slight premium on current gas price for faster inclusion
    const gasPriceToUse = gasPrice.mul(110).div(100); // 10% higher
    console.log("Using gas price for deployment:", ethers.utils.formatUnits(gasPriceToUse, "gwei"), "gwei");
    
    // Estimate gas cost (assume ~5M gas for deployment)
    const estimatedGasLimit = 5000000;
    const estimatedCost = ethers.utils.formatEther(gasPriceToUse.mul(estimatedGasLimit));
    console.log("Estimated deployment cost:", estimatedCost, "POL");
    
    // Deploy contract
    console.log("\nDeploying SovranWealthFund token contract...");
    const SovranWealthFund = await ethers.getContractFactory("SovranWealthFund");
    const token = await SovranWealthFund.deploy({
      gasLimit: estimatedGasLimit,
      gasPrice: gasPriceToUse
    });
    
    console.log("Deployment transaction sent!");
    console.log("Transaction hash:", token.deployTransaction.hash);
    
    // Log deployment info
    console.log("\nDeployment in progress. Waiting for confirmation...");
    console.log("You can monitor the transaction at:");
    console.log(`https://polygonscan.com/tx/${token.deployTransaction.hash}`);
    
    // Wait for deployment to complete
    await token.deployed();
    
    const deployedAddress = token.address;
    console.log("\n✅ CONTRACT DEPLOYED SUCCESSFULLY!");
    console.log("Contract address:", deployedAddress);
    
    // Write deployment info to a file
    const fs = require("fs");
    fs.writeFileSync(
      "mainnet-deployment.json", 
      JSON.stringify({
        network: "Polygon Mainnet",
        contractAddress: deployedAddress,
        transactionHash: token.deployTransaction.hash,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        gasUsed: token.deployTransaction.gasLimit.toString(),
        gasPrice: ethers.utils.formatUnits(token.deployTransaction.gasPrice, "gwei") + " gwei"
      }, null, 2)
    );
    
    console.log("\nDeployment information saved to mainnet-deployment.json");
    
    // Instructions for verification
    console.log("\nTo verify your contract on Polygonscan, run:");
    console.log(`npx hardhat verify --network polygon ${deployedAddress}`);
    
    console.log("\nGas usage statistics:");
    console.log("Gas limit used:", token.deployTransaction.gasLimit.toString());
    console.log("Gas price used:", ethers.utils.formatUnits(token.deployTransaction.gasPrice, "gwei"), "gwei");
    console.log("Deployment cost:", ethers.utils.formatEther(token.deployTransaction.gasPrice.mul(token.deployTransaction.gasLimit)), "POL");
    
  } catch (error) {
    console.error("\n❌ DEPLOYMENT FAILED!");
    console.error("Error:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
    if (error.code) console.error("Error code:", error.code);
    
    console.log("\nTroubleshooting tips:");
    console.log("1. Check that you have enough POL for gas fees");
    console.log("2. Ensure your private key in .env is correct and has funds");
    console.log("3. Verify network congestion and consider increasing gas price");
    
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("\nUnhandled error:", error);
    process.exit(1);
  });