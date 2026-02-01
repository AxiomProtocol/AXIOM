import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying AXUSD Stablecoin System to Arbitrum Sepolia...");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const deployedContracts: Record<string, string> = {};

  console.log("\n1. Deploying AxiomStable (AXUSD)...");
  const AxiomStable = await ethers.getContractFactory("AxiomStable");
  const axusd = await AxiomStable.deploy();
  await axusd.waitForDeployment();
  deployedContracts.axusd = await axusd.getAddress();
  console.log("   AxiomStable deployed:", deployedContracts.axusd);

  console.log("\n2. Deploying OracleAdapter...");
  const OracleAdapter = await ethers.getContractFactory("OracleAdapter");
  const oracle = await OracleAdapter.deploy();
  await oracle.waitForDeployment();
  deployedContracts.oracle = await oracle.getAddress();
  console.log("   OracleAdapter deployed:", deployedContracts.oracle);

  console.log("\n3. Deploying RateLimiter...");
  const dailyLimit = ethers.parseEther("100000");
  const perAddressLimit = ethers.parseEther("10000");
  const RateLimiter = await ethers.getContractFactory("RateLimiter");
  const rateLimiter = await RateLimiter.deploy(dailyLimit, perAddressLimit);
  await rateLimiter.waitForDeployment();
  deployedContracts.rateLimiter = await rateLimiter.getAddress();
  console.log("   RateLimiter deployed:", deployedContracts.rateLimiter);

  console.log("\n4. Deploying VaultEngine...");
  const globalDebtCeiling = ethers.parseEther("1000000");
  const VaultEngine = await ethers.getContractFactory("VaultEngine");
  const vaultEngine = await VaultEngine.deploy(
    deployedContracts.axusd,
    deployedContracts.oracle,
    deployedContracts.rateLimiter,
    globalDebtCeiling
  );
  await vaultEngine.waitForDeployment();
  deployedContracts.vaultEngine = await vaultEngine.getAddress();
  console.log("   VaultEngine deployed:", deployedContracts.vaultEngine);

  console.log("\n5. Deploying BackstopVault...");
  const marketOpsLimit = ethers.parseEther("100");
  const emergencyDailyLimit = ethers.parseEther("50");
  const BackstopVault = await ethers.getContractFactory("BackstopVault");
  const backstopVault = await BackstopVault.deploy(marketOpsLimit, emergencyDailyLimit);
  await backstopVault.waitForDeployment();
  deployedContracts.backstopVault = await backstopVault.getAddress();
  console.log("   BackstopVault deployed:", deployedContracts.backstopVault);

  console.log("\n6. Deploying PSM...");
  const mockUSDC = ethers.ZeroAddress;
  const mintFee = 10;
  const redeemFee = 10;
  const psmDebtCeiling = ethers.parseEther("500000");
  const PSM = await ethers.getContractFactory("PSM");
  const psm = await PSM.deploy(
    deployedContracts.axusd,
    mockUSDC,
    mintFee,
    redeemFee,
    psmDebtCeiling
  );
  await psm.waitForDeployment();
  deployedContracts.psm = await psm.getAddress();
  console.log("   PSM deployed:", deployedContracts.psm);
  console.log("   Note: PSM uses zero address for USDC - update with real testnet USDC");

  console.log("\n7. Setting up roles...");
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));
  const RECORDER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RECORDER_ROLE"));

  await axusd.grantRole(MINTER_ROLE, deployedContracts.vaultEngine);
  await axusd.grantRole(BURNER_ROLE, deployedContracts.vaultEngine);
  await axusd.grantRole(MINTER_ROLE, deployedContracts.psm);
  await axusd.grantRole(BURNER_ROLE, deployedContracts.psm);
  await rateLimiter.grantRole(RECORDER_ROLE, deployedContracts.vaultEngine);
  console.log("   Roles configured successfully");

  console.log("\n========================================");
  console.log("AXUSD TESTNET DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log("\nDeployed Contracts:");
  console.log(JSON.stringify(deployedContracts, null, 2));
  console.log("\nNetwork: Arbitrum Sepolia (Chain ID: 421614)");
  console.log("Explorer: https://sepolia.arbiscan.io");
  console.log("\nNext Steps:");
  console.log("1. Verify contracts on Arbiscan");
  console.log("2. Update PSM with real testnet USDC address");
  console.log("3. Add collateral types to VaultEngine");
  console.log("4. Begin 30+ day testing period");

  return deployedContracts;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
