/**
 * Stage 3 Integration: City Services & Oracles
 * Connect utility, transport, DePIN to IoT oracles and sustainability
 */

import { ethers } from "hardhat";
import { UTILITY_CONTRACTS, ADVANCED_DEFI_CONTRACTS } from "../config/contracts.config";
import { STAGE_3 } from "../config/integration-stages";

async function main() {
  console.log("\n========================================");
  console.log("🏙️  STAGE 3: CITY SERVICES & ORACLES");
  console.log("========================================\n");

  // NOTE: Stage 3 requires TWO admins:
  // - Utility Hub (Contract 10): Uses DEPLOYER
  // - DePIN Suite (Contract 12): Uses ADMIN_1
  const DEPLOYER_ADDRESS = "0x8d7892CF226B43d48B6e3ce988A1274e6D114C96";
  const ADMIN_1_ADDRESS = "0x93696b537d814Aed5875C4490143195983AED365";
  const network = await ethers.provider.getNetwork();
  
  let deployerSigner, admin1Signer;
  if (network.chainId === 31337n) {
    // Running on Hardhat fork - impersonate both admins
    console.log("🔄 Hardhat fork detected - applying fixes...");
    await ethers.provider.send("hardhat_mine", ["0x1"]);
    console.log("   ✅ Block mined successfully");
    
    console.log("   🔑 Impersonating both contract admins...");
    console.log("   👤 Deployer (for Utility Hub):", DEPLOYER_ADDRESS);
    console.log("   👤 Admin 1 (for DePIN Suite):", ADMIN_1_ADDRESS);
    
    // Impersonate deployer
    await ethers.provider.send("hardhat_impersonateAccount", [DEPLOYER_ADDRESS]);
    await ethers.provider.send("hardhat_setBalance", [
      DEPLOYER_ADDRESS,
      ethers.toQuantity(ethers.parseEther("1000"))
    ]);
    deployerSigner = await ethers.getSigner(DEPLOYER_ADDRESS);
    
    // Impersonate admin1
    await ethers.provider.send("hardhat_impersonateAccount", [ADMIN_1_ADDRESS]);
    await ethers.provider.send("hardhat_setBalance", [
      ADMIN_1_ADDRESS,
      ethers.toQuantity(ethers.parseEther("1000"))
    ]);
    admin1Signer = await ethers.getSigner(ADMIN_1_ADDRESS);
    
    console.log("   ✅ Both admins impersonated successfully\n");
  } else {
    // Running on real network - use the signer with private key
    [deployerSigner] = await ethers.getSigners();
    admin1Signer = deployerSigner; // On mainnet, same signer must have both roles
    console.log("⚠️  WARNING: Executing on REAL network");
    console.log("   Make sure the signer has admin rights on all contracts\n");
  }
  
  console.log("Deployer:", deployerSigner.address);
  console.log("Admin 1:", admin1Signer.address);
  console.log("Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployerSigner.address)), "ETH\n");

  // Connect to deployed contracts
  console.log("📡 Connecting to deployed contracts...\n");
  
  // Utility Hub uses deployer as admin
  const utilityHub = await ethers.getContractAt(
    "UtilityAndMeteringHub",
    UTILITY_CONTRACTS.UTILITY_METERING_HUB.address,
    deployerSigner
  );
  
  // DePIN Suite uses admin1 as admin
  const depinSuite = await ethers.getContractAt(
    "DePINNodeSuite",
    UTILITY_CONTRACTS.DEPIN_NODE_SUITE.address,
    admin1Signer
  );
  
  console.log("✅ All contracts connected\n");

  // ========================================
  // STAGE 3: ROLE GRANTS (2 total)
  // ========================================

  const roleGrants = STAGE_3.roleGrants;
  const results = { success: 0, failed: 0 };

  // Step 1: Grant METER_ORACLE_ROLE to IoT Oracle on Utility Hub
  try {
    console.log("🔐 Step 1: Granting METER_ORACLE_ROLE to IoT Oracle on Utility Hub...");
    const tx1 = await utilityHub.grantRole(
      UTILITY_CONTRACTS.UTILITY_METERING_HUB.roles.METER_ORACLE_ROLE,
      ADVANCED_DEFI_CONTRACTS.IOT_ORACLE_NETWORK.address
    );
    await tx1.wait();
    console.log("   ✅ METER_ORACLE_ROLE granted to IoT Oracle");
    console.log("   Transaction:", tx1.hash, "\n");
    results.success++;
  } catch (error: any) {
    console.error("❌ INTEGRATION FAILED:");
    console.error(error.message, "\n");
    results.failed++;
    throw error;
  }

  // Step 2: Grant ORACLE_ROLE to IoT Oracle on DePIN Suite
  try {
    console.log("🔐 Step 2: Granting ORACLE_ROLE to IoT Oracle on DePIN Suite...");
    const tx2 = await depinSuite.grantRole(
      UTILITY_CONTRACTS.DEPIN_NODE_SUITE.roles.ORACLE_ROLE,
      ADVANCED_DEFI_CONTRACTS.IOT_ORACLE_NETWORK.address
    );
    await tx2.wait();
    console.log("   ✅ ORACLE_ROLE granted to IoT Oracle");
    console.log("   Transaction:", tx2.hash, "\n");
    results.success++;
  } catch (error: any) {
    console.error("❌ INTEGRATION FAILED:");
    console.error(error.message, "\n");
    results.failed++;
    throw error;
  }

  // ========================================
  // CRITICAL VERIFICATION
  // ========================================

  console.log("========================================");
  console.log("🔍 CRITICAL VERIFICATION (On-Chain State)");
  console.log("========================================\n");

  const verifications: { desc: string; result: boolean }[] = [];

  // Verify IoT Oracle roles
  const iotHasMeterRole = await utilityHub.hasRole(
    UTILITY_CONTRACTS.UTILITY_METERING_HUB.roles.METER_ORACLE_ROLE,
    ADVANCED_DEFI_CONTRACTS.IOT_ORACLE_NETWORK.address
  );
  verifications.push({ desc: "IoT Oracle has METER_ORACLE_ROLE on Utility Hub", result: iotHasMeterRole });

  const iotHasDePINRole = await depinSuite.hasRole(
    UTILITY_CONTRACTS.DEPIN_NODE_SUITE.roles.ORACLE_ROLE,
    ADVANCED_DEFI_CONTRACTS.IOT_ORACLE_NETWORK.address
  );
  verifications.push({ desc: "IoT Oracle has ORACLE_ROLE on DePIN Suite", result: iotHasDePINRole });

  // Print results
  for (const { desc, result } of verifications) {
    console.log(result ? "✅" : "❌", desc);
  }
  console.log("");

  // Final check - all must pass
  const allPassed = verifications.every(v => v.result);
  if (!allPassed) {
    throw new Error("❌ CRITICAL VERIFICATION FAILED - Some roles were not granted properly");
  }

  // ========================================
  // EXECUTION SUMMARY
  // ========================================

  console.log("========================================");
  console.log("📋 EXECUTION SUMMARY");
  console.log("========================================\n");
  console.log("Total Steps:", roleGrants.length);
  console.log("Successful:", results.success);
  console.log("Failed:", results.failed);
  console.log("\n🎉 STAGE 3 INTEGRATION COMPLETE - ALL CRITICAL CHECKS PASSED!");
  console.log("========================================\n");
  console.log("Next Steps:");
  console.log("1. Run Stage 3 tests: npm run integrate:test:stage3");
  console.log("2. Proceed to Stage 4: Community & Cross-Chain Integration\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
