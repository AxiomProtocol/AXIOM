const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("=== AXUSD DSCR Loan Product Deployment ===\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // AXUSD Stablecoin - deployed Jan 11, 2026
  const AXUSD_ADDRESS = "0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C";
  // Treasury Safe
  const TREASURY_ADDRESS = "0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d";
  // SUSU Insurance Fund contract
  const INSURANCE_FUND_ADDRESS = "0x7B69ce0d83f45C2dBa3e5B73076beA8b1Be1271F";
  
  const FIXFLIP_VAULT_ADDRESS = process.env.FIXFLIP_VAULT_ADDRESS;
  const FIXFLIP_LOAN_RECEIPT_ADDRESS = process.env.FIXFLIP_LOAN_RECEIPT_ADDRESS;

  console.log("Configuration:");
  console.log("- AXUSD:", AXUSD_ADDRESS);
  console.log("- Treasury:", TREASURY_ADDRESS);
  console.log("- Insurance Fund:", INSURANCE_FUND_ADDRESS);
  console.log("- FixFlip Vault:", FIXFLIP_VAULT_ADDRESS || "Not configured");
  console.log("- FixFlip LoanReceipt:", FIXFLIP_LOAN_RECEIPT_ADDRESS || "Not configured");
  console.log("");

  console.log("1. Deploying DSCRRiskConfig...");
  const DSCRRiskConfig = await ethers.getContractFactory("contracts-axusd/realestate/dscr/DSCRRiskConfig.sol:DSCRRiskConfig");
  const riskConfig = await DSCRRiskConfig.deploy();
  await riskConfig.waitForDeployment();
  const riskConfigAddress = await riskConfig.getAddress();
  console.log("   DSCRRiskConfig deployed to:", riskConfigAddress);

  console.log("\n2. Deploying DSCRLoanReceiptNFT...");
  const DSCRLoanReceiptNFT = await ethers.getContractFactory("contracts-axusd/realestate/dscr/DSCRLoanReceiptNFT.sol:DSCRLoanReceiptNFT");
  const loanReceipt = await DSCRLoanReceiptNFT.deploy();
  await loanReceipt.waitForDeployment();
  const loanReceiptAddress = await loanReceipt.getAddress();
  console.log("   DSCRLoanReceiptNFT deployed to:", loanReceiptAddress);

  console.log("\n3. Deploying DSCRPoolVault...");
  const DSCRPoolVault = await ethers.getContractFactory("contracts-axusd/realestate/dscr/DSCRPoolVault.sol:DSCRPoolVault");
  const vault = await DSCRPoolVault.deploy(
    AXUSD_ADDRESS,
    "AXUSD DSCR Pool Shares",
    "axDSCR"
  );
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("   DSCRPoolVault deployed to:", vaultAddress);

  console.log("\n4. Deploying RepaymentRouter for DSCR...");
  const RepaymentRouter = await ethers.getContractFactory("contracts-axusd/realestate/RepaymentRouter.sol:RepaymentRouter");
  const router = await RepaymentRouter.deploy(
    AXUSD_ADDRESS,
    vaultAddress,
    riskConfigAddress,
    loanReceiptAddress,
    INSURANCE_FUND_ADDRESS,
    TREASURY_ADDRESS
  );
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("   RepaymentRouter deployed to:", routerAddress);

  console.log("\n5. Deploying DSCRLoanManager...");
  const DSCRLoanManager = await ethers.getContractFactory("contracts-axusd/realestate/dscr/DSCRLoanManager.sol:DSCRLoanManager");
  const manager = await DSCRLoanManager.deploy(
    AXUSD_ADDRESS,
    vaultAddress,
    loanReceiptAddress,
    riskConfigAddress,
    routerAddress
  );
  await manager.waitForDeployment();
  const managerAddress = await manager.getAddress();
  console.log("   DSCRLoanManager deployed to:", managerAddress);

  console.log("\n6. Configuring roles...");
  
  const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER_ROLE"));
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  
  await vault.grantRole(MANAGER_ROLE, managerAddress);
  console.log("   Granted MANAGER_ROLE to DSCRLoanManager on DSCRPoolVault");
  
  await vault.grantRole(MANAGER_ROLE, routerAddress);
  console.log("   Granted MANAGER_ROLE to RepaymentRouter on DSCRPoolVault");
  
  await loanReceipt.grantRole(MINTER_ROLE, managerAddress);
  console.log("   Granted MINTER_ROLE to DSCRLoanManager on DSCRLoanReceiptNFT");
  
  await loanReceipt.grantRole(MANAGER_ROLE, managerAddress);
  console.log("   Granted MANAGER_ROLE to DSCRLoanManager on DSCRLoanReceiptNFT");
  
  await router.grantRole(MANAGER_ROLE, managerAddress);
  console.log("   Granted MANAGER_ROLE to DSCRLoanManager on RepaymentRouter");

  if (FIXFLIP_VAULT_ADDRESS && FIXFLIP_LOAN_RECEIPT_ADDRESS) {
    console.log("\n7. Configuring Fix & Flip integration for BRRRR refinance...");
    await manager.setFixFlipContracts(FIXFLIP_VAULT_ADDRESS, FIXFLIP_LOAN_RECEIPT_ADDRESS);
    console.log("   FixFlip contracts configured for refinance pathway");
  }

  console.log("\n8. Configuring DSCR product risk tiers...");
  
  await riskConfig.setDSCRProductRisk(100, {
    productId: 100,
    maxLtvBps: 6500,
    minDscrBps: 12500,
    interestRateBps: 700,
    originationFeeBps: 100,
    termMonths: 360,
    minLoanSize: ethers.parseEther("50000"),
    maxLoanSize: ethers.parseEther("1000000"),
    maxBorrowerExposure: ethers.parseEther("2000000"),
    insuranceReserveBps: 500,
    protocolFeeBps: 200,
    active: true
  });
  console.log("   Product 100 (AXUSD_DSCR_RENTAL_V1_LOW) configured");

  await riskConfig.setDSCRProductRisk(101, {
    productId: 101,
    maxLtvBps: 7000,
    minDscrBps: 12000,
    interestRateBps: 800,
    originationFeeBps: 150,
    termMonths: 360,
    minLoanSize: ethers.parseEther("50000"),
    maxLoanSize: ethers.parseEther("1500000"),
    maxBorrowerExposure: ethers.parseEther("3000000"),
    insuranceReserveBps: 500,
    protocolFeeBps: 200,
    active: true
  });
  console.log("   Product 101 (AXUSD_DSCR_RENTAL_V1_STANDARD) configured");

  await riskConfig.setDSCRProductRisk(102, {
    productId: 102,
    maxLtvBps: 7500,
    minDscrBps: 11000,
    interestRateBps: 950,
    originationFeeBps: 200,
    termMonths: 360,
    minLoanSize: ethers.parseEther("75000"),
    maxLoanSize: ethers.parseEther("2000000"),
    maxBorrowerExposure: ethers.parseEther("4000000"),
    insuranceReserveBps: 500,
    protocolFeeBps: 200,
    active: true
  });
  console.log("   Product 102 (AXUSD_DSCR_RENTAL_V1_YIELD) configured");

  console.log("\n=== Deployment Summary ===");
  console.log("DSCRRiskConfig:", riskConfigAddress);
  console.log("DSCRLoanReceiptNFT:", loanReceiptAddress);
  console.log("DSCRPoolVault:", vaultAddress);
  console.log("RepaymentRouter:", routerAddress);
  console.log("DSCRLoanManager:", managerAddress);

  console.log("\n=== Product IDs ===");
  console.log("100: AXUSD_DSCR_RENTAL_V1_LOW (65% LTV, 1.25 DSCR, 7% APR)");
  console.log("101: AXUSD_DSCR_RENTAL_V1_STANDARD (70% LTV, 1.20 DSCR, 8% APR)");
  console.log("102: AXUSD_DSCR_RENTAL_V1_YIELD (75% LTV, 1.10 DSCR, 9.5% APR)");

  console.log("\n=== Environment Variables ===");
  console.log(`DSCR_RISK_CONFIG=${riskConfigAddress}`);
  console.log(`DSCR_LOAN_RECEIPT=${loanReceiptAddress}`);
  console.log(`DSCR_POOL_VAULT=${vaultAddress}`);
  console.log(`DSCR_REPAYMENT_ROUTER=${routerAddress}`);
  console.log(`DSCR_LOAN_MANAGER=${managerAddress}`);

  console.log("\n=== Deployment Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
