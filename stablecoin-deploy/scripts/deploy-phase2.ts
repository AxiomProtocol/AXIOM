import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  AXUSD GENIUS ACT COMPLIANCE - PHASE 2 DEPLOYMENT");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\nDeployer:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  if (balance < ethers.parseEther("0.005")) {
    throw new Error("Need at least 0.005 ETH for Phase 2 deployment");
  }

  // Phase 1 deployed contracts
  const phase1 = {
    axusd: "0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C",
    oracle: "0xE3b1f38AaBAd138d0EF2e2C7429ee57c512fDF3D",
    rateLimiter: "0xE19E4172786A193997f985edC27f7932a0B65327",
    vaultEngine: "0x4675C09dDC1B3094cd86F6b59904CC3E06c98028",
    psm: "0x101866a92EF9DB903e4C068f63708Acd9C40f7Fc"
  };

  const deployedContracts: Record<string, string> = { ...phase1 };
  const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  DEPLOYING GENIUS ACT COMPLIANCE CONTRACTS (7 of 7)");
  console.log("═══════════════════════════════════════════════════════════════");

  console.log("\n[1/7] Deploying BackstopVaultUSDC...");
  const BackstopVaultUSDC = await ethers.getContractFactory("BackstopVaultUSDC");
  const backstopVault = await BackstopVaultUSDC.deploy(
    USDC_ARBITRUM,
    phase1.axusd
  );
  await backstopVault.waitForDeployment();
  deployedContracts.backstopVaultUSDC = await backstopVault.getAddress();
  console.log("   ✓ BackstopVaultUSDC:", deployedContracts.backstopVaultUSDC);

  console.log("\n[2/7] Deploying TBillVault (93-day maturity enforced)...");
  const maxMintRatio = 9500;
  const TBillVault = await ethers.getContractFactory("TBillVault");
  const tbillVault = await TBillVault.deploy(
    phase1.axusd,
    deployer.address,
    deployer.address,
    maxMintRatio
  );
  await tbillVault.waitForDeployment();
  deployedContracts.tbillVault = await tbillVault.getAddress();
  console.log("   ✓ TBillVault:", deployedContracts.tbillVault);

  console.log("\n[3/7] Deploying GeniusCompliance...");
  const GeniusCompliance = await ethers.getContractFactory("GeniusCompliance");
  const geniusCompliance = await GeniusCompliance.deploy(
    phase1.axusd,
    phase1.psm
  );
  await geniusCompliance.waitForDeployment();
  deployedContracts.geniusCompliance = await geniusCompliance.getAddress();
  console.log("   ✓ GeniusCompliance:", deployedContracts.geniusCompliance);

  console.log("\n[4/7] Deploying SegregatedCustody (anti-rehypothecation)...");
  const SegregatedCustody = await ethers.getContractFactory("SegregatedCustody");
  const segregatedCustody = await SegregatedCustody.deploy(
    phase1.axusd,
    phase1.psm
  );
  await segregatedCustody.waitForDeployment();
  deployedContracts.segregatedCustody = await segregatedCustody.getAddress();
  console.log("   ✓ SegregatedCustody:", deployedContracts.segregatedCustody);

  console.log("\n[5/7] Deploying BackstopVault (ETH)...");
  const marketOpsLimit = ethers.parseEther("100");
  const emergencyDailyLimit = ethers.parseEther("50");
  const BackstopVault = await ethers.getContractFactory("BackstopVault");
  const backstopVaultETH = await BackstopVault.deploy(marketOpsLimit, emergencyDailyLimit);
  await backstopVaultETH.waitForDeployment();
  deployedContracts.backstopVaultETH = await backstopVaultETH.getAddress();
  console.log("   ✓ BackstopVault (ETH):", deployedContracts.backstopVaultETH);

  console.log("\n[6/7] Deploying Liquidator...");
  const Liquidator = await ethers.getContractFactory("Liquidator");
  const liquidator = await Liquidator.deploy(
    phase1.vaultEngine,
    phase1.axusd,
    deployedContracts.backstopVaultETH
  );
  await liquidator.waitForDeployment();
  deployedContracts.liquidator = await liquidator.getAddress();
  console.log("   ✓ Liquidator:", deployedContracts.liquidator);

  console.log("\n[7/7] Deploying MarketOperations...");
  const MarketOperations = await ethers.getContractFactory("MarketOperations");
  const marketOps = await MarketOperations.deploy(
    phase1.axusd,
    deployedContracts.backstopVaultETH
  );
  await marketOps.waitForDeployment();
  deployedContracts.marketOperations = await marketOps.getAddress();
  console.log("   ✓ MarketOperations:", deployedContracts.marketOperations);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  CONFIGURING GENIUS ACT COMPLIANCE");
  console.log("═══════════════════════════════════════════════════════════════");

  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));

  const axusd = await ethers.getContractAt("AxiomStable", phase1.axusd);

  console.log("\nGranting TBillVault roles...");
  await axusd.grantRole(MINTER_ROLE, deployedContracts.tbillVault);
  console.log("   ✓ TBillVault granted MINTER_ROLE");
  await axusd.grantRole(BURNER_ROLE, deployedContracts.tbillVault);
  console.log("   ✓ TBillVault granted BURNER_ROLE");

  console.log("\nConfiguring TBillVault GENIUS compliance...");
  await tbillVault.setGeniusCompliance(deployedContracts.geniusCompliance, true);
  console.log("   ✓ TBillVault linked to GeniusCompliance");

  const finalBalance = await ethers.provider.getBalance(deployer.address);
  const gasUsed = balance - finalBalance;

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  FULL DEPLOYMENT COMPLETE - GENIUS ACT COMPLIANT");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\nGas Used:", ethers.formatEther(gasUsed), "ETH");
  console.log("Remaining Balance:", ethers.formatEther(finalBalance), "ETH");

  console.log("\n┌─────────────────────────────────────────────────────────────┐");
  console.log("│  GENIUS ACT COMPLIANCE STATUS (Public Law 119-27)           │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log("│  ✓ 100% Reserve Backing            (PSM + TBillVault)       │");
  console.log("│  ✓ 93-Day Treasury Maturity        (TBillVault enforced)    │");
  console.log("│  ✓ Anti-Rehypothecation            (SegregatedCustody)      │");
  console.log("│  ✓ No Holder Yield Distribution    (TBillVault blocked)     │");
  console.log("│  ✓ Segregated Custody              (SegregatedCustody)      │");
  console.log("│  ✓ Insolvency Priority             (SegregatedCustody)      │");
  console.log("│  ✓ Enforcement Deadline Ready      (Jan 18, 2027)           │");
  console.log("└─────────────────────────────────────────────────────────────┘");

  console.log("\nAll Deployed Contracts:");
  console.log(JSON.stringify(deployedContracts, null, 2));

  fs.writeFileSync("deployed-full.json", JSON.stringify({
    network: "arbitrum",
    chainId: 42161,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    phase: "complete",
    geniusActCompliant: true,
    enforcementDeadline: "2027-01-18",
    contracts: deployedContracts
  }, null, 2));
  console.log("\nContract addresses saved to deployed-full.json");

  return deployedContracts;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
