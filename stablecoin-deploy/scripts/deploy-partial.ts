import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  AXUSD STABLECOIN - PARTIAL DEPLOYMENT (Phase 1)");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\nDeployer:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  const deployedContracts: Record<string, string> = {};
  const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  DEPLOYING CORE CONTRACTS (5 of 12)");
  console.log("═══════════════════════════════════════════════════════════════");

  console.log("\n[1/5] Deploying AxiomStable (AXUSD)...");
  const AxiomStable = await ethers.getContractFactory("AxiomStable");
  const axusd = await AxiomStable.deploy();
  await axusd.waitForDeployment();
  deployedContracts.axusd = await axusd.getAddress();
  console.log("   ✓ AxiomStable:", deployedContracts.axusd);

  console.log("\n[2/5] Deploying OracleAdapter...");
  const OracleAdapter = await ethers.getContractFactory("OracleAdapter");
  const oracle = await OracleAdapter.deploy();
  await oracle.waitForDeployment();
  deployedContracts.oracle = await oracle.getAddress();
  console.log("   ✓ OracleAdapter:", deployedContracts.oracle);

  console.log("\n[3/5] Deploying RateLimiter...");
  const dailyLimit = ethers.parseEther("100000");
  const perAddressLimit = ethers.parseEther("10000");
  const RateLimiter = await ethers.getContractFactory("RateLimiter");
  const rateLimiter = await RateLimiter.deploy(dailyLimit, perAddressLimit);
  await rateLimiter.waitForDeployment();
  deployedContracts.rateLimiter = await rateLimiter.getAddress();
  console.log("   ✓ RateLimiter:", deployedContracts.rateLimiter);

  console.log("\n[4/5] Deploying VaultEngine...");
  const globalDebtCeiling = ethers.parseEther("10000000");
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

  console.log("\n[5/5] Deploying PSM...");
  const usdcDecimals = 6;
  const mintFee = 10;
  const redeemFee = 10;
  const psmDebtCeiling = ethers.parseEther("5000000");
  const PSM = await ethers.getContractFactory("PSM");
  const psm = await PSM.deploy(
    deployedContracts.axusd,
    USDC_ARBITRUM,
    usdcDecimals,
    mintFee,
    redeemFee,
    psmDebtCeiling
  );
  await psm.waitForDeployment();
  deployedContracts.psm = await psm.getAddress();
  console.log("   ✓ PSM:", deployedContracts.psm);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  CONFIGURING ROLES");
  console.log("═══════════════════════════════════════════════════════════════");

  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));
  const RECORDER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RECORDER_ROLE"));

  console.log("\nGranting AXUSD roles...");
  await axusd.grantRole(MINTER_ROLE, deployedContracts.vaultEngine);
  console.log("   ✓ VaultEngine granted MINTER_ROLE");
  await axusd.grantRole(BURNER_ROLE, deployedContracts.vaultEngine);
  console.log("   ✓ VaultEngine granted BURNER_ROLE");
  await axusd.grantRole(MINTER_ROLE, deployedContracts.psm);
  console.log("   ✓ PSM granted MINTER_ROLE");
  await axusd.grantRole(BURNER_ROLE, deployedContracts.psm);
  console.log("   ✓ PSM granted BURNER_ROLE");

  console.log("\nGranting RateLimiter roles...");
  await rateLimiter.grantRole(RECORDER_ROLE, deployedContracts.vaultEngine);
  console.log("   ✓ VaultEngine granted RECORDER_ROLE");

  const finalBalance = await ethers.provider.getBalance(deployer.address);
  const gasUsed = balance - finalBalance;

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  PHASE 1 DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\nGas Used:", ethers.formatEther(gasUsed), "ETH");
  console.log("Remaining Balance:", ethers.formatEther(finalBalance), "ETH");

  console.log("\n┌─────────────────────────────────────────────────────────────┐");
  console.log("│  DEPLOYED CONTRACTS (Phase 1)                               │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log("│  ✓ AxiomStable (AXUSD Token)                                │");
  console.log("│  ✓ OracleAdapter (Price Feeds)                              │");
  console.log("│  ✓ RateLimiter (Mint Limits)                                │");
  console.log("│  ✓ VaultEngine (CDP Engine)                                 │");
  console.log("│  ✓ PSM (USDC 1:1 Minting)                                   │");
  console.log("└─────────────────────────────────────────────────────────────┘");

  console.log("\n┌─────────────────────────────────────────────────────────────┐");
  console.log("│  PENDING CONTRACTS (Phase 2 - Need More ETH)                │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log("│  ○ BackstopVaultUSDC                                        │");
  console.log("│  ○ TBillVault (93-day maturity)                             │");
  console.log("│  ○ GeniusCompliance                                         │");
  console.log("│  ○ SegregatedCustody                                        │");
  console.log("│  ○ BackstopVault (ETH)                                      │");
  console.log("│  ○ Liquidator                                               │");
  console.log("│  ○ MarketOperations                                         │");
  console.log("└─────────────────────────────────────────────────────────────┘");

  console.log("\nDeployed Contracts:");
  console.log(JSON.stringify(deployedContracts, null, 2));

  fs.writeFileSync("deployed-phase1.json", JSON.stringify({
    network: "arbitrum",
    chainId: 42161,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    phase: 1,
    contracts: deployedContracts,
    pending: [
      "BackstopVaultUSDC",
      "TBillVault",
      "GeniusCompliance",
      "SegregatedCustody",
      "BackstopVault",
      "Liquidator",
      "MarketOperations"
    ]
  }, null, 2));
  console.log("\nContract addresses saved to deployed-phase1.json");

  return deployedContracts;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
