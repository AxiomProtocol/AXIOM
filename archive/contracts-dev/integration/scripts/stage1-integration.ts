/**
 * Stage 1: Core Security & Token Plumbing Integration Script
 * Connects Identity, Compliance, Treasury, and Staking systems
 * FAIL-FAST MODE: Exits immediately on critical errors
 */

import { ethers } from "hardhat";
import { ALL_CONTRACTS, CORE_CONTRACTS } from "../config/contracts.config";
import { STAGE_1 } from "../config/integration-stages";

interface StepResult {
  step: string;
  success: boolean;
  error?: string;
  txHash?: string;
}

const results: StepResult[] = [];

function recordStep(step: string, success: boolean, txHash?: string, error?: string) {
  results.push({ step, success, txHash, error });
  if (!success && error) {
    console.error(`   ❌ FAILED: ${error}`);
  }
}

async function main() {
  console.log("\n========================================");
  console.log("🔗 STAGE 1: CORE SECURITY & TOKEN PLUMBING");
  console.log("========================================\n");

  // Actual admin who has DEFAULT_ADMIN_ROLE on contracts
  const ADMIN_ADDRESS = "0x93696b537d814Aed5875C4490143195983AED365";
  const network = await ethers.provider.getNetwork();
  
  let deployer;
  if (network.chainId === 31337n) {
    // Running on Hardhat fork - impersonate actual admin
    console.log("🔄 Hardhat fork detected - applying fixes...");
    
    // FIX: Mine one block to avoid "no known hardfork" error
    // This moves execution past the historical fork block
    console.log("   ⛏️  Mining block to bypass hardfork detection issue...");
    await ethers.provider.send("hardhat_mine", ["0x1"]);
    console.log("   ✅ Block mined successfully");
    
    console.log("   🔑 Impersonating contract admin...");
    console.log("   👤 Admin address:", ADMIN_ADDRESS);
    await ethers.provider.send("hardhat_impersonateAccount", [ADMIN_ADDRESS]);
    await ethers.provider.send("hardhat_setBalance", [
      ADMIN_ADDRESS,
      ethers.toQuantity(ethers.parseEther("1000"))
    ]);
    deployer = await ethers.getSigner(ADMIN_ADDRESS);
    console.log("   ✅ Impersonation successful\n");
  } else {
    // Running on real network - use the signer with private key
    [deployer] = await ethers.getSigners();
    console.log("⚠️  WARNING: Executing on REAL network");
    console.log("   Make sure the signer has admin rights on all contracts\n");
  }
  
  console.log("Executing as:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Connect to deployed contracts
  console.log("📡 Connecting to deployed contracts...\n");
  
  const axmToken = await ethers.getContractAt(
    "AxiomV2",
    CORE_CONTRACTS.AXM_TOKEN.address,
    deployer  // Use the deployer signer explicitly
  );
  
  const identityHub = await ethers.getContractAt(
    "AxiomIdentityComplianceHub",
    CORE_CONTRACTS.IDENTITY_COMPLIANCE_HUB.address,
    deployer
  );
  
  const treasury = await ethers.getContractAt(
    "AxiomTreasuryAndRevenueHub",
    CORE_CONTRACTS.TREASURY_REVENUE_HUB.address,
    deployer
  );
  
  const staking = await ethers.getContractAt(
    "AxiomStakingAndEmissionsHub",
    CORE_CONTRACTS.STAKING_EMISSIONS_HUB.address,
    deployer
  );
  
  const credentialRegistry = await ethers.getContractAt(
    "CitizenCredentialRegistry",
    CORE_CONTRACTS.CITIZEN_CREDENTIAL_REGISTRY.address,
    deployer
  );

  console.log("✅ All contracts connected\n");

  // ========================================
  // STEP 1: Grant Role - Treasury MINTER_ROLE on AXM
  // ========================================
  console.log("🔐 Step 1: Granting MINTER_ROLE to Treasury on AXM token...");
  const MINTER_ROLE = CORE_CONTRACTS.AXM_TOKEN.roles.MINTER_ROLE;
  const hasMinterRole = await axmToken.hasRole(MINTER_ROLE, CORE_CONTRACTS.TREASURY_REVENUE_HUB.address);
  
  if (hasMinterRole) {
    console.log("   ✓ Treasury already has MINTER_ROLE on AXM");
    recordStep("Grant MINTER_ROLE to Treasury", true);
  } else {
    const tx = await axmToken.grantRole(MINTER_ROLE, CORE_CONTRACTS.TREASURY_REVENUE_HUB.address);
    const receipt = await tx.wait();
    if (receipt.status === 1) {
      console.log("   ✅ MINTER_ROLE granted to Treasury");
      console.log("   Transaction:", tx.hash);
      recordStep("Grant MINTER_ROLE to Treasury", true, tx.hash);
    } else {
      recordStep("Grant MINTER_ROLE to Treasury", false, tx.hash, "Transaction failed");
      throw new Error("Failed to grant MINTER_ROLE to Treasury");
    }
  }
  console.log("");

  // ========================================
  // STEP 2: Grant Role - Treasury FEE_MANAGER_ROLE on AXM
  // ========================================
  console.log("🔐 Step 2: Granting FEE_MANAGER_ROLE to Treasury on AXM token...");
  const FEE_MANAGER_ROLE = CORE_CONTRACTS.AXM_TOKEN.roles.FEE_MANAGER_ROLE;
  const hasFeeManagerRole = await axmToken.hasRole(FEE_MANAGER_ROLE, CORE_CONTRACTS.TREASURY_REVENUE_HUB.address);
  
  if (hasFeeManagerRole) {
    console.log("   ✓ Treasury already has FEE_MANAGER_ROLE on AXM");
    recordStep("Grant FEE_MANAGER_ROLE to Treasury", true);
  } else {
    const tx = await axmToken.grantRole(FEE_MANAGER_ROLE, CORE_CONTRACTS.TREASURY_REVENUE_HUB.address);
    const receipt = await tx.wait();
    if (receipt.status === 1) {
      console.log("   ✅ FEE_MANAGER_ROLE granted to Treasury");
      console.log("   Transaction:", tx.hash);
      recordStep("Grant FEE_MANAGER_ROLE to Treasury", true, tx.hash);
    } else {
      recordStep("Grant FEE_MANAGER_ROLE to Treasury", false, tx.hash, "Transaction failed");
      throw new Error("Failed to grant FEE_MANAGER_ROLE to Treasury");
    }
  }
  console.log("");

  // ========================================
  // STEP 3: Grant Role - Treasury REWARD_FUNDER_ROLE on Staking
  // ========================================
  console.log("🔐 Step 3: Granting REWARD_FUNDER_ROLE to Treasury on Staking Hub...");
  const REWARD_FUNDER_ROLE = CORE_CONTRACTS.STAKING_EMISSIONS_HUB.roles.REWARD_FUNDER_ROLE;
  const hasRewardFunderRole = await staking.hasRole(REWARD_FUNDER_ROLE, CORE_CONTRACTS.TREASURY_REVENUE_HUB.address);
  
  if (hasRewardFunderRole) {
    console.log("   ✓ Treasury already has REWARD_FUNDER_ROLE on Staking");
    recordStep("Grant REWARD_FUNDER_ROLE to Treasury", true);
  } else {
    const tx = await staking.grantRole(REWARD_FUNDER_ROLE, CORE_CONTRACTS.TREASURY_REVENUE_HUB.address);
    const receipt = await tx.wait();
    if (receipt.status === 1) {
      console.log("   ✅ REWARD_FUNDER_ROLE granted to Treasury");
      console.log("   Transaction:", tx.hash);
      recordStep("Grant REWARD_FUNDER_ROLE to Treasury", true, tx.hash);
    } else {
      recordStep("Grant REWARD_FUNDER_ROLE to Treasury", false, tx.hash, "Transaction failed");
      throw new Error("Failed to grant REWARD_FUNDER_ROLE to Treasury");
    }
  }
  console.log("");

  // ========================================
  // STEP 4: Grant Role - Identity Hub COMPLIANCE_ROLE on AXM
  // ========================================
  console.log("🔐 Step 4: Granting COMPLIANCE_ROLE to Identity Hub on AXM token...");
  const COMPLIANCE_ROLE = CORE_CONTRACTS.AXM_TOKEN.roles.COMPLIANCE_ROLE;
  const hasComplianceRole = await axmToken.hasRole(COMPLIANCE_ROLE, CORE_CONTRACTS.IDENTITY_COMPLIANCE_HUB.address);
  
  if (hasComplianceRole) {
    console.log("   ✓ Identity Hub already has COMPLIANCE_ROLE on AXM");
    recordStep("Grant COMPLIANCE_ROLE to Identity Hub", true);
  } else {
    const tx = await axmToken.grantRole(COMPLIANCE_ROLE, CORE_CONTRACTS.IDENTITY_COMPLIANCE_HUB.address);
    const receipt = await tx.wait();
    if (receipt.status === 1) {
      console.log("   ✅ COMPLIANCE_ROLE granted to Identity Hub");
      console.log("   Transaction:", tx.hash);
      recordStep("Grant COMPLIANCE_ROLE to Identity Hub", true, tx.hash);
    } else {
      recordStep("Grant COMPLIANCE_ROLE to Identity Hub", false, tx.hash, "Transaction failed");
      throw new Error("Failed to grant COMPLIANCE_ROLE to Identity Hub");
    }
  }
  console.log("");

  // ========================================
  // STEP 5: Grant Role - Identity Hub ISSUER_ROLE on Credential Registry
  // ========================================
  console.log("🔐 Step 5: Granting ISSUER_ROLE to Identity Hub on Credential Registry...");
  const ISSUER_ROLE = CORE_CONTRACTS.CITIZEN_CREDENTIAL_REGISTRY.roles.ISSUER_ROLE;
  const hasIssuerRole = await credentialRegistry.hasRole(ISSUER_ROLE, CORE_CONTRACTS.IDENTITY_COMPLIANCE_HUB.address);
  
  if (hasIssuerRole) {
    console.log("   ✓ Identity Hub already has ISSUER_ROLE on Credential Registry");
    recordStep("Grant ISSUER_ROLE to Identity Hub", true);
  } else {
    const tx = await credentialRegistry.grantRole(ISSUER_ROLE, CORE_CONTRACTS.IDENTITY_COMPLIANCE_HUB.address);
    const receipt = await tx.wait();
    if (receipt.status === 1) {
      console.log("   ✅ ISSUER_ROLE granted to Identity Hub");
      console.log("   Transaction:", tx.hash);
      recordStep("Grant ISSUER_ROLE to Identity Hub", true, tx.hash);
    } else {
      recordStep("Grant ISSUER_ROLE to Identity Hub", false, tx.hash, "Transaction failed");
      throw new Error("Failed to grant ISSUER_ROLE to Identity Hub");
    }
  }
  console.log("");

  // ========================================
  // STEP 6: Set Compliance Module on AXM (OPTIONAL)
  // ========================================
  console.log("⚙️  Step 6: Setting Compliance Module on AXM token...");
  try {
    if (typeof axmToken.setComplianceModule === 'function') {
      const tx = await axmToken.setComplianceModule(CORE_CONTRACTS.IDENTITY_COMPLIANCE_HUB.address);
      const receipt = await tx.wait();
      if (receipt.status === 1) {
        console.log("   ✅ Compliance Module set to Identity Hub");
        console.log("   Transaction:", tx.hash);
        recordStep("Set Compliance Module", true, tx.hash);
      } else {
        console.log("   ⚠️  Compliance Module configuration failed");
        recordStep("Set Compliance Module", false, tx.hash, "Transaction failed");
      }
    } else {
      console.log("   ⚠️  setComplianceModule function not found - skipping (non-critical)");
      recordStep("Set Compliance Module", true, undefined, "Function not available");
    }
  } catch (error: any) {
    console.log("   ⚠️  Error setting compliance module (non-critical):", error.message);
    recordStep("Set Compliance Module", false, undefined, error.message);
  }
  console.log("");

  // ========================================
  // STEP 7: Configure Treasury Vaults (OPTIONAL)
  // ========================================
  console.log("⚙️  Step 7: Configuring Treasury Vaults...");
  const vaults = [
    { name: "BURN", id: ethers.id("BURN"), address: CORE_CONTRACTS.TREASURY_REVENUE_HUB.vaults.BURN },
    { name: "STAKING", id: ethers.id("STAKING"), address: CORE_CONTRACTS.TREASURY_REVENUE_HUB.vaults.STAKING },
    { name: "LIQUIDITY", id: ethers.id("LIQUIDITY"), address: CORE_CONTRACTS.TREASURY_REVENUE_HUB.vaults.LIQUIDITY },
    { name: "DIVIDEND", id: ethers.id("DIVIDEND"), address: CORE_CONTRACTS.TREASURY_REVENUE_HUB.vaults.DIVIDEND },
    { name: "TREASURY", id: ethers.id("TREASURY"), address: CORE_CONTRACTS.TREASURY_REVENUE_HUB.vaults.TREASURY }
  ];

  for (const vault of vaults) {
    try {
      if (typeof treasury.setVault === 'function') {
        const tx = await treasury.setVault(vault.id, vault.address);
        const receipt = await tx.wait();
        if (receipt.status === 1) {
          console.log(`   ✅ ${vault.name} vault configured at ${vault.address}`);
          recordStep(`Configure ${vault.name} vault`, true, tx.hash);
        } else {
          console.log(`   ⚠️  ${vault.name} vault configuration failed`);
          recordStep(`Configure ${vault.name} vault`, false, tx.hash, "Transaction failed");
        }
      } else {
        console.log(`   ⚠️  setVault function not available - skipping vault configuration`);
        break;
      }
    } catch (error: any) {
      console.log(`   ⚠️  ${vault.name} vault configuration failed (non-critical):`, error.message);
      recordStep(`Configure ${vault.name} vault`, false, undefined, error.message);
    }
  }
  console.log("");

  // ========================================
  // CRITICAL POST-EXECUTION VERIFICATION
  // ========================================
  console.log("========================================");
  console.log("🔍 CRITICAL VERIFICATION (On-Chain State)");
  console.log("========================================\n");

  const criticalVerifications = [
    {
      name: "Treasury has MINTER_ROLE on AXM",
      check: async () => await axmToken.hasRole(MINTER_ROLE, CORE_CONTRACTS.TREASURY_REVENUE_HUB.address),
      critical: true
    },
    {
      name: "Treasury has FEE_MANAGER_ROLE on AXM",
      check: async () => await axmToken.hasRole(FEE_MANAGER_ROLE, CORE_CONTRACTS.TREASURY_REVENUE_HUB.address),
      critical: true
    },
    {
      name: "Treasury has REWARD_FUNDER_ROLE on Staking",
      check: async () => await staking.hasRole(REWARD_FUNDER_ROLE, CORE_CONTRACTS.TREASURY_REVENUE_HUB.address),
      critical: true
    },
    {
      name: "Identity Hub has COMPLIANCE_ROLE on AXM",
      check: async () => await axmToken.hasRole(COMPLIANCE_ROLE, CORE_CONTRACTS.IDENTITY_COMPLIANCE_HUB.address),
      critical: true
    },
    {
      name: "Identity Hub has ISSUER_ROLE on Credentials",
      check: async () => await credentialRegistry.hasRole(ISSUER_ROLE, CORE_CONTRACTS.IDENTITY_COMPLIANCE_HUB.address),
      critical: true
    }
  ];

  let allCriticalPassed = true;
  const failedVerifications: string[] = [];

  for (const verification of criticalVerifications) {
    const result = await verification.check();
    if (result) {
      console.log(`✅ ${verification.name}`);
    } else {
      console.log(`❌ ${verification.name} - VERIFICATION FAILED`);
      if (verification.critical) {
        allCriticalPassed = false;
        failedVerifications.push(verification.name);
      }
    }
  }

  console.log("");
  console.log("========================================");
  console.log("📋 EXECUTION SUMMARY");
  console.log("========================================\n");

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  console.log(`Total Steps: ${totalCount}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${totalCount - successCount}\n`);

  if (!allCriticalPassed) {
    console.log("❌ STAGE 1 INTEGRATION FAILED");
    console.log("\nFailed Critical Verifications:");
    failedVerifications.forEach(v => console.log(`  • ${v}`));
    console.log("");
    throw new Error("Stage 1 integration failed critical verification checks");
  }

  console.log("🎉 STAGE 1 INTEGRATION COMPLETE - ALL CRITICAL CHECKS PASSED!");
  console.log("========================================\n");

  console.log("Next Steps:");
  console.log("1. Run Stage 1 tests: npm run integrate:test:stage1");
  console.log("2. Proceed to Stage 2: Financial & Real Estate Integration\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ INTEGRATION FAILED:");
    console.error(error.message);
    console.error("\nStack trace:", error.stack);
    process.exit(1);
  });
