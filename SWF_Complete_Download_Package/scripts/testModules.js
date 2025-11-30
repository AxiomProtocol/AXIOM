/**
 * Test Script for SWF Modules
 * 
 * This script provides functions to interact with deployed SWF modules:
 * 1. LiquidityVault - For staking LP tokens
 * 2. GovernanceDividendPool - For rewarding SWF stakers
 * 3. SWFVaultAdapter - For wrapping SWF tokens
 * 
 * Usage: npx hardhat run scripts/testModules.js --network polygon
 */

require('dotenv').config();
const { ethers } = require("hardhat");

async function connectToContracts() {
  // Load deployed addresses from .env
  const LIQUIDITY_VAULT_ADDRESS = process.env.LIQUIDITY_VAULT_ADDRESS;
  const GOVERNANCE_POOL_ADDRESS = process.env.GOVERNANCE_POOL_ADDRESS;
  const VAULT_ADAPTER_ADDRESS = process.env.VAULT_ADAPTER_ADDRESS;
  const SWF_TOKEN_ADDRESS = process.env.SWF_ADDRESS || "0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7";
  
  if (!LIQUIDITY_VAULT_ADDRESS || !GOVERNANCE_POOL_ADDRESS || !VAULT_ADAPTER_ADDRESS) {
    console.error("Error: Module addresses must be set in .env file");
    process.exit(1);
  }
  
  // Connect to deployed contracts
  const liquidityVault = await ethers.getContractAt("LiquidityVault", LIQUIDITY_VAULT_ADDRESS);
  const governanceDividendPool = await ethers.getContractAt("GovernanceDividendPool", GOVERNANCE_POOL_ADDRESS);
  const swfVaultAdapter = await ethers.getContractAt("SWFVaultAdapter", VAULT_ADAPTER_ADDRESS);
  const swfToken = await ethers.getContractAt("IERC20", SWF_TOKEN_ADDRESS);
  
  // Get LP token address
  const lpTokenAddress = await liquidityVault.lpToken();
  const lpToken = await ethers.getContractAt("IERC20", lpTokenAddress);
  
  return {
    liquidityVault,
    governanceDividendPool,
    swfVaultAdapter,
    swfToken,
    lpToken
  };
}

async function checkBalances(contracts, userAddress) {
  const { liquidityVault, governanceDividendPool, swfVaultAdapter, swfToken, lpToken } = contracts;
  
  console.log("\n=== Balance Check ===");
  
  // Check SWF token balance
  const swfBalance = await swfToken.balanceOf(userAddress);
  console.log(`SWF Token Balance: ${ethers.utils.formatEther(swfBalance)} SWF`);
  
  // Check LP token balance
  const lpBalance = await lpToken.balanceOf(userAddress);
  console.log(`LP Token Balance: ${ethers.utils.formatEther(lpBalance)} LP`);
  
  // Check staked LP tokens
  const lpStaked = await liquidityVault.staked(userAddress);
  console.log(`LP Tokens Staked: ${ethers.utils.formatEther(lpStaked)} LP`);
  
  // Check staked SWF tokens
  const swfStaked = await governanceDividendPool.stakes(userAddress);
  console.log(`SWF Tokens Staked: ${ethers.utils.formatEther(swfStaked)} SWF`);
  
  // Check SWF deposits in vault adapter
  const swfDeposited = await swfVaultAdapter.deposits(userAddress);
  console.log(`SWF Tokens Deposited: ${ethers.utils.formatEther(swfDeposited)} SWF`);
  
  // Check MATIC balance
  const maticBalance = await ethers.provider.getBalance(userAddress);
  console.log(`MATIC Balance: ${ethers.utils.formatEther(maticBalance)} MATIC`);
}

async function stakeLPTokens(contracts, amount) {
  const { liquidityVault, lpToken } = contracts;
  const [signer] = await ethers.getSigners();
  
  console.log(`\n=== Staking ${ethers.utils.formatEther(amount)} LP Tokens ===`);
  
  // Approve LP token spending
  console.log("Approving LP token spending...");
  const approveTx = await lpToken.approve(liquidityVault.address, amount);
  await approveTx.wait();
  console.log(`Approval transaction: ${approveTx.hash}`);
  
  // Deposit LP tokens
  console.log("Depositing LP tokens...");
  const stakeTx = await liquidityVault.deposit(amount);
  await stakeTx.wait();
  console.log(`Stake transaction: ${stakeTx.hash}`);
  
  // Get updated staked amount
  const stakedAmount = await liquidityVault.staked(signer.address);
  console.log(`Total LP tokens staked: ${ethers.utils.formatEther(stakedAmount)} LP`);
}

async function stakeSWFTokens(contracts, amount) {
  const { governanceDividendPool, swfToken } = contracts;
  const [signer] = await ethers.getSigners();
  
  console.log(`\n=== Staking ${ethers.utils.formatEther(amount)} SWF Tokens ===`);
  
  // Approve SWF token spending
  console.log("Approving SWF token spending...");
  const approveTx = await swfToken.approve(governanceDividendPool.address, amount);
  await approveTx.wait();
  console.log(`Approval transaction: ${approveTx.hash}`);
  
  // Stake SWF tokens
  console.log("Staking SWF tokens...");
  const stakeTx = await governanceDividendPool.stake(amount);
  await stakeTx.wait();
  console.log(`Stake transaction: ${stakeTx.hash}`);
  
  // Get updated staked amount
  const stakedAmount = await governanceDividendPool.stakes(signer.address);
  console.log(`Total SWF tokens staked: ${ethers.utils.formatEther(stakedAmount)} SWF`);
}

async function depositSWFToVault(contracts, amount) {
  const { swfVaultAdapter, swfToken } = contracts;
  const [signer] = await ethers.getSigners();
  
  console.log(`\n=== Depositing ${ethers.utils.formatEther(amount)} SWF Tokens to Vault Adapter ===`);
  
  // Approve SWF token spending
  console.log("Approving SWF token spending...");
  const approveTx = await swfToken.approve(swfVaultAdapter.address, amount);
  await approveTx.wait();
  console.log(`Approval transaction: ${approveTx.hash}`);
  
  // Deposit SWF tokens
  console.log("Depositing SWF tokens...");
  const depositTx = await swfVaultAdapter.deposit(amount);
  await depositTx.wait();
  console.log(`Deposit transaction: ${depositTx.hash}`);
  
  // Get updated deposit amount
  const depositedAmount = await swfVaultAdapter.deposits(signer.address);
  console.log(`Total SWF tokens deposited: ${ethers.utils.formatEther(depositedAmount)} SWF`);
}

async function claimRewards(contracts) {
  const { governanceDividendPool } = contracts;
  const [signer] = await ethers.getSigners();
  
  console.log("\n=== Claiming Rewards ===");
  
  // Get initial MATIC balance
  const initialBalance = await ethers.provider.getBalance(signer.address);
  console.log(`Initial MATIC balance: ${ethers.utils.formatEther(initialBalance)} MATIC`);
  
  // Claim rewards
  console.log("Claiming rewards...");
  const claimTx = await governanceDividendPool.claim();
  await claimTx.wait();
  console.log(`Claim transaction: ${claimTx.hash}`);
  
  // Get final MATIC balance
  const finalBalance = await ethers.provider.getBalance(signer.address);
  console.log(`Final MATIC balance: ${ethers.utils.formatEther(finalBalance)} MATIC`);
  
  // Calculate rewards (accounting for gas costs)
  const txReceipt = await ethers.provider.getTransactionReceipt(claimTx.hash);
  const gasUsed = txReceipt.gasUsed;
  const gasPrice = claimTx.gasPrice;
  const gasCost = gasUsed.mul(gasPrice);
  
  const reward = finalBalance.add(gasCost).sub(initialBalance);
  console.log(`Rewards claimed: ${ethers.utils.formatEther(reward)} MATIC (after accounting for gas costs)`);
}

async function main() {
  const [signer] = await ethers.getSigners();
  console.log(`Running module tests with address: ${signer.address}`);
  
  // Connect to contracts
  const contracts = await connectToContracts();
  
  // Display contract addresses
  console.log("\n=== Contract Addresses ===");
  console.log(`LiquidityVault: ${contracts.liquidityVault.address}`);
  console.log(`GovernanceDividendPool: ${contracts.governanceDividendPool.address}`);
  console.log(`SWFVaultAdapter: ${contracts.swfVaultAdapter.address}`);
  console.log(`SWF Token: ${contracts.swfToken.address}`);
  console.log(`LP Token: ${contracts.lpToken.address}`);
  
  // Check initial balances
  await checkBalances(contracts, signer.address);
  
  // Example: Uncomment to test specific functions
  // To stake 1 LP token
  // await stakeLPTokens(contracts, ethers.utils.parseEther("1.0"));
  
  // To stake 10 SWF tokens
  // await stakeSWFTokens(contracts, ethers.utils.parseEther("10.0"));
  
  // To deposit 5 SWF tokens to vault adapter
  // await depositSWFToVault(contracts, ethers.utils.parseEther("5.0"));
  
  // To claim rewards
  // await claimRewards(contracts);
  
  // Check final balances
  // await checkBalances(contracts, signer.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });