// Ultra-optimized deployment script for Polygon mainnet
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Starting optimized deployment to Polygon mainnet...");
    
    // Get the deployment account
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    
    // Get balance and display in a readable format
    const balance = await deployer.getBalance();
    const balanceInMATIC = ethers.utils.formatEther(balance);
    console.log("Account balance:", balanceInMATIC, "MATIC");
    
    if (balance.eq(0)) {
      console.error("ERROR: Account has no MATIC tokens. Please fund your account first.");
      return;
    }
    
    // Get current nonce for the account
    const currentNonce = await deployer.getTransactionCount();
    console.log("Current nonce:", currentNonce);
    
    console.log("Compiling contract...");
    await hre.run("compile");
    
    console.log("Preparing deployment with optimal gas settings...");
    const SovranWealthFund = await ethers.getContractFactory("SovranWealthFund");
    
    // Use exact minimum required gas price to save tokens
    const gasPrice = ethers.utils.parseUnits("25", "gwei");
    
    // Estimate gas required for deployment
    const deploymentEstimate = await ethers.provider.estimateGas(
      SovranWealthFund.getDeployTransaction().data
    );
    
    // Add 10% buffer to the estimate
    const gasLimit = deploymentEstimate.mul(110).div(100);
    
    console.log(`Estimated gas needed: ${deploymentEstimate.toString()}`);
    console.log(`Gas limit with buffer: ${gasLimit.toString()}`);
    
    // Calculate expected cost
    const deploymentCost = ethers.utils.formatEther(
      gasLimit.mul(gasPrice)
    );
    console.log(`Estimated deployment cost: ${deploymentCost} MATIC (${gasLimit} gas at ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei)`);
    
    if (parseFloat(deploymentCost) > parseFloat(balanceInMATIC) * 0.95) {
      console.error(`ERROR: Insufficient funds. Need at least ${deploymentCost} MATIC but have ${balanceInMATIC} MATIC`);
      return;
    }
    
    // Ask for user confirmation
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const confirm = await new Promise(resolve => {
      rl.question(`Proceed with deployment? This will use approximately ${deploymentCost} MATIC from your wallet. (y/n): `, answer => {
        resolve(answer.toLowerCase() === 'y');
        rl.close();
      });
    });
    
    if (!confirm) {
      console.log("Deployment cancelled by user.");
      return;
    }
    
    console.log("\n-----------------------------------------------");
    console.log("DEPLOYING CONTRACT WITH OPTIMIZED SETTINGS");
    console.log("-----------------------------------------------");
    console.log("Network: Polygon Mainnet");
    console.log("Gas price:", ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");
    console.log("Gas limit:", gasLimit.toString());
    console.log("Nonce:", currentNonce);
    console.log("-----------------------------------------------\n");
    
    // Deploy with optimized transaction parameters
    const deploymentOptions = {
      gasPrice: gasPrice,
      gasLimit: gasLimit,
      nonce: currentNonce
    };
    
    const tokenContract = await SovranWealthFund.deploy(deploymentOptions);
    
    console.log("Transaction sent:", tokenContract.deployTransaction.hash);
    console.log("Nonce used:", tokenContract.deployTransaction.nonce);
    console.log("Waiting for confirmation (may take a few minutes on Polygon mainnet)...");
    
    // Write transaction info to a file immediately
    const fs = require("fs");
    const txInfo = {
      txHash: tokenContract.deployTransaction.hash,
      from: deployer.address,
      nonce: tokenContract.deployTransaction.nonce,
      gasPrice: ethers.utils.formatUnits(tokenContract.deployTransaction.gasPrice, "gwei"),
      gasLimit: tokenContract.deployTransaction.gasLimit.toString(),
      data: tokenContract.deployTransaction.data,
      timestamp: new Date().toISOString(),
      network: "Polygon Mainnet"
    };
    
    fs.writeFileSync(
      "pending-deployment.json", 
      JSON.stringify(txInfo, null, 2)
    );
    
    console.log("Transaction details saved to pending-deployment.json");
    
    // Wait for deployment to complete with a long timeout
    console.log("Waiting for transaction confirmation...");
    
    // Add the transaction hash to the check script
    const checkScriptPath = "./scripts/checkDeployment.js";
    if (fs.existsSync(checkScriptPath)) {
      const checkScript = fs.readFileSync(checkScriptPath, 'utf8');
      const updatedScript = checkScript.replace(
        /const TX_HASHES = \[([\s\S]*?)\];/m,
        `const TX_HASHES = [\n  ${checkScript.includes(tokenContract.deployTransaction.hash) ? '' : `"${tokenContract.deployTransaction.hash}",\n  `}$1];`
      );
      fs.writeFileSync(checkScriptPath, updatedScript);
      console.log(`Added transaction hash to ${checkScriptPath}`);
    }
    
    // Set a timeout for waiting
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Deployment confirmation timed out after 5 minutes")), 300000)
    );
    
    // Wait for deployment with timeout
    const deployedToken = await Promise.race([
      tokenContract.deployed(),
      timeoutPromise
    ]);
    
    // Log deployment details
    console.log("\n-----------------------------------------------");
    console.log("CONTRACT DEPLOYED SUCCESSFULLY!");
    console.log("-----------------------------------------------");
    console.log("Contract address:", deployedToken.address);
    console.log("Transaction hash:", tokenContract.deployTransaction.hash);
    console.log("Block number:", tokenContract.deployTransaction.blockNumber);
    console.log("Gas used:", tokenContract.deployTransaction.gasLimit.toString());
    
    // Save deployment info
    const deploymentInfo = {
      network: "Polygon Mainnet",
      contractAddress: deployedToken.address,
      txHash: tokenContract.deployTransaction.hash,
      blockNumber: tokenContract.deployTransaction.blockNumber,
      timestamp: new Date().toISOString(),
      deployedBy: deployer.address
    };
    
    fs.writeFileSync(
      "polygon-mainnet-deployment.json", 
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("Deployment information saved to polygon-mainnet-deployment.json");
    console.log("\nYou can now verify the contract on Polygonscan using:");
    console.log(`npx hardhat verify --network polygon ${deployedToken.address}`);
    
  } catch (error) {
    console.error("\n-----------------------------------------------");
    console.error("DEPLOYMENT ERROR");
    console.error("-----------------------------------------------");
    console.error("Error message:", error.message);
    
    if (error.message.includes("timeout")) {
      console.error("\nThe deployment transaction was sent successfully, but confirmation timed out.");
      console.error("This can happen on busy networks like Polygon mainnet.");
      console.error("Check the pending-deployment.json file for transaction details.");
      console.error("Run the check script to monitor deployment status:");
      console.error("npx hardhat run scripts/checkDeployment.js --network polygon");
    }
    
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