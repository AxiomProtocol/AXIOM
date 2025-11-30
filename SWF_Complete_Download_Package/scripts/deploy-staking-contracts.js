/**
 * Deployment script for SWF Staking Contracts
 * 
 * This script deploys the LiquidityVault, GovernanceDividendPool, and SWFVaultAdapter
 * contracts to the Polygon network.
 */
require('dotenv').config();
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  // No need to get SWFToken factory since token is already deployed
  // Use fully qualified names to avoid ambiguous contract artifacts
  const LiquidityVault = await ethers.getContractFactory("LiquidityVault", {
    from: "contracts/CombinedStakingContracts.sol:LiquidityVault"
  });
  const GovernanceDividendPool = await ethers.getContractFactory("GovernanceDividendPool", {
    from: "contracts/CombinedStakingContracts.sol:GovernanceDividendPool"
  });
  const SWFVaultAdapter = await ethers.getContractFactory("SWFVaultAdapter", {
    from: "contracts/CombinedStakingContracts.sol:SWFVaultAdapter"
  });
  
  // Get deployment account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  // Load existing SWF token address from environment (or deploy a new one if needed)
  let swfTokenAddress = process.env.SWF_TOKEN_ADDRESS;
  if (!swfTokenAddress) {
    console.log("SWF token address not found in environment. Please set SWF_TOKEN_ADDRESS.");
    process.exit(1);
  }
  console.log("Using SWF token address:", swfTokenAddress);
  
  // Load LP token addresses
  const lpTokenAddressETH = process.env.LP_TOKEN_ADDRESS || "";
  const lpTokenAddressUSDC = process.env.LP_TOKEN_ADDRESS_USDC || "";
  
  if (!lpTokenAddressETH || !lpTokenAddressUSDC) {
    console.log("LP token addresses not found in environment. Please set LP_TOKEN_ADDRESS and LP_TOKEN_ADDRESS_USDC.");
    process.exit(1);
  }
  
  console.log("Using LP token addresses:");
  console.log("- SWF/ETH LP:", lpTokenAddressETH);
  console.log("- SWF/USDC LP:", lpTokenAddressUSDC);
  
  // Get treasury address from environment
  const treasuryAddress = process.env.TREASURY_WALLET || deployer.address;
  console.log("Using treasury address:", treasuryAddress);
  
  // Deploy contracts
  console.log("Deploying LiquidityVault for SWF/ETH pair...");
  const liquidityVaultETH = await LiquidityVault.deploy(lpTokenAddressETH);
  await liquidityVaultETH.deployed();
  console.log("LiquidityVault (ETH) deployed to:", liquidityVaultETH.address);
  
  console.log("Deploying LiquidityVault for SWF/USDC pair...");
  const liquidityVaultUSDC = await LiquidityVault.deploy(lpTokenAddressUSDC);
  await liquidityVaultUSDC.deployed();
  console.log("LiquidityVault (USDC) deployed to:", liquidityVaultUSDC.address);
  
  // Deploy Governance Dividend Pool with 1% monthly reward rate (1e16 = 0.01 ether = 1%)
  console.log("Deploying GovernanceDividendPool...");
  const rewardRate = ethers.utils.parseEther("0.01"); // 1% monthly reward rate
  const governancePool = await GovernanceDividendPool.deploy(swfTokenAddress, rewardRate);
  await governancePool.deployed();
  console.log("GovernanceDividendPool deployed to:", governancePool.address);
  
  // Deploy Vault Adapter
  console.log("Deploying SWFVaultAdapter...");
  const vaultAdapter = await SWFVaultAdapter.deploy(swfTokenAddress, treasuryAddress);
  await vaultAdapter.deployed();
  console.log("SWFVaultAdapter deployed to:", vaultAdapter.address);
  
  // Save contract addresses
  const contracts = {
    swfToken: swfTokenAddress,
    liquidityVaultETH: liquidityVaultETH.address,
    liquidityVaultUSDC: liquidityVaultUSDC.address,
    governancePool: governancePool.address,
    vaultAdapter: vaultAdapter.address,
    lpTokenETH: lpTokenAddressETH,
    lpTokenUSDC: lpTokenAddressUSDC,
    treasury: treasuryAddress,
    deployedAt: new Date().toISOString(),
    network: "polygon",
    chainId: 137
  };
  
  // Save to deployment file
  const filename = `staking-modules-deployment-${new Date().toISOString().replace(/:/g, '-')}.json`;
  fs.writeFileSync(filename, JSON.stringify(contracts, null, 2));
  console.log(`Deployment information saved to ${filename}`);
  
  // Also save to latest deployment file
  fs.writeFileSync('staking-modules-latest.json', JSON.stringify(contracts, null, 2));
  console.log("Deployment information saved to staking-modules-latest.json");
  
  console.log("\nDeployment Summary:");
  console.log("==================");
  console.log(`SWF Token: ${swfTokenAddress}`);
  console.log(`LiquidityVault (ETH): ${liquidityVaultETH.address}`);
  console.log(`LiquidityVault (USDC): ${liquidityVaultUSDC.address}`);
  console.log(`GovernanceDividendPool: ${governancePool.address}`);
  console.log(`SWFVaultAdapter: ${vaultAdapter.address}`);
  console.log("\nNext steps:");
  console.log("1. Add these addresses to your .env file");
  console.log("2. Verify contracts on PolygonScan");
  console.log("3. Initialize contracts with initial liquidity and governance stakes");
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });