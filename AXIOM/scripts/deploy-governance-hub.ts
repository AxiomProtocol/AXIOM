/**
 * GovernanceHub Deployment Script
 * 
 * Run with: npx hardhat run scripts/deploy-governance-hub.ts --config hardhat.governance.config.ts --network arbitrumOne
 * 
 * This uses a separate hardhat config that compiles only governance contracts
 * to avoid compilation conflicts with other complex contracts.
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying GovernanceHub with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const ADMIN_ADDRESS = process.env.GOVERNANCE_ADMIN || deployer.address;

  console.log("\n=== DEPLOYMENT CONFIGURATION ===");
  console.log("Admin Address:", ADMIN_ADDRESS);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);

  console.log("\n=== DEPLOYING GOVERNANCE HUB ===");
  const GovernanceHub = await ethers.getContractFactory("GovernanceHub");
  const governanceHub = await GovernanceHub.deploy(ADMIN_ADDRESS);
  await governanceHub.waitForDeployment();
  const governanceHubAddress = await governanceHub.getAddress();
  console.log("GovernanceHub deployed to:", governanceHubAddress);

  console.log("\n=== VERIFICATION INFO ===");
  console.log("To verify on Blockscout:");
  console.log(`npx hardhat verify --network arbitrumOne ${governanceHubAddress} "${ADMIN_ADDRESS}"`);

  console.log("\n=== POST-DEPLOYMENT STEPS ===");
  console.log("1. Update shared/contracts.ts with:");
  console.log(`   GOVERNANCE_HUB: '${governanceHubAddress}'`);
  console.log("");
  console.log("2. Authorize target contracts:");
  console.log("   await governanceHub.authorizeTarget(RISK_CONFIG_ADDRESS);");
  console.log("   await governanceHub.authorizeTarget(DSCR_RISK_CONFIG_ADDRESS);");
  console.log("   await governanceHub.authorizeTarget(FIX_FLIP_MANAGER_ADDRESS);");
  console.log("   await governanceHub.authorizeTarget(DSCR_LOAN_MANAGER_ADDRESS);");
  console.log("   await governanceHub.authorizeTarget(PRODUCT_REGISTRY_ADDRESS);");
  console.log("");
  console.log("3. Wire GovernanceHub to each contract:");
  console.log("   await riskConfig.setGovernanceHub(governanceHubAddress);");
  console.log("   await dscrRiskConfig.setGovernanceHub(governanceHubAddress);");
  console.log("   await fixFlipManager.setGovernanceHub(governanceHubAddress);");
  console.log("   await dscrLoanManager.setGovernanceHub(governanceHubAddress);");
  console.log("   await productRegistry.setGovernanceHub(governanceHubAddress);");
  console.log("");
  console.log("4. Grant roles to appropriate addresses:");
  console.log("   RISK_COMMITTEE_ROLE: Risk committee multisig");
  console.log("   SETTLEMENT_AUTHORITY_ROLE: Settlement authority multisig");
  console.log("   GUARDIAN_ROLE: Emergency guardian address");
  console.log("");
  console.log("5. Enable governance enforcement:");
  console.log("   await riskConfig.setGovernanceEnforced(true);");
  console.log("   await dscrRiskConfig.setGovernanceEnforced(true);");
  console.log("   await fixFlipManager.setGovernanceEnforced(true);");
  console.log("   await dscrLoanManager.setGovernanceEnforced(true);");
  console.log("   await productRegistry.setGovernanceEnforced(true);");
  console.log("");
  console.log("6. Revoke legacy admin keys from deployer (after multi-sig setup):");
  console.log("   await riskConfig.revokeRole(ADMIN_ROLE, deployerAddress);");
  console.log("   See MIGRATION.md for complete revocation checklist.");

  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log("GovernanceHub:", governanceHubAddress);

  return {
    governanceHub: governanceHubAddress
  };
}

main()
  .then((addresses) => {
    console.log("\nDeployed addresses:", addresses);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
