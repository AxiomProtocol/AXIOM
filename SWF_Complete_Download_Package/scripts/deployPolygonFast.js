// Fast deployment script for Polygon mainnet with high gas price
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Starting high-priority deployment to Polygon mainnet...");
    
    // Get the deployment account
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    
    // Get balance and display in a readable format
    const balance = await deployer.getBalance();
    const balanceInMATIC = ethers.utils.formatEther(balance);
    console.log("Account balance:", balanceInMATIC, "MATIC");
    
    // Use higher gas price for priority (120 gwei) and lower gas limit
    const gasPrice = ethers.utils.parseUnits("120", "gwei");
    const gasLimit = 800000; 
    
    // Calculate expected cost
    const deploymentCost = ethers.utils.formatEther(
      ethers.BigNumber.from(gasLimit).mul(gasPrice)
    );
    console.log(`Estimated deployment cost: ${deploymentCost} MATIC (${gasLimit} gas at ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei)`);
    
    if (parseFloat(deploymentCost) > parseFloat(balanceInMATIC) * 0.9) {
      console.error(`ERROR: Insufficient funds. Need at least ${deploymentCost} MATIC but have ${balanceInMATIC} MATIC`);
      return;
    }
    
    console.log("Compiling contract...");
    await hre.run("compile");
    
    // Choose which contract to deploy
    const ContractFactory = await ethers.getContractFactory("contracts/SovranWealthFundMinimal.sol:SovranWealthFundMinimal");
    console.log("Deploying SovranWealthFundMinimal contract...");
    
    // Use higher gas price but lower gas limit for faster inclusion in a block
    const contract = await ContractFactory.deploy({
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });
    
    console.log("Transaction hash:", contract.deployTransaction.hash);
    console.log("Transaction gas price:", ethers.utils.formatUnits(contract.deployTransaction.gasPrice, "gwei"), "gwei");
    console.log("Gas limit:", contract.deployTransaction.gasLimit.toString());
    
    console.log("Deployment transaction sent! Watch status at:");
    console.log(`https://polygonscan.com/tx/${contract.deployTransaction.hash}`);
    
    // Save information to file
    const fs = require("fs");
    fs.writeFileSync(
      "polygon-mainnet-fast-deployment.json", 
      JSON.stringify({
        txHash: contract.deployTransaction.hash,
        gasPrice: ethers.utils.formatUnits(gasPrice, "gwei") + " gwei",
        gasLimit: gasLimit.toString(),
        estimatedCost: deploymentCost,
        network: "Polygon Mainnet",
        timestamp: new Date().toISOString()
      }, null, 2)
    );
    
    // Automatically add to the check script
    const checkScriptPath = "./scripts/checkDeployment.js";
    if (fs.existsSync(checkScriptPath)) {
      const checkScript = fs.readFileSync(checkScriptPath, 'utf8');
      
      if (!checkScript.includes(contract.deployTransaction.hash)) {
        const updatedScript = checkScript.replace(
          /const TX_HASHES = \[([\s\S]*?)\];/,
          `const TX_HASHES = [$1  "${contract.deployTransaction.hash}",\n];`
        );
        fs.writeFileSync(checkScriptPath, updatedScript);
        console.log(`Added transaction hash to ${checkScriptPath}`);
        console.log(`Run the check script with: npx hardhat run scripts/checkDeployment.js --network polygon`);
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