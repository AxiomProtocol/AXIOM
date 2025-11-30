// Simple and reliable deployment script for Polygon mainnet
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  console.log("Starting simple deployment to Polygon mainnet...");
  
  // Get the deployment account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  // Display balance
  const balance = await deployer.getBalance();
  const balanceInPOL = hre.ethers.utils.formatEther(balance);
  console.log("Account balance:", balanceInPOL, "POL");
  
  // Deploy with specific contract reference and minimal options
  console.log("Deploying contract with specific reference...");
  const Contract = await hre.ethers.getContractFactory("contracts/SovranWealthFund.sol:SovranWealthFund");
  
  // Set reasonable gas price (50 gwei for standard inclusion in Polygon)
  const gasPrice = hre.ethers.utils.parseUnits("50", "gwei");
  
  const contract = await Contract.deploy({
    gasPrice: gasPrice
  });

  console.log("Transaction hash:", contract.deployTransaction.hash);
  console.log("Waiting for confirmation (this may take several minutes)...");
  
  await contract.deployed();
  
  console.log("-----------------------------------------------");
  console.log("CONTRACT DEPLOYED SUCCESSFULLY!");
  console.log("-----------------------------------------------");
  console.log("Contract address:", contract.address);
  console.log("Transaction hash:", contract.deployTransaction.hash);
  
  // Save to a file
  const fs = require("fs");
  const deploymentInfo = {
    network: "Polygon Mainnet",
    contractAddress: contract.address,
    txHash: contract.deployTransaction.hash,
    timestamp: new Date().toISOString(),
    deployedBy: deployer.address
  };
  
  fs.writeFileSync(
    "mainnet-simple-deployment.json", 
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("Deployment information saved to mainnet-simple-deployment.json");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});