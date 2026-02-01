/**
 * Redeploy Lending Contracts with Governance Integration
 * 
 * Run with: npx hardhat run scripts/redeploy-lending-with-governance.ts --network arbitrum
 */

import { ethers } from "hardhat";

const GOVERNANCE_HUB = "0x52Dc85fd653a75323b5307f4D2629ab9A070530E";

const EXISTING_CONTRACTS = {
  AXUSD: "0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C",
  FIXFLIP_VAULT: "0xF4AcD4B7EaBfDA7E1b96D3abA1C6340557aa93E5",
  LOAN_RECEIPT_NFT: "0x6C4181A15EAC950A2504aC63ebE7F5A0999265e9",
  REPAYMENT_ROUTER: "0x68fe7924c56c7B9D13F21B3a22Fe2B5bc59Ab9D5",
  DSCR_POOL_VAULT: "0x5a09cb67518e6E28d8307D75174430939C044A7d",
  DSCR_LOAN_RECEIPT_NFT: "0x66DB145A7ac0de369da88098E8F85467cFaD7674",
  DSCR_REPAYMENT_ROUTER: "0xa03e35afeE61c965522D88e778B356A2F2eF9Eab",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const deployedContracts: Record<string, string> = {};

  console.log("\n=== DEPLOYING RISKCONFIG ===");
  const RiskConfig = await ethers.getContractFactory("RiskConfig");
  const riskConfig = await RiskConfig.deploy();
  await riskConfig.waitForDeployment();
  deployedContracts.RISK_CONFIG = await riskConfig.getAddress();
  console.log("RiskConfig:", deployedContracts.RISK_CONFIG);

  console.log("\n=== DEPLOYING DSCRRISKCONFIG ===");
  const DSCRRiskConfig = await ethers.getContractFactory("DSCRRiskConfig");
  const dscrRiskConfig = await DSCRRiskConfig.deploy();
  await dscrRiskConfig.waitForDeployment();
  deployedContracts.DSCR_RISK_CONFIG = await dscrRiskConfig.getAddress();
  console.log("DSCRRiskConfig:", deployedContracts.DSCR_RISK_CONFIG);

  console.log("\n=== DEPLOYING PRODUCTREGISTRY ===");
  const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
  const productRegistry = await ProductRegistry.deploy();
  await productRegistry.waitForDeployment();
  deployedContracts.PRODUCT_REGISTRY = await productRegistry.getAddress();
  console.log("ProductRegistry:", deployedContracts.PRODUCT_REGISTRY);

  console.log("\n=== DEPLOYING FIXFLIPMANAGER ===");
  const FixFlipManager = await ethers.getContractFactory("FixFlipManager");
  const fixFlipManager = await FixFlipManager.deploy(
    EXISTING_CONTRACTS.AXUSD,
    EXISTING_CONTRACTS.FIXFLIP_VAULT,
    EXISTING_CONTRACTS.LOAN_RECEIPT_NFT,
    deployedContracts.RISK_CONFIG,
    EXISTING_CONTRACTS.REPAYMENT_ROUTER
  );
  await fixFlipManager.waitForDeployment();
  deployedContracts.FIXFLIP_MANAGER = await fixFlipManager.getAddress();
  console.log("FixFlipManager:", deployedContracts.FIXFLIP_MANAGER);

  console.log("\n=== DEPLOYING DSCRLOANMANAGER ===");
  const DSCRLoanManager = await ethers.getContractFactory("DSCRLoanManager");
  const dscrLoanManager = await DSCRLoanManager.deploy(
    EXISTING_CONTRACTS.AXUSD,
    EXISTING_CONTRACTS.DSCR_POOL_VAULT,
    EXISTING_CONTRACTS.DSCR_LOAN_RECEIPT_NFT,
    deployedContracts.DSCR_RISK_CONFIG,
    EXISTING_CONTRACTS.DSCR_REPAYMENT_ROUTER
  );
  await dscrLoanManager.waitForDeployment();
  deployedContracts.DSCR_LOAN_MANAGER = await dscrLoanManager.getAddress();
  console.log("DSCRLoanManager:", deployedContracts.DSCR_LOAN_MANAGER);

  console.log("\n=== WIRING GOVERNANCE HUB ===");
  const governanceHub = await ethers.getContractAt("GovernanceHub", GOVERNANCE_HUB);

  console.log("Authorizing targets on GovernanceHub...");
  for (const [name, address] of Object.entries(deployedContracts)) {
    const tx = await governanceHub.authorizeTarget(address);
    await tx.wait();
    console.log(`  ${name} authorized`);
  }

  console.log("\nSetting GovernanceHub on contracts...");
  await (await riskConfig.setGovernanceHub(GOVERNANCE_HUB)).wait();
  console.log("  RiskConfig wired");
  await (await dscrRiskConfig.setGovernanceHub(GOVERNANCE_HUB)).wait();
  console.log("  DSCRRiskConfig wired");
  await (await productRegistry.setGovernanceHub(GOVERNANCE_HUB)).wait();
  console.log("  ProductRegistry wired");
  await (await fixFlipManager.setGovernanceHub(GOVERNANCE_HUB)).wait();
  console.log("  FixFlipManager wired");
  await (await dscrLoanManager.setGovernanceHub(GOVERNANCE_HUB)).wait();
  console.log("  DSCRLoanManager wired");

  console.log("\nEnabling governance enforcement...");
  await (await riskConfig.setGovernanceEnforced(true)).wait();
  await (await dscrRiskConfig.setGovernanceEnforced(true)).wait();
  await (await productRegistry.setGovernanceEnforced(true)).wait();
  await (await fixFlipManager.setGovernanceEnforced(true)).wait();
  await (await dscrLoanManager.setGovernanceEnforced(true)).wait();
  console.log("  All contracts enforcement enabled");

  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log("\nNew Contract Addresses:");
  console.log(`  RISK_CONFIG: '${deployedContracts.RISK_CONFIG}'`);
  console.log(`  DSCR_RISK_CONFIG: '${deployedContracts.DSCR_RISK_CONFIG}'`);
  console.log(`  PRODUCT_REGISTRY: '${deployedContracts.PRODUCT_REGISTRY}'`);
  console.log(`  FIXFLIP_MANAGER: '${deployedContracts.FIXFLIP_MANAGER}'`);
  console.log(`  DSCR_LOAN_MANAGER: '${deployedContracts.DSCR_LOAN_MANAGER}'`);

  console.log("\n=== VERIFICATION COMMANDS ===");
  console.log(`npx hardhat verify --network arbitrum ${deployedContracts.RISK_CONFIG}`);
  console.log(`npx hardhat verify --network arbitrum ${deployedContracts.DSCR_RISK_CONFIG}`);
  console.log(`npx hardhat verify --network arbitrum ${deployedContracts.PRODUCT_REGISTRY}`);
  console.log(`npx hardhat verify --network arbitrum ${deployedContracts.FIXFLIP_MANAGER} "${EXISTING_CONTRACTS.AXUSD}" "${EXISTING_CONTRACTS.FIXFLIP_VAULT}" "${EXISTING_CONTRACTS.LOAN_RECEIPT_NFT}" "${deployedContracts.RISK_CONFIG}" "${EXISTING_CONTRACTS.REPAYMENT_ROUTER}"`);
  console.log(`npx hardhat verify --network arbitrum ${deployedContracts.DSCR_LOAN_MANAGER} "${EXISTING_CONTRACTS.AXUSD}" "${EXISTING_CONTRACTS.DSCR_POOL_VAULT}" "${EXISTING_CONTRACTS.DSCR_LOAN_RECEIPT_NFT}" "${deployedContracts.DSCR_RISK_CONFIG}" "${EXISTING_CONTRACTS.DSCR_REPAYMENT_ROUTER}"`);

  console.log("\n=== UPDATE shared/contracts.ts ===");
  console.log(`RISK_CONFIG: '${deployedContracts.RISK_CONFIG}',`);
  console.log(`DSCR_RISK_CONFIG: '${deployedContracts.DSCR_RISK_CONFIG}',`);
  console.log(`FIXFLIP_MANAGER: '${deployedContracts.FIXFLIP_MANAGER}',`);
  console.log(`DSCR_LOAN_MANAGER: '${deployedContracts.DSCR_LOAN_MANAGER}',`);
  console.log(`PRODUCT_REGISTRY: '${deployedContracts.PRODUCT_REGISTRY}',`);

  return deployedContracts;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
