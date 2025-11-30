// scripts/deploy-qualified.js
// Deployment script with qualified contract paths to avoid ambiguity 

const hre = require("hardhat");
const ethers = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment with qualified paths to Polygon Mainnet...");
  
  // Get deployment wallet
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);
  
  // Get balances before deployment
  const balanceBefore = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Account balance before deployment: ${ethers.utils.formatEther(balanceBefore)} MATIC`);
  
  // Load configuration from .env
  const swfTokenAddress = process.env.SWF_TOKEN_ADDRESS;
  const lpTokenAddress = process.env.LP_TOKEN_ADDRESS;
  const lpTokenAddressUSDC = process.env.LP_TOKEN_ADDRESS_USDC;
  const vaultAddress = process.env.VAULT_ADDRESS || process.env.TREASURY_WALLET;
  const monthlyRewardRate = process.env.MONTHLY_REWARD_RATE || "10000000000000000"; // 1% monthly default
  
  console.log("Deployment configuration:");
  console.log("- SWF Token Address:", swfTokenAddress);
  console.log("- ETH LP Token Address:", lpTokenAddress);
  console.log("- USDC LP Token Address:", lpTokenAddressUSDC);
  console.log("- Vault/Treasury Address:", vaultAddress);
  console.log("- Monthly Reward Rate:", monthlyRewardRate);
  
  // Validate addresses
  if (!swfTokenAddress || !ethers.utils.isAddress(swfTokenAddress)) {
    throw new Error("Invalid or missing SWF_TOKEN_ADDRESS in .env file");
  }
  
  if (!lpTokenAddress || !ethers.utils.isAddress(lpTokenAddress)) {
    throw new Error("Invalid or missing LP_TOKEN_ADDRESS (ETH) in .env file");
  }
  
  if (!lpTokenAddressUSDC || !ethers.utils.isAddress(lpTokenAddressUSDC)) {
    throw new Error("Invalid or missing LP_TOKEN_ADDRESS_USDC in .env file");
  }
  
  if (!vaultAddress || !ethers.utils.isAddress(vaultAddress)) {
    throw new Error("Invalid or missing VAULT_ADDRESS/TREASURY_WALLET in .env file");
  }
  
  console.log("Deploying LiquidityVault (ETH)...");
  const LiquidityVaultETH = await hre.ethers.getContractFactory("contracts/CombinedStakingContracts.sol:LiquidityVault");
  const liquidityVaultETH = await LiquidityVaultETH.deploy(lpTokenAddress);
  await liquidityVaultETH.deployed();
  const liquidityVaultETHAddress = liquidityVaultETH.address;
  console.log("LiquidityVault (ETH) deployed to:", liquidityVaultETHAddress);
  
  console.log("Deploying LiquidityVault (USDC)...");
  const LiquidityVaultUSDC = await hre.ethers.getContractFactory("contracts/CombinedStakingContracts.sol:LiquidityVault");
  const liquidityVaultUSDC = await LiquidityVaultUSDC.deploy(lpTokenAddressUSDC);
  await liquidityVaultUSDC.deployed();
  const liquidityVaultUSDCAddress = liquidityVaultUSDC.address;
  console.log("LiquidityVault (USDC) deployed to:", liquidityVaultUSDCAddress);
  
  console.log("Deploying GovernanceDividendPool...");
  const GovernanceDividendPool = await hre.ethers.getContractFactory("contracts/CombinedStakingContracts.sol:GovernanceDividendPool");
  const governanceDividendPool = await GovernanceDividendPool.deploy(swfTokenAddress, monthlyRewardRate);
  await governanceDividendPool.deployed();
  const governanceDividendPoolAddress = governanceDividendPool.address;
  console.log("GovernanceDividendPool deployed to:", governanceDividendPoolAddress);
  
  console.log("Deploying SWFVaultAdapter...");
  const SWFVaultAdapter = await hre.ethers.getContractFactory("contracts/CombinedStakingContracts.sol:SWFVaultAdapter");
  const swfVaultAdapter = await SWFVaultAdapter.deploy(swfTokenAddress, vaultAddress);
  await swfVaultAdapter.deployed();
  const swfVaultAdapterAddress = swfVaultAdapter.address;
  console.log("SWFVaultAdapter deployed to:", swfVaultAdapterAddress);
  
  // Get balances after deployment
  const balanceAfter = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Account balance after deployment: ${ethers.utils.formatEther(balanceAfter)} MATIC`);
  console.log(`Total deployment cost: ${ethers.utils.formatEther(balanceBefore - balanceAfter)} MATIC`);
  
  // Create deployment result file
  const deploymentResult = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    swfToken: swfTokenAddress,
    liquidityVaultETH: liquidityVaultETHAddress,
    liquidityVaultUSDC: liquidityVaultUSDCAddress,
    governancePool: governanceDividendPoolAddress,
    vaultAdapter: swfVaultAdapterAddress,
    lpTokenETH: lpTokenAddress,
    lpTokenUSDC: lpTokenAddressUSDC,
    treasury: vaultAddress
  };
  
  // Save deployment info
  const deploymentPath = path.join(process.cwd(), "staking-modules-latest.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentResult, null, 2));
  console.log(`Deployment information saved to ${deploymentPath}`);
  
  // Update .env file with new addresses
  updateEnvFile(
    liquidityVaultETHAddress,
    liquidityVaultUSDCAddress,
    governanceDividendPoolAddress,
    swfVaultAdapterAddress
  );
  
  console.log("Deployment complete!");
  console.log(`
  Next steps:
  1. Verify contracts on PolygonScan: run 'npx hardhat run scripts/verify-contracts.js --network polygon'
  2. Set up the frontend with the new contract addresses
  3. Initialize contracts with initial liquidity
  `);
}

function updateEnvFile(
  liquidityVaultETHAddress,
  liquidityVaultUSDCAddress,
  governancePoolAddress,
  vaultAdapterAddress
) {
  try {
    const envPath = path.join(process.cwd(), ".env");
    let envContent = fs.readFileSync(envPath, "utf8");
    
    // Update new addresses
    envContent = envContent.replace(/LIQUIDITY_VAULT_ETH=0x[a-fA-F0-9]*/g, `LIQUIDITY_VAULT_ETH=${liquidityVaultETHAddress}`);
    envContent = envContent.replace(/LIQUIDITY_VAULT_USDC=0x[a-fA-F0-9]*/g, `LIQUIDITY_VAULT_USDC=${liquidityVaultUSDCAddress}`);
    envContent = envContent.replace(/GOVERNANCE_POOL=0x[a-fA-F0-9]*/g, `GOVERNANCE_POOL=${governancePoolAddress}`);
    envContent = envContent.replace(/VAULT_ADAPTER=0x[a-fA-F0-9]*/g, `VAULT_ADAPTER=${vaultAdapterAddress}`);
    
    // Update legacy addresses for backwards compatibility
    envContent = envContent.replace(/LIQUIDITY_VAULT_ADDRESS=0x[a-fA-F0-9]*/g, `LIQUIDITY_VAULT_ADDRESS=${liquidityVaultETHAddress}`);
    envContent = envContent.replace(/GOVERNANCE_POOL_ADDRESS=0x[a-fA-F0-9]*/g, `GOVERNANCE_POOL_ADDRESS=${governancePoolAddress}`);
    envContent = envContent.replace(/VAULT_ADAPTER_ADDRESS=0x[a-fA-F0-9]*/g, `VAULT_ADAPTER_ADDRESS=${vaultAdapterAddress}`);
    
    fs.writeFileSync(envPath, envContent);
    console.log("Updated .env file with new contract addresses");
  } catch (error) {
    console.error("Error updating .env file:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});