/**
 * Sovran Wealth Fund Module System Deployment Script
 * 
 * This script deploys the full SWF module ecosystem to Polygon Mainnet:
 * - LiquidityVault
 * - GovernanceDividendPool
 * - SWFVaultAdapter
 * - SWFModuleIntegrator
 */

const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Deploying Sovran Wealth Fund Module System...\n");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);
  
  // Get the SWF token address (already deployed)
  const swfTokenAddress = process.env.SWF_TOKEN_ADDRESS || "0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7";
  console.log(`Using SWF Token address: ${swfTokenAddress}`);
  
  // Get LP Token address (from .env or parameter)
  const lpTokenAddress = process.env.LP_TOKEN_ADDRESS;
  if (!lpTokenAddress) {
    console.error("LP_TOKEN_ADDRESS not set in .env file");
    process.exit(1);
  }
  console.log(`Using LP Token address: ${lpTokenAddress}`);
  
  // Get treasury address (from .env or default)
  const treasuryAddress = process.env.TREASURY_ADDRESS || "0x26a8401287ce33cc4AEb5a106cD6D282a9c2f51D";
  console.log(`Using Treasury address: ${treasuryAddress}\n`);
  
  // Deploy LiquidityVault
  console.log("Deploying LiquidityVault...");
  // Get LP pair name (from .env or parameter or default)
  const lpPairName = process.env.LP_PAIR_NAME || "SWF/ETH";
  console.log(`Using LP pair: ${lpPairName}`);
  
  const LiquidityVault = await ethers.getContractFactory("LiquidityVault");
  const liquidityVault = await LiquidityVault.deploy(lpTokenAddress, lpPairName);
  await liquidityVault.deployed();
  console.log(`LiquidityVault deployed to: ${liquidityVault.address}`);
  
  // Deploy GovernanceDividendPool
  console.log("\nDeploying GovernanceDividendPool...");
  // Set initial reward rate to 1% monthly (1e16 = 0.01 in the contract's percentage format)
  const initialRewardRate = ethers.utils.parseUnits("1", 16);
  const GovernanceDividendPool = await ethers.getContractFactory("GovernanceDividendPool");
  const governancePool = await GovernanceDividendPool.deploy(swfTokenAddress, initialRewardRate);
  await governancePool.deployed();
  console.log(`GovernanceDividendPool deployed to: ${governancePool.address}`);
  
  // Deploy SWFVaultAdapter
  console.log("\nDeploying SWFVaultAdapter...");
  const SWFVaultAdapter = await ethers.getContractFactory("SWFVaultAdapter");
  const vaultAdapter = await SWFVaultAdapter.deploy(swfTokenAddress, treasuryAddress);
  await vaultAdapter.deployed();
  console.log(`SWFVaultAdapter deployed to: ${vaultAdapter.address}`);
  
  // Deploy SWFModuleIntegrator (you need to create this contract first)
  console.log("\nDeploying SWFModuleIntegrator...");
  const SWFModuleIntegrator = await ethers.getContractFactory("SWFModuleIntegrator");
  const integrator = await SWFModuleIntegrator.deploy(
    swfTokenAddress,
    liquidityVault.address,
    governancePool.address,
    vaultAdapter.address,
    treasuryAddress
  );
  await integrator.deployed();
  console.log(`SWFModuleIntegrator deployed to: ${integrator.address}`);
  
  // Transfer ownership of modules to the integrator
  console.log("\nTransferring ownership of modules to the integrator...");
  await liquidityVault.transferOwnership(integrator.address);
  await governancePool.transferOwnership(integrator.address);
  await vaultAdapter.transferOwnership(integrator.address);
  console.log("Ownership transfers complete");
  
  // Save deployment information
  const deploymentInfo = {
    network: "polygon",
    chainId: 137,
    swfToken: swfTokenAddress,
    lpToken: lpTokenAddress,
    lpPairName: lpPairName,
    treasury: treasuryAddress,
    modules: {
      integrator: integrator.address,
      liquidityVault: liquidityVault.address,
      governancePool: governancePool.address,
      vaultAdapter: vaultAdapter.address
    },
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    "deployment-latest.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\nDeployment complete!");
  console.log("Deployment information saved to deployment-latest.json");
  
  console.log("\nContract Addresses Summary:");
  console.log(`- SWFModuleIntegrator:      ${integrator.address}`);
  console.log(`- LiquidityVault:           ${liquidityVault.address}`);
  console.log(`- GovernanceDividendPool:   ${governancePool.address}`);
  console.log(`- SWFVaultAdapter:          ${vaultAdapter.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });