import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════════");
  console.log("  AXUSD STABLECOIN SYSTEM - ARBITRUM MAINNET DEPLOYMENT");
  console.log("═══════════════════════════════════════════════════════");
  console.log("\nDeployer:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  if (balance < ethers.parseEther("0.003")) {
    throw new Error("Insufficient balance for deployment. Need at least 0.003 ETH");
  }

  const deployedContracts: Record<string, string> = {};

  console.log("\n[1/6] Deploying AxiomStable (AXUSD)...");
  const AxiomStable = await ethers.getContractFactory("AxiomStable");
  const axusd = await AxiomStable.deploy();
  await axusd.waitForDeployment();
  deployedContracts.axusd = await axusd.getAddress();
  console.log("   ✓ AxiomStable:", deployedContracts.axusd);

  console.log("\n[2/6] Deploying OracleAdapter...");
  const OracleAdapter = await ethers.getContractFactory("OracleAdapter");
  const oracle = await OracleAdapter.deploy();
  await oracle.waitForDeployment();
  deployedContracts.oracle = await oracle.getAddress();
  console.log("   ✓ OracleAdapter:", deployedContracts.oracle);

  console.log("\n[3/6] Deploying RateLimiter...");
  const dailyLimit = ethers.parseEther("100000");
  const perAddressLimit = ethers.parseEther("10000");
  const RateLimiter = await ethers.getContractFactory("RateLimiter");
  const rateLimiter = await RateLimiter.deploy(dailyLimit, perAddressLimit);
  await rateLimiter.waitForDeployment();
  deployedContracts.rateLimiter = await rateLimiter.getAddress();
  console.log("   ✓ RateLimiter:", deployedContracts.rateLimiter);

  console.log("\n[4/6] Deploying VaultEngine...");
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
  console.log("   ✓ VaultEngine:", deployedContracts.vaultEngine);

  console.log("\n[5/6] Deploying BackstopVault...");
  const marketOpsLimit = ethers.parseEther("100");
  const emergencyDailyLimit = ethers.parseEther("50");
  const BackstopVault = await ethers.getContractFactory("BackstopVault");
  const backstopVault = await BackstopVault.deploy(marketOpsLimit, emergencyDailyLimit);
  await backstopVault.waitForDeployment();
  deployedContracts.backstopVault = await backstopVault.getAddress();
  console.log("   ✓ BackstopVault:", deployedContracts.backstopVault);

  console.log("\n[6/6] Deploying PSM (placeholder USDC)...");
  const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  const mintFee = 10;
  const redeemFee = 10;
  const psmDebtCeiling = ethers.parseEther("500000");
  const PSM = await ethers.getContractFactory("PSM");
  const psm = await PSM.deploy(
    deployedContracts.axusd,
    USDC_ARBITRUM,
    mintFee,
    redeemFee,
    psmDebtCeiling
  );
  await psm.waitForDeployment();
  deployedContracts.psm = await psm.getAddress();
  console.log("   ✓ PSM:", deployedContracts.psm);

  console.log("\n[7/6] Configuring roles...");
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));
  const RECORDER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RECORDER_ROLE"));

  await axusd.grantRole(MINTER_ROLE, deployedContracts.vaultEngine);
  console.log("   ✓ VaultEngine granted MINTER_ROLE");
  await axusd.grantRole(BURNER_ROLE, deployedContracts.vaultEngine);
  console.log("   ✓ VaultEngine granted BURNER_ROLE");
  await axusd.grantRole(MINTER_ROLE, deployedContracts.psm);
  console.log("   ✓ PSM granted MINTER_ROLE");
  await axusd.grantRole(BURNER_ROLE, deployedContracts.psm);
  console.log("   ✓ PSM granted BURNER_ROLE");
  await rateLimiter.grantRole(RECORDER_ROLE, deployedContracts.vaultEngine);
  console.log("   ✓ VaultEngine granted RECORDER_ROLE");

  const finalBalance = await ethers.provider.getBalance(deployer.address);
  const gasUsed = balance - finalBalance;

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  DEPLOYMENT COMPLETE - ARBITRUM MAINNET");
  console.log("═══════════════════════════════════════════════════════");
  console.log("\nNetwork: Arbitrum One (Chain ID: 42161)");
  console.log("Gas Used:", ethers.formatEther(gasUsed), "ETH");
  console.log("\nDeployed Contracts:");
  console.log(JSON.stringify(deployedContracts, null, 2));
  console.log("\nExplorer: https://arbiscan.io");
  console.log("\nNext Steps:");
  console.log("1. Verify contracts on Arbiscan");
  console.log("2. Add collateral types to VaultEngine");
  console.log("3. Configure oracle price feeds");
  console.log("4. Transfer admin to Safe multisig");

  return deployedContracts;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
