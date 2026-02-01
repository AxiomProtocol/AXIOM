/**
 * Stage 2 Integration: Financial & Real Estate Mesh
 * Connect capital pools, real estate, and markets to treasury and compliance
 */

import { ethers } from "hardhat";
import { REAL_ESTATE_CONTRACTS, CORE_CONTRACTS } from "../config/contracts.config";
import { STAGE_2 } from "../config/integration-stages";

async function main() {
  console.log("\n========================================");
  console.log("🏢 STAGE 2: FINANCIAL & REAL ESTATE MESH");
  console.log("========================================\n");

  // Actual admin who has DEFAULT_ADMIN_ROLE on contracts
  const ADMIN_ADDRESS = "0x93696b537d814Aed5875C4490143195983AED365";
  const network = await ethers.provider.getNetwork();
  
  let admin;
  if (network.chainId === 31337n) {
    // Running on Hardhat fork - impersonate actual admin
    console.log("🔄 Hardhat fork detected - applying fixes...");
    await ethers.provider.send("hardhat_mine", ["0x1"]);
    console.log("   ✅ Block mined successfully");
    
    console.log("   🔑 Impersonating contract admin...");
    console.log("   👤 Admin address:", ADMIN_ADDRESS);
    await ethers.provider.send("hardhat_impersonateAccount", [ADMIN_ADDRESS]);
    await ethers.provider.send("hardhat_setBalance", [
      ADMIN_ADDRESS,
      ethers.toQuantity(ethers.parseEther("1000"))
    ]);
    admin = await ethers.getSigner(ADMIN_ADDRESS);
    console.log("   ✅ Impersonation successful\n");
  } else {
    // Running on real network - use the signer with private key
    [admin] = await ethers.getSigners();
    console.log("⚠️  WARNING: Executing on REAL network");
    console.log("   Make sure the signer has admin rights on all contracts\n");
  }
  
  console.log("Executing as:", admin.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(admin.address)), "ETH\n");

  // Connect to deployed contracts
  console.log("📡 Connecting to deployed contracts...\n");
  
  const leaseEngine = await ethers.getContractAt(
    "LeaseAndRentEngine",
    REAL_ESTATE_CONTRACTS.LEASE_RENT_ENGINE.address,
    admin
  );
  
  const realtorModule = await ethers.getContractAt(
    "RealtorModule",
    REAL_ESTATE_CONTRACTS.REALTOR_MODULE.address,
    admin
  );
  
  const capitalPools = await ethers.getContractAt(
    "CapitalPoolsAndFunds",
    REAL_ESTATE_CONTRACTS.CAPITAL_POOLS_FUNDS.address,
    admin
  );
  
  console.log("✅ All contracts connected\n");

  // ========================================
  // STAGE 2: ROLE GRANTS (5 total)
  // ========================================

  const roleGrants = STAGE_2.roleGrants;
  const results = { success: 0, failed: 0 };

  // Step 1: Grant TREASURY_ROLE to Treasury on Lease Engine
  try {
    console.log("🔐 Step 1: Granting TREASURY_ROLE to Treasury on Lease Engine...");
    const tx1 = await leaseEngine.grantRole(
      REAL_ESTATE_CONTRACTS.LEASE_RENT_ENGINE.roles.TREASURY_ROLE,
      CORE_CONTRACTS.TREASURY_REVENUE_HUB.address
    );
    await tx1.wait();
    console.log("   ✅ TREASURY_ROLE granted to Treasury");
    console.log("   Transaction:", tx1.hash, "\n");
    results.success++;
  } catch (error: any) {
    console.error("❌ INTEGRATION FAILED:");
    console.error(error.message, "\n");
    results.failed++;
    throw error;
  }

  // Step 2: Grant ADMIN_ROLE to Treasury on Realtor Module
  try {
    console.log("🔐 Step 2: Granting ADMIN_ROLE to Treasury on Realtor Module...");
    const tx2 = await realtorModule.grantRole(
      REAL_ESTATE_CONTRACTS.REALTOR_MODULE.roles.ADMIN_ROLE,
      CORE_CONTRACTS.TREASURY_REVENUE_HUB.address
    );
    await tx2.wait();
    console.log("   ✅ ADMIN_ROLE granted to Treasury");
    console.log("   Transaction:", tx2.hash, "\n");
    results.success++;
  } catch (error: any) {
    console.error("❌ INTEGRATION FAILED:");
    console.error(error.message, "\n");
    results.failed++;
    throw error;
  }

  // Step 3: Grant TREASURY_ROLE to Treasury on Capital Pools
  try {
    console.log("🔐 Step 3: Granting TREASURY_ROLE to Treasury on Capital Pools...");
    const tx3 = await capitalPools.grantRole(
      REAL_ESTATE_CONTRACTS.CAPITAL_POOLS_FUNDS.roles.TREASURY_ROLE,
      CORE_CONTRACTS.TREASURY_REVENUE_HUB.address
    );
    await tx3.wait();
    console.log("   ✅ TREASURY_ROLE granted to Treasury");
    console.log("   Transaction:", tx3.hash, "\n");
    results.success++;
  } catch (error: any) {
    console.error("❌ INTEGRATION FAILED:");
    console.error(error.message, "\n");
    results.failed++;
    throw error;
  }

  // Step 4: Grant COMPLIANCE_ROLE to Identity Hub on Lease Engine
  try {
    console.log("🔐 Step 4: Granting COMPLIANCE_ROLE to Identity Hub on Lease Engine...");
    const tx4 = await leaseEngine.grantRole(
      REAL_ESTATE_CONTRACTS.LEASE_RENT_ENGINE.roles.COMPLIANCE_ROLE,
      CORE_CONTRACTS.IDENTITY_COMPLIANCE_HUB.address
    );
    await tx4.wait();
    console.log("   ✅ COMPLIANCE_ROLE granted to Identity Hub");
    console.log("   Transaction:", tx4.hash, "\n");
    results.success++;
  } catch (error: any) {
    console.error("❌ INTEGRATION FAILED:");
    console.error(error.message, "\n");
    results.failed++;
    throw error;
  }

  // Step 5: Grant COMPLIANCE_ROLE to Identity Hub on Realtor Module
  try {
    console.log("🔐 Step 5: Granting COMPLIANCE_ROLE to Identity Hub on Realtor Module...");
    const tx5 = await realtorModule.grantRole(
      REAL_ESTATE_CONTRACTS.REALTOR_MODULE.roles.COMPLIANCE_ROLE,
      CORE_CONTRACTS.IDENTITY_COMPLIANCE_HUB.address
    );
    await tx5.wait();
    console.log("   ✅ COMPLIANCE_ROLE granted to Identity Hub");
    console.log("   Transaction:", tx5.hash, "\n");
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

  // Verify Treasury roles
  const treasuryHasLeaseRole = await leaseEngine.hasRole(
    REAL_ESTATE_CONTRACTS.LEASE_RENT_ENGINE.roles.TREASURY_ROLE,
    CORE_CONTRACTS.TREASURY_REVENUE_HUB.address
  );
  verifications.push({ desc: "Treasury has TREASURY_ROLE on Lease Engine", result: treasuryHasLeaseRole });

  const treasuryHasRealtorRole = await realtorModule.hasRole(
    REAL_ESTATE_CONTRACTS.REALTOR_MODULE.roles.ADMIN_ROLE,
    CORE_CONTRACTS.TREASURY_REVENUE_HUB.address
  );
  verifications.push({ desc: "Treasury has ADMIN_ROLE on Realtor Module", result: treasuryHasRealtorRole });

  const treasuryHasCapitalRole = await capitalPools.hasRole(
    REAL_ESTATE_CONTRACTS.CAPITAL_POOLS_FUNDS.roles.TREASURY_ROLE,
    CORE_CONTRACTS.TREASURY_REVENUE_HUB.address
  );
  verifications.push({ desc: "Treasury has TREASURY_ROLE on Capital Pools", result: treasuryHasCapitalRole });

  // Verify Identity Hub compliance roles
  const identityHasLeaseCompliance = await leaseEngine.hasRole(
    REAL_ESTATE_CONTRACTS.LEASE_RENT_ENGINE.roles.COMPLIANCE_ROLE,
    CORE_CONTRACTS.IDENTITY_COMPLIANCE_HUB.address
  );
  verifications.push({ desc: "Identity Hub has COMPLIANCE_ROLE on Lease Engine", result: identityHasLeaseCompliance });

  const identityHasRealtorCompliance = await realtorModule.hasRole(
    REAL_ESTATE_CONTRACTS.REALTOR_MODULE.roles.COMPLIANCE_ROLE,
    CORE_CONTRACTS.IDENTITY_COMPLIANCE_HUB.address
  );
  verifications.push({ desc: "Identity Hub has COMPLIANCE_ROLE on Realtor Module", result: identityHasRealtorCompliance });

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
  console.log("\n🎉 STAGE 2 INTEGRATION COMPLETE - ALL CRITICAL CHECKS PASSED!");
  console.log("========================================\n");
  console.log("Next Steps:");
  console.log("1. Run Stage 2 tests: npm run integrate:test:stage2");
  console.log("2. Proceed to Stage 3: City Services & Oracles Integration\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
