// scripts/deploy-qualified.js

const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Configure deployment values from environment variables (or use defaults if not available)
  const swfTokenAddress = process.env.SWF_TOKEN_ADDRESS || "0x15AD65Fb62CD9147Aa4443dA89828A693228b5F7";
  const lpTokenAddressETH = process.env.LP_TOKEN_ADDRESS || "0xb23F5d348fa157393E75Bc80C92516F81786Fc28";
  const lpTokenAddressUSDC = process.env.LP_TOKEN_ADDRESS_USDC || "0x7f47199A8a5ff683FeDb86c782adb80eF598D5E0";
  const treasuryAddress = process.env.TREASURY_WALLET || "0x26a8401287ce33cc4AEb5a106cD6D282a9c2f51D";
  const monthlyRewardRate = process.env.MONTHLY_REWARD_RATE || "10000000000000000"; // 1% monthly

  console.log("Using SWF token address:", swfTokenAddress);
  console.log("Using LP token addresses:");
  console.log("- SWF/ETH LP:", lpTokenAddressETH);
  console.log("- SWF/USDC LP:", lpTokenAddressUSDC);
  console.log("Using treasury address:", treasuryAddress);
  console.log("Using monthly reward rate:", monthlyRewardRate);

  // Deploy LiquidityVault (ETH)
  console.log("Deploying LiquidityVault for SWF/ETH pair...");
  const LiquidityVaultETH = await hre.ethers.getContractFactory("contracts/CombinedStakingContracts.sol:LiquidityVault");
  const liquidityVaultETH = await LiquidityVaultETH.deploy(lpTokenAddressETH);
  await liquidityVaultETH.deployed();
  console.log("LiquidityVault (ETH) deployed to:", liquidityVaultETH.address);

  // Deploy LiquidityVault (USDC)
  console.log("Deploying LiquidityVault for SWF/USDC pair...");
  const LiquidityVaultUSDC = await hre.ethers.getContractFactory("contracts/CombinedStakingContracts.sol:LiquidityVault");
  const liquidityVaultUSDC = await LiquidityVaultUSDC.deploy(lpTokenAddressUSDC);
  await liquidityVaultUSDC.deployed();
  console.log("LiquidityVault (USDC) deployed to:", liquidityVaultUSDC.address);

  // Deploy GovernanceDividendPool
  console.log("Deploying GovernanceDividendPool...");
  const GovernanceDividendPool = await hre.ethers.getContractFactory("contracts/CombinedStakingContracts.sol:GovernanceDividendPool");
  const governancePool = await GovernanceDividendPool.deploy(swfTokenAddress, monthlyRewardRate);
  await governancePool.deployed();
  console.log("GovernanceDividendPool deployed to:", governancePool.address);

  // Deploy SWFVaultAdapter
  console.log("Deploying SWFVaultAdapter...");
  const VaultAdapter = await hre.ethers.getContractFactory("contracts/CombinedStakingContracts.sol:SWFVaultAdapter");
  const vaultAdapter = await VaultAdapter.deploy(swfTokenAddress, treasuryAddress);
  await vaultAdapter.deployed();
  console.log("SWFVaultAdapter deployed to:", vaultAdapter.address);

  // Save deployment information
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});