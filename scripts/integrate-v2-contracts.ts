import { ethers } from "hardhat";

/**
 * AIP-001 Phase 4: Integration Script
 * Connects V2 contracts with existing V1 system
 * 
 * Role Assignments:
 * 1. AxiomScoreSBT: Grant SUSU_CONTRACT_ROLE to SusuHub and PersonalVault
 * 2. SusuInsuranceFund: Grant NODE_REWARDS_ROLE to DePINNodeSales
 * 3. veAXM: Grant REWARDS_DISTRIBUTOR_ROLE to AxiomFeeBurner
 */

// Contract addresses
const V2_CONTRACTS = {
  AxiomScoreSBT: "0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008",
  SusuInsuranceFund: "0x7B69ce0d83f45C2dBa3e5B73076beA8b1Be1271F",
  veAXM: "0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046",
  AxiomFeeBurner: "0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94"
};

const V1_CONTRACTS = {
  AxiomSusuHub: "0x6C69D730327930B49A7997B7b5fb0865F30c95A5",
  SusuPersonalVault: "0x7F474D9D5aF702D587A126c49aDa43318c1420E5",
  DePINNodeSales: "0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd"
};

async function main() {
  console.log("=".repeat(60));
  console.log("AIP-001 Phase 4: V2 Contract Integration");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  // Get contract instances
  const axiomScoreSBT = await ethers.getContractAt("AxiomScoreSBT", V2_CONTRACTS.AxiomScoreSBT);
  const susuInsuranceFund = await ethers.getContractAt("SusuInsuranceFund", V2_CONTRACTS.SusuInsuranceFund);
  const veAXM = await ethers.getContractAt("veAXM", V2_CONTRACTS.veAXM);

  // Role hashes
  const SUSU_CONTRACT_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SUSU_CONTRACT_ROLE"));
  const NODE_REWARDS_ROLE = ethers.keccak256(ethers.toUtf8Bytes("NODE_REWARDS_ROLE"));
  const REWARDS_DISTRIBUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REWARDS_DISTRIBUTOR_ROLE"));

  console.log("\n[1/4] Granting SUSU_CONTRACT_ROLE to AxiomSusuHub on AxiomScoreSBT...");
  try {
    const hasRoleSusuHub = await axiomScoreSBT.hasRole(SUSU_CONTRACT_ROLE, V1_CONTRACTS.AxiomSusuHub);
    if (!hasRoleSusuHub) {
      const tx1 = await axiomScoreSBT.grantSusuContractRole(V1_CONTRACTS.AxiomSusuHub);
      await tx1.wait();
      console.log("  ✓ Granted SUSU_CONTRACT_ROLE to AxiomSusuHub");
    } else {
      console.log("  ✓ AxiomSusuHub already has SUSU_CONTRACT_ROLE");
    }
  } catch (e: any) {
    console.log("  ⚠ Could not grant role:", e.message?.slice(0, 100));
  }

  console.log("\n[2/4] Granting SUSU_CONTRACT_ROLE to SusuPersonalVault on AxiomScoreSBT...");
  try {
    const hasRoleVault = await axiomScoreSBT.hasRole(SUSU_CONTRACT_ROLE, V1_CONTRACTS.SusuPersonalVault);
    if (!hasRoleVault) {
      const tx2 = await axiomScoreSBT.grantSusuContractRole(V1_CONTRACTS.SusuPersonalVault);
      await tx2.wait();
      console.log("  ✓ Granted SUSU_CONTRACT_ROLE to SusuPersonalVault");
    } else {
      console.log("  ✓ SusuPersonalVault already has SUSU_CONTRACT_ROLE");
    }
  } catch (e: any) {
    console.log("  ⚠ Could not grant role:", e.message?.slice(0, 100));
  }

  console.log("\n[3/4] Granting NODE_REWARDS_ROLE to DePINNodeSales on SusuInsuranceFund...");
  try {
    const hasRoleNode = await susuInsuranceFund.hasRole(NODE_REWARDS_ROLE, V1_CONTRACTS.DePINNodeSales);
    if (!hasRoleNode) {
      const tx3 = await susuInsuranceFund.grantNodeRewardsRole(V1_CONTRACTS.DePINNodeSales);
      await tx3.wait();
      console.log("  ✓ Granted NODE_REWARDS_ROLE to DePINNodeSales");
    } else {
      console.log("  ✓ DePINNodeSales already has NODE_REWARDS_ROLE");
    }
  } catch (e: any) {
    console.log("  ⚠ Could not grant role:", e.message?.slice(0, 100));
  }

  console.log("\n[4/4] Granting REWARDS_DISTRIBUTOR_ROLE to AxiomFeeBurner on veAXM...");
  try {
    const hasRoleBurner = await veAXM.hasRole(REWARDS_DISTRIBUTOR_ROLE, V2_CONTRACTS.AxiomFeeBurner);
    if (!hasRoleBurner) {
      const tx4 = await veAXM.grantRole(REWARDS_DISTRIBUTOR_ROLE, V2_CONTRACTS.AxiomFeeBurner);
      await tx4.wait();
      console.log("  ✓ Granted REWARDS_DISTRIBUTOR_ROLE to AxiomFeeBurner");
    } else {
      console.log("  ✓ AxiomFeeBurner already has REWARDS_DISTRIBUTOR_ROLE");
    }
  } catch (e: any) {
    console.log("  ⚠ Could not grant role:", e.message?.slice(0, 100));
  }

  console.log("\n" + "=".repeat(60));
  console.log("INTEGRATION COMPLETE!");
  console.log("=".repeat(60));

  // Verification
  console.log("\nVerifying role assignments...");
  
  const susuHubHasRole = await axiomScoreSBT.hasRole(SUSU_CONTRACT_ROLE, V1_CONTRACTS.AxiomSusuHub);
  const vaultHasRole = await axiomScoreSBT.hasRole(SUSU_CONTRACT_ROLE, V1_CONTRACTS.SusuPersonalVault);
  const nodeHasRole = await susuInsuranceFund.hasRole(NODE_REWARDS_ROLE, V1_CONTRACTS.DePINNodeSales);
  const burnerHasRole = await veAXM.hasRole(REWARDS_DISTRIBUTOR_ROLE, V2_CONTRACTS.AxiomFeeBurner);

  console.log(`  AxiomSusuHub -> SUSU_CONTRACT_ROLE: ${susuHubHasRole ? '✓' : '✗'}`);
  console.log(`  SusuPersonalVault -> SUSU_CONTRACT_ROLE: ${vaultHasRole ? '✓' : '✗'}`);
  console.log(`  DePINNodeSales -> NODE_REWARDS_ROLE: ${nodeHasRole ? '✓' : '✗'}`);
  console.log(`  AxiomFeeBurner -> REWARDS_DISTRIBUTOR_ROLE: ${burnerHasRole ? '✓' : '✗'}`);

  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => {
    console.log("\nIntegration complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nIntegration failed:", error);
    process.exit(1);
  });
