// SPDX-License-Identifier: MIT
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Starting SovranWealthFund token deployment...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Check balance
  const balance = await deployer.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance)} ETH`);
  
  // Deploy the contract
  console.log("Deploying SovranWealthFund token...");
  const SovranWealthFund = await ethers.getContractFactory("SovranWealthFund");
  const token = await SovranWealthFund.deploy();
  
  await token.deployed();
  console.log(`SovranWealthFund token deployed to: ${token.address}`);

  // Save deployment information to a file
  const deploymentInfo = {
    network: network.name,
    token: {
      address: token.address,
      name: await token.name(),
      symbol: await token.symbol(),
      totalSupply: (await token.totalSupply()).toString(),
      deployer: deployer.address,
      deploymentTime: new Date().toISOString(),
    }
  };

  fs.writeFileSync(
    "SovranWealthFund.token.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("Deployment information saved to SovranWealthFund.token.json");

  console.log("Deployment complete!");
  
  // Verification instructions
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("");
    console.log("=== VERIFICATION INSTRUCTIONS ===");
    console.log("To verify on Polygonscan:");
    console.log(`npx hardhat verify --network ${network.name} ${token.address}`);
    console.log("");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });