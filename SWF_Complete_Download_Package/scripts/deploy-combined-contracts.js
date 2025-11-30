const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  // Get token and LP addresses from environment variables
  const swfTokenAddress = process.env.SWF_TOKEN_ADDRESS;
  const lpTokenAddressETH = process.env.LP_TOKEN_ADDRESS;
  const lpTokenAddressUSDC = process.env.LP_TOKEN_ADDRESS_USDC;
  const treasuryAddress = process.env.TREASURY_WALLET || deployer.address;
  
  console.log("Using SWF token address:", swfTokenAddress);
  console.log("Using LP token addresses:");
  console.log("- SWF/ETH LP:", lpTokenAddressETH);
  console.log("- SWF/USDC LP:", lpTokenAddressUSDC);
  console.log("Using treasury address:", treasuryAddress);
  
  // Verify all required addresses are available
  if (!swfTokenAddress || !lpTokenAddressETH || !lpTokenAddressUSDC) {
    console.error("Missing required environment variables. Please set:");
    console.error("- SWF_TOKEN_ADDRESS");
    console.error("- LP_TOKEN_ADDRESS (ETH)");
    console.error("- LP_TOKEN_ADDRESS_USDC");
    process.exit(1);
  }
  
  // Using ABI fragments directly to avoid ambiguity issues
  const contractBytecode = await ethers.getContractFactory("LiquidityVault");
  const liquidityVaultBytecode = contractBytecode.bytecode;
  const governancePoolBytecode = await ethers.getContractFactory("GovernanceDividendPool").then(f => f.bytecode);
  const vaultAdapterBytecode = await ethers.getContractFactory("SWFVaultAdapter").then(f => f.bytecode);
  
  // Prepare ABIs
  const liquidityVaultAbi = [
    "constructor(address _lpToken)",
    "function deposit(uint256 amount) external",
    "function withdraw(uint256 amount) external",
    "function balanceOf(address user) external view returns (uint256)"
  ];
  
  const governancePoolAbi = [
    "constructor(address _swfToken, uint256 _rate)",
    "function stake(uint256 amount) external",
    "function withdraw(uint256 amount) external",
    "function claim() external"
  ];
  
  const vaultAdapterAbi = [
    "constructor(address _swf, address _vault)",
    "function deposit(uint256 amount) external",
    "function withdraw(uint256 amount) external",
    "function forwardToVault(uint256 amount) external"
  ];
  
  // Deploy LiquidityVault for ETH
  console.log("Deploying LiquidityVault for SWF/ETH pair...");
  const LiquidityVaultETHFactory = new ethers.ContractFactory(
    liquidityVaultAbi,
    liquidityVaultBytecode,
    deployer
  );
  const liquidityVaultETH = await LiquidityVaultETHFactory.deploy(lpTokenAddressETH);
  await liquidityVaultETH.deployed();
  console.log("LiquidityVault (ETH) deployed to:", liquidityVaultETH.address);
  
  // Deploy LiquidityVault for USDC
  console.log("Deploying LiquidityVault for SWF/USDC pair...");
  const LiquidityVaultUSDCFactory = new ethers.ContractFactory(
    liquidityVaultAbi,
    liquidityVaultBytecode,
    deployer
  );
  const liquidityVaultUSDC = await LiquidityVaultUSDCFactory.deploy(lpTokenAddressUSDC);
  await liquidityVaultUSDC.deployed();
  console.log("LiquidityVault (USDC) deployed to:", liquidityVaultUSDC.address);
  
  // Deploy GovernanceDividendPool
  console.log("Deploying GovernanceDividendPool...");
  const rewardRate = ethers.utils.parseEther("0.01"); // 1% monthly
  const GovernancePoolFactory = new ethers.ContractFactory(
    governancePoolAbi,
    governancePoolBytecode,
    deployer
  );
  const governancePool = await GovernancePoolFactory.deploy(swfTokenAddress, rewardRate);
  await governancePool.deployed();
  console.log("GovernanceDividendPool deployed to:", governancePool.address);
  
  // Deploy SWFVaultAdapter
  console.log("Deploying SWFVaultAdapter...");
  const VaultAdapterFactory = new ethers.ContractFactory(
    vaultAdapterAbi,
    vaultAdapterBytecode,
    deployer
  );
  const vaultAdapter = await VaultAdapterFactory.deploy(swfTokenAddress, treasuryAddress);
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

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });