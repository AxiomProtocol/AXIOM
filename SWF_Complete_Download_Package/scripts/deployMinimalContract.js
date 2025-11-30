// Ultra minimal deployment script for Polygon mainnet using the minimal contract
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Starting deployment of minimal contract to Polygon mainnet...");
    
    // Get the deployment account
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    
    // Get balance
    const balance = await deployer.getBalance();
    const balanceInPOL = ethers.utils.formatEther(balance);
    console.log("Account balance:", balanceInPOL, "POL");
    
    // Compile the contract
    console.log("Compiling minimal contract...");
    await hre.run("compile");
    
    // Get contract factory for the minimal contract
    const SovranWealthFundMinimal = await ethers.getContractFactory("SovranWealthFundMinimal");
    
    // Use high gas price but with reduced gas limit
    const gasPrice = ethers.utils.parseUnits("35", "gwei");
    const gasLimit = 2000000; // Reduced for minimal contract
    
    console.log(`Using gas price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei, gas limit: ${gasLimit}`);
    
    // Calculate expected deployment cost
    const deploymentCost = ethers.utils.formatEther(
      ethers.BigNumber.from(gasLimit).mul(gasPrice)
    );
    console.log(`Estimated max deployment cost: ${deploymentCost} POL`);
    
    // Proceed with deployment
    console.log("Deploying minimal contract...");
    const contract = await SovranWealthFundMinimal.deploy({
      gasPrice: gasPrice,
      gasLimit: gasLimit
    });
    
    // Transaction hash is available immediately
    console.log("Transaction hash:", contract.deployTransaction.hash);
    
    // Save transaction data
    const fs = require("fs");
    fs.writeFileSync(
      "minimal-contract-tx.json", 
      JSON.stringify({
        txHash: contract.deployTransaction.hash,
        gasPrice: ethers.utils.formatUnits(gasPrice, "gwei") + " gwei",
        gasLimit: gasLimit.toString(),
        timestamp: new Date().toISOString(),
        contractName: "SovranWealthFundMinimal",
        network: "Polygon Mainnet"
      }, null, 2)
    );
    
    console.log("Deployment transaction sent. Check status at:");
    console.log(`https://polygonscan.com/tx/${contract.deployTransaction.hash}`);
    
    // Add to check script
    const checkScriptPath = "./scripts/checkDeployment.js";
    if (fs.existsSync(checkScriptPath)) {
      const checkScript = fs.readFileSync(checkScriptPath, 'utf8');
      let updatedScript = checkScript;
      
      if (!checkScript.includes(contract.deployTransaction.hash)) {
        updatedScript = checkScript.replace(
          /const TX_HASHES = \[([^\]]*)\];/,
          `const TX_HASHES = [$1\n  "${contract.deployTransaction.hash}",\n];`
        );
        fs.writeFileSync(checkScriptPath, updatedScript);
        console.log(`Added transaction hash to ${checkScriptPath}`);
      }
    }
    
  } catch (error) {
    console.error("Deployment failed:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });