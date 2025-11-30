/**
 * Test Script for SWF Module Integrator
 * 
 * This script provides functions to interact with the SWFModuleIntegrator:
 * - One-click staking and depositing
 * - Reward distribution
 * - User information queries
 * 
 * Usage: npx hardhat run scripts/testIntegrator.js --network polygon
 */

require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
  // Configuration from environment
  const INTEGRATOR_ADDRESS = process.env.MODULE_INTEGRATOR_ADDRESS;
  const SWF_TOKEN_ADDRESS = process.env.SWF_ADDRESS || "0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7";
  
  if (!INTEGRATOR_ADDRESS) {
    console.error("Error: MODULE_INTEGRATOR_ADDRESS must be set in .env file");
    process.exit(1);
  }
  
  // Get signer
  const [signer] = await ethers.getSigners();
  console.log(`Using account: ${signer.address}`);
  
  // Connect to contracts
  console.log("\nConnecting to contracts...");
  const integrator = await ethers.getContractAt("SWFModuleIntegrator", INTEGRATOR_ADDRESS);
  const swfToken = await ethers.getContractAt("IERC20", SWF_TOKEN_ADDRESS);
  
  // Get module addresses
  const liquidityVaultAddress = await integrator.liquidityVault();
  const governancePoolAddress = await integrator.governanceDividendPool();
  const vaultAdapterAddress = await integrator.vaultAdapter();
  const treasuryAddress = await integrator.treasury();
  
  console.log("\n=== Contract Addresses ===");
  console.log(`SWF Token: ${SWF_TOKEN_ADDRESS}`);
  console.log(`Module Integrator: ${INTEGRATOR_ADDRESS}`);
  console.log(`Liquidity Vault: ${liquidityVaultAddress}`);
  console.log(`Governance Pool: ${governancePoolAddress}`);
  console.log(`Vault Adapter: ${vaultAdapterAddress}`);
  console.log(`Treasury: ${treasuryAddress}`);
  
  // Check user balances and stakes
  await checkUserInfo(integrator, swfToken, signer.address);
  
  // Menu of options
  console.log("\n=== Available Actions ===");
  console.log("1. Stake SWF in Governance Pool");
  console.log("2. Deposit SWF to Vault Adapter");
  console.log("3. Distribute Rewards");
  console.log("4. Check Total Staking Statistics");
  console.log("5. Forward Funds to Vault (owner only)");
  
  // Uncomment the action you want to perform
  
  // await stakeInGovernancePool(integrator, swfToken, ethers.utils.parseEther("10.0"));
  // await depositToVault(integrator, swfToken, ethers.utils.parseEther("5.0"));
  // await distributeRewards(integrator);
  // await getTotalStats(integrator);
  // await forwardToVault(integrator, ethers.utils.parseEther("2.0"));
  
  // Check user balances and stakes again
  // await checkUserInfo(integrator, swfToken, signer.address);
}

async function checkUserInfo(integrator, swfToken, userAddress) {
  console.log("\n=== User Information ===");
  
  // Get SWF token balance
  const swfBalance = await swfToken.balanceOf(userAddress);
  console.log(`SWF Balance: ${ethers.utils.formatEther(swfBalance)} SWF`);
  
  // Get user's staking across all modules
  const [lpStaked, swfStaked, swfDeposited] = await integrator.getUserInfo(userAddress);
  console.log(`LP Tokens Staked: ${ethers.utils.formatEther(lpStaked)} LP`);
  console.log(`SWF Tokens Staked in Governance: ${ethers.utils.formatEther(swfStaked)} SWF`);
  console.log(`SWF Tokens Deposited in Vault: ${ethers.utils.formatEther(swfDeposited)} SWF`);
  
  // MATIC balance
  const maticBalance = await ethers.provider.getBalance(userAddress);
  console.log(`MATIC Balance: ${ethers.utils.formatEther(maticBalance)} MATIC`);
}

async function stakeInGovernancePool(integrator, swfToken, amount) {
  console.log(`\n=== Staking ${ethers.utils.formatEther(amount)} SWF in Governance Pool ===`);
  
  // Approve tokens for integrator
  console.log("Approving SWF token spending...");
  const approveTx = await swfToken.approve(integrator.address, amount);
  await approveTx.wait();
  console.log(`Approval transaction: ${approveTx.hash}`);
  
  // Stake through the integrator
  console.log("Staking SWF tokens...");
  const stakeTx = await integrator.stakeInGovernancePool(amount);
  await stakeTx.wait();
  console.log(`Stake transaction: ${stakeTx.hash}`);
  console.log("Successfully staked SWF tokens in the Governance Pool");
}

async function depositToVault(integrator, swfToken, amount) {
  console.log(`\n=== Depositing ${ethers.utils.formatEther(amount)} SWF to Vault ===`);
  
  // Approve tokens for integrator
  console.log("Approving SWF token spending...");
  const approveTx = await swfToken.approve(integrator.address, amount);
  await approveTx.wait();
  console.log(`Approval transaction: ${approveTx.hash}`);
  
  // Deposit through the integrator
  console.log("Depositing SWF tokens...");
  const depositTx = await integrator.depositToVault(amount);
  await depositTx.wait();
  console.log(`Deposit transaction: ${depositTx.hash}`);
  console.log("Successfully deposited SWF tokens to the Vault Adapter");
}

async function distributeRewards(integrator) {
  console.log("\n=== Distributing Rewards ===");
  
  // Get initial details
  const treasury = await integrator.treasury();
  const treasuryBalance = await ethers.provider.getBalance(treasury);
  const lastDistribution = await integrator.lastRewardDistribution();
  const frequency = await integrator.rewardDistributionFrequency();
  const percentage = await integrator.rewardsPercentage();
  
  console.log(`Treasury Balance: ${ethers.utils.formatEther(treasuryBalance)} MATIC`);
  console.log(`Last Distribution: ${new Date(lastDistribution.toNumber() * 1000).toISOString()}`);
  console.log(`Distribution Frequency: ${frequency / (24 * 60 * 60)} days`);
  console.log(`Reward Percentage: ${percentage}%`);
  
  // Distribute rewards
  console.log("Attempting to distribute rewards...");
  const distributeTx = await integrator.distributeRewards();
  await distributeTx.wait();
  console.log(`Distribution transaction: ${distributeTx.hash}`);
  
  // Check if distribution was successful by comparing timestamps
  const newLastDistribution = await integrator.lastRewardDistribution();
  if (newLastDistribution.gt(lastDistribution)) {
    console.log("Reward distribution was successful");
  } else {
    console.log("Reward distribution not needed yet or failed");
  }
}

async function getTotalStats(integrator) {
  console.log("\n=== Total Staking Statistics ===");
  
  const totalLpStaked = await integrator.getTotalLiquidityStaked();
  const totalSwfStaked = await integrator.getTotalGovernanceStaked();
  const totalVaultDeposits = await integrator.getTotalVaultDeposits();
  
  console.log(`Total LP Tokens Staked: ${ethers.utils.formatEther(totalLpStaked)} LP`);
  console.log(`Total SWF Tokens Staked in Governance: ${ethers.utils.formatEther(totalSwfStaked)} SWF`);
  console.log(`Total SWF Tokens Deposited in Vault: ${ethers.utils.formatEther(totalVaultDeposits)} SWF`);
}

async function forwardToVault(integrator, amount) {
  console.log(`\n=== Forwarding ${ethers.utils.formatEther(amount)} SWF to Vault ===`);
  
  try {
    console.log("Forwarding tokens to vault...");
    const forwardTx = await integrator.forwardToVault(amount);
    await forwardTx.wait();
    console.log(`Forward transaction: ${forwardTx.hash}`);
    console.log("Successfully forwarded SWF tokens to the vault");
  } catch (error) {
    console.error("Error forwarding to vault:", error.message);
    console.log("This function can only be called by the contract owner");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });