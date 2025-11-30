// Absolute minimal deployment script for Polygon mainnet
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  try {
    // Get account
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    
    // Display balance
    const balance = await deployer.getBalance();
    console.log("Account balance:", ethers.utils.formatEther(balance), "POL");
    
    // Get current nonce
    const currentNonce = await deployer.getTransactionCount();
    console.log("Current nonce:", currentNonce);
    
    // Compile if needed
    await hre.run("compile");
    
    // Get contract factory
    const SovranWealthFund = await ethers.getContractFactory("SovranWealthFund");
    
    // Highest gas price
    const gasPrice = ethers.utils.parseUnits("35", "gwei");
    
    // Very reduced gas limit
    const gasLimit = 2500000;
    
    console.log(`Using gas price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei, gas limit: ${gasLimit}`);
    
    // Get deployment transaction data
    const deployTx = await SovranWealthFund.getDeployTransaction();
    
    // Send transaction manually
    const tx = {
      data: deployTx.data,
      gasPrice: gasPrice,
      gasLimit: gasLimit,
      nonce: currentNonce,
    };
    
    // Sign and send
    const signedTx = await deployer.sendTransaction(tx);
    
    console.log("Transaction hash:", signedTx.hash);
    console.log("Check status at: https://polygonscan.com/tx/" + signedTx.hash);
    
    // Save to file
    const fs = require("fs");
    fs.writeFileSync(
      "minimum-deployment-tx.json", 
      JSON.stringify({
        txHash: signedTx.hash,
        gasPrice: ethers.utils.formatUnits(gasPrice, "gwei") + " gwei",
        gasLimit: gasLimit.toString(),
        nonce: currentNonce,
        network: "Polygon Mainnet",
        chainId: 137
      }, null, 2)
    );
    
  } catch (error) {
    console.error("Deployment error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });