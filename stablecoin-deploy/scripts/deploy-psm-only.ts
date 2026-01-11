import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  AXUSD - COMPLETING PSM DEPLOYMENT");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\nDeployer:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  // Previously deployed contracts
  const deployedContracts = {
    axusd: "0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C",
    oracle: "0xE3b1f38AaBAd138d0EF2e2C7429ee57c512fDF3D",
    rateLimiter: "0xE19E4172786A193997f985edC27f7932a0B65327",
    vaultEngine: "0x4675C09dDC1B3094cd86F6b59904CC3E06c98028",
    psm: ""
  };

  const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

  console.log("\nDeploying PSM...");
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

  // Connect to already deployed AXUSD
  const axusd = await ethers.getContractAt("AxiomStable", deployedContracts.axusd);
  const rateLimiter = await ethers.getContractAt("RateLimiter", deployedContracts.rateLimiter);

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
