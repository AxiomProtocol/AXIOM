/**
 * Deployment script for SWF Module Integrator
 * 
 * This script deploys the SWFModuleIntegrator contract to the Polygon network,
 * which integrates the LiquidityVault, GovernanceDividendPool, and SWFVaultAdapter
 * contracts into a single interface.
 */
require('dotenv').config();
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  // Get the contract factory
  const SWFModuleIntegrator = await ethers.getContractFactory("SWFModuleIntegrator");
  
  // Get deployment account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  // Load addresses from environment
  const swfTokenAddress = process.env.SWF_TOKEN_ADDRESS;
  if (!swfTokenAddress) {
    console.log("SWF token address not found in environment. Please set SWF_TOKEN_ADDRESS.");
    process.exit(1);
  }
  
  // Load module addresses
  const liquidityVaultETH = process.env.LIQUIDITY_VAULT_ETH;
  const governancePool = process.env.GOVERNANCE_POOL;
  const vaultAdapter = process.env.VAULT_ADAPTER;
  const treasury = process.env.TREASURY_WALLET;
  
  if (!liquidityVaultETH || !governancePool || !vaultAdapter || !treasury) {
    console.log("One or more required addresses not found in environment. Please set all addresses.");
    console.log("Required: LIQUIDITY_VAULT_ETH, GOVERNANCE_POOL, VAULT_ADAPTER, TREASURY_WALLET");
    process.exit(1);
  }
  
  console.log("Using addresses:");
  console.log("- SWF Token:", swfTokenAddress);
  console.log("- Liquidity Vault (ETH):", liquidityVaultETH);
  console.log("- Governance Pool:", governancePool);
  console.log("- Vault Adapter:", vaultAdapter);
  console.log("- Treasury:", treasury);
  
  // Deploy the Module Integrator
  console.log("Deploying SWFModuleIntegrator...");
  const moduleIntegrator = await SWFModuleIntegrator.deploy(
    swfTokenAddress,
    liquidityVaultETH,
    governancePool,
    vaultAdapter,
    treasury
  );
  await moduleIntegrator.deployed();
  console.log("SWFModuleIntegrator deployed to:", moduleIntegrator.address);
  
  // Save deployment information
  const deploymentInfo = {
    moduleIntegrator: moduleIntegrator.address,
    swfToken: swfTokenAddress,
    liquidityVaultETH: liquidityVaultETH,
    governancePool: governancePool,
    vaultAdapter: vaultAdapter,
    treasury: treasury,
    deployedAt: new Date().toISOString(),
    network: "polygon",
    chainId: 137
  };
  
  // Save to deployment file
  const filename = `module-integrator-deployment-${new Date().toISOString().replace(/:/g, '-')}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment information saved to ${filename}`);
  
  console.log("\nDeployment Summary:");
  console.log("==================");
  console.log(`SWFModuleIntegrator: ${moduleIntegrator.address}`);
  console.log("\nNext steps:");
  console.log("1. Add the Module Integrator address to your .env file as MODULE_INTEGRATOR_ADDRESS");
  console.log("2. Verify contract on PolygonScan");
  console.log("3. Initialize the Module Integrator with admin privileges");
  console.log("4. Test full integration of all modules");
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });