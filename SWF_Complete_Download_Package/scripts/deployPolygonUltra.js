// Ultra optimized deployment script for Polygon mainnet
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Starting ultra-optimized deployment to Polygon mainnet...");
    
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
    
    console.log("Compiling contract with minimal features...");
    await hre.run("compile");
    
    console.log("Preparing deployment with highest priority gas settings...");
    const SovranWealthFund = await ethers.getContractFactory("SovranWealthFund");
    
    // Use higher gas price for priority (30 gwei)
    const gasPrice = ethers.utils.parseUnits("30", "gwei");
    
    // Fixed gas limit based on previous estimates
    const gasLimit = 3000000; // Reduced gas limit to save costs
    
    // Calculate expected cost
    const deploymentCost = ethers.utils.formatEther(
      ethers.BigNumber.from(gasLimit).mul(gasPrice)
    );
    console.log(`Estimated deployment cost: ${deploymentCost} MATIC (${gasLimit} gas at ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei)`);
    
    if (parseFloat(deploymentCost) > parseFloat(balanceInMATIC) * 0.9) {
      console.error(`ERROR: Insufficient funds. Need at least ${deploymentCost} MATIC but have ${balanceInMATIC} MATIC`);
      return;
    }
    
    console.log("Deploying contract with high priority settings...");
    
    // Deploy with explicit transaction parameters for high priority
    const deploymentOptions = {
      gasPrice: gasPrice,
      gasLimit: gasLimit,
      nonce: currentNonce
    };
    
    // Create deployment transaction without waiting for confirmation
    const deployTx = await SovranWealthFund.getDeployTransaction();
    
    // Create a signed transaction with our optimized parameters
    const signedTx = await deployer.sendTransaction({
      data: deployTx.data,
      gasPrice: gasPrice,
      gasLimit: gasLimit,
      nonce: currentNonce,
    });
    
    console.log("Transaction sent with high priority:", signedTx.hash);
    console.log("Used nonce:", signedTx.nonce);
    
    // Write transaction info to a file
    const fs = require("fs");
    const txInfo = {
      txHash: signedTx.hash,
      from: deployer.address,
      nonce: signedTx.nonce,
      gasPrice: ethers.utils.formatUnits(signedTx.gasPrice, "gwei"),
      gasLimit: signedTx.gasLimit.toString(),
      timestamp: new Date().toISOString(),
      network: "Polygon Mainnet",
      contractBytecode: deployTx.data.substring(0, 100) + "..." // Truncated for readability
    };
    
    fs.writeFileSync(
      "polygon-mainnet-priority-deployment.json", 
      JSON.stringify(txInfo, null, 2)
    );
    
    console.log("Transaction sent with highest priority. Check status using:");
    console.log(`npx hardhat run scripts/checkDeployment.js --network polygon`);
    
    // Add the transaction hash to the check script
    const checkScriptPath = "./scripts/checkDeployment.js";
    if (fs.existsSync(checkScriptPath)) {
      const checkScript = fs.readFileSync(checkScriptPath, 'utf8');
      let updatedScript = checkScript;
      
      if (!checkScript.includes(signedTx.hash)) {
        updatedScript = checkScript.replace(
          /const TX_HASHES = \[([^\]]*)\];/,
          `const TX_HASHES = [$1\n  "${signedTx.hash}",\n];`
        );
        fs.writeFileSync(checkScriptPath, updatedScript);
        console.log(`Added transaction hash to ${checkScriptPath}`);
      }
    }
    
    console.log("\nTransaction sent! Due to network congestion, it might take some time to confirm.");
    console.log("You can check transaction status at:");
    console.log(`https://polygonscan.com/tx/${signedTx.hash}`);
    
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