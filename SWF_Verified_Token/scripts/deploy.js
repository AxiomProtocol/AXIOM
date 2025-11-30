// SPDX-License-Identifier: MIT
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Deploying Sovran Wealth Fund (SWF) Token...");

  // Get deployment account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying from account: ${deployer.address}`);
  
  const balance = await deployer.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance)} MATIC`);

  // Deploy the SWF token contract
  const SovranWealthFund = await ethers.getContractFactory("SovranWealthFund");
  const swfToken = await SovranWealthFund.deploy();
  
  console.log("Waiting for deployment transaction confirmation...");
  await swfToken.deployed();
  
  console.log(`SovranWealthFund deployed to: ${swfToken.address}`);
  console.log("----------------------------------------------------");
  console.log("Contract verification command:");
  console.log(`npx hardhat verify --network ${network.name} ${swfToken.address}`);
  console.log("----------------------------------------------------");

  // Setup Roles
  console.log("Setting up initial roles...");
  
  // If admin address is defined, grant admin role
  const adminAddress = process.env.ADMIN_ADDRESS;
  if (adminAddress && adminAddress !== deployer.address) {
    const DEFAULT_ADMIN_ROLE = await swfToken.DEFAULT_ADMIN_ROLE();
    await swfToken.grantRole(DEFAULT_ADMIN_ROLE, adminAddress);
    console.log(`Granted ADMIN role to: ${adminAddress}`);
  }

  // If minter address is defined, grant minter role
  const minterAddress = process.env.MINTER_ADDRESS;
  if (minterAddress && minterAddress !== deployer.address) {
    const MINTER_ROLE = await swfToken.MINTER_ROLE();
    await swfToken.grantRole(MINTER_ROLE, minterAddress);
    console.log(`Granted MINTER role to: ${minterAddress}`);
  }

  // If pauser address is defined, grant pauser role
  const pauserAddress = process.env.PAUSER_ADDRESS;
  if (pauserAddress && pauserAddress !== deployer.address) {
    const PAUSER_ROLE = await swfToken.PAUSER_ROLE();
    await swfToken.grantRole(PAUSER_ROLE, pauserAddress);
    console.log(`Granted PAUSER role to: ${pauserAddress}`);
  }

  // Add some basic pegged assets if oracles are provided
  if (process.env.BTC_ORACLE_ADDRESS) {
    console.log("Adding Bitcoin to pegged assets...");
    await swfToken.addPeggedAsset(
      "BTC",                              // symbol
      process.env.BTC_ORACLE_ADDRESS,     // oracle address
      3000,                               // weight: 30%
      7500,                               // reserve ratio: 75%
      process.env.BTC_TOKEN_ADDRESS || "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6" // wBTC on Polygon
    );
    console.log("Bitcoin added to pegged assets");
  }
  
  if (process.env.XRP_ORACLE_ADDRESS) {
    console.log("Adding XRP to pegged assets...");
    await swfToken.addPeggedAsset(
      "XRP",                              // symbol
      process.env.XRP_ORACLE_ADDRESS,     // oracle address
      1500,                               // weight: 15%
      5000,                               // reserve ratio: 50%
      process.env.XRP_TOKEN_ADDRESS || "0x6e8A8D42E9F212f1b65BF748A8512539C1e21636" // XRP on Polygon
    );
    console.log("XRP added to pegged assets");
  }

  console.log("SWF Token deployment complete!");
  console.log("Total supply: 1,000,000,000 SWF");
  
  // Output tokenomics information
  console.log("----------------------------------------------------");
  console.log("SWF Tokenomics:");
  console.log("- Role-Based Access Control");
  console.log("- Multi-asset pegging capability");
  console.log("- 16-Wallet staking structure");
  console.log("- Dynamic APR (Default: 25%)");
  console.log("- Minimum Stake: 50 SWF");
  console.log("----------------------------------------------------");

  // Save deployment info to a file for easier verification
  const fs = require("fs");
  const deploymentInfo = {
    network: network.name,
    tokenAddress: swfToken.address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    chainId: network.config.chainId
  };
  
  fs.writeFileSync(
    "deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("Deployment info saved to deployment-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });