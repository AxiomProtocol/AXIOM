const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Real Estate Lending System with:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Configuration
  const AXUSD_ADDRESS = process.env.AXUSD_ADDRESS || "0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C";
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || deployer.address;
  const INSURANCE_FUND_ADDRESS = process.env.INSURANCE_FUND_ADDRESS || deployer.address;

  const PRODUCT_ID_FIXFLIP = 1;

  console.log("\n=== Deploying Real Estate Lending Contracts ===\n");

  // 1. Deploy RiskConfig
  console.log("1. Deploying RiskConfig...");
  const RiskConfig = await ethers.getContractFactory("RiskConfig");
  const riskConfig = await RiskConfig.deploy();
  await riskConfig.waitForDeployment();
  console.log("   RiskConfig deployed to:", await riskConfig.getAddress());

  // 2. Deploy LoanReceiptNFT
  console.log("2. Deploying LoanReceiptNFT...");
  const LoanReceiptNFT = await ethers.getContractFactory("LoanReceiptNFT");
  const loanReceipt = await LoanReceiptNFT.deploy("Axiom Loan Receipt", "ALR");
  await loanReceipt.waitForDeployment();
  console.log("   LoanReceiptNFT deployed to:", await loanReceipt.getAddress());

  // 3. Deploy FixFlipPoolVault
  console.log("3. Deploying FixFlipPoolVault...");
  const FixFlipPoolVault = await ethers.getContractFactory("FixFlipPoolVault");
  const vault = await FixFlipPoolVault.deploy(
    AXUSD_ADDRESS,
    "Axiom Fix Flip Vault",
    "affVAULT"
  );
  await vault.waitForDeployment();
  console.log("   FixFlipPoolVault deployed to:", await vault.getAddress());

  // 4. Deploy RepaymentRouter
  console.log("4. Deploying RepaymentRouter...");
  const RepaymentRouter = await ethers.getContractFactory("RepaymentRouter");
  const repaymentRouter = await RepaymentRouter.deploy(
    AXUSD_ADDRESS,
    await vault.getAddress(),
    await riskConfig.getAddress(),
    await loanReceipt.getAddress(),
    INSURANCE_FUND_ADDRESS,
    TREASURY_ADDRESS
  );
  await repaymentRouter.waitForDeployment();
  console.log("   RepaymentRouter deployed to:", await repaymentRouter.getAddress());

  // 5. Deploy FixFlipManager
  console.log("5. Deploying FixFlipManager...");
  const FixFlipManager = await ethers.getContractFactory("FixFlipManager");
  const fixFlipManager = await FixFlipManager.deploy(
    AXUSD_ADDRESS,
    await vault.getAddress(),
    await loanReceipt.getAddress(),
    await riskConfig.getAddress(),
    await repaymentRouter.getAddress()
  );
  await fixFlipManager.waitForDeployment();
  console.log("   FixFlipManager deployed to:", await fixFlipManager.getAddress());

  // 6. Deploy ProductRegistry
  console.log("6. Deploying ProductRegistry...");
  const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
  const productRegistry = await ProductRegistry.deploy();
  await productRegistry.waitForDeployment();
  console.log("   ProductRegistry deployed to:", await productRegistry.getAddress());

  console.log("\n=== Configuring System ===\n");

  // Grant roles
  const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER_ROLE"));

  console.log("Granting MANAGER_ROLE to FixFlipManager on Vault...");
  await vault.grantRole(MANAGER_ROLE, await fixFlipManager.getAddress());

  console.log("Granting MANAGER_ROLE to RepaymentRouter on Vault...");
  await vault.grantRole(MANAGER_ROLE, await repaymentRouter.getAddress());

  console.log("Granting MANAGER_ROLE to FixFlipManager on LoanReceipt...");
  await loanReceipt.grantRole(MANAGER_ROLE, await fixFlipManager.getAddress());

  console.log("Granting MANAGER_ROLE to RepaymentRouter on LoanReceipt...");
  await loanReceipt.grantRole(MANAGER_ROLE, await repaymentRouter.getAddress());

  // Configure product risk parameters
  console.log("\nConfiguring Fix & Flip risk parameters...");
  await riskConfig.setProductRisk(PRODUCT_ID_FIXFLIP, {
    productId: PRODUCT_ID_FIXFLIP,
    maxLtvBps: 7000,           // 70%
    maxTermDays: 365,          // 12 months
    maxLoanSize: ethers.parseEther("500000"),
    minLoanSize: ethers.parseEther("50000"),
    originationFeeBps: 300,    // 3 points
    interestRateBps: 1400,     // 14% APR
    lateFeePerDayBps: 50,      // 0.5% per day
    insuranceReserveBps: 200,  // 2% of interest to insurance
    protocolFeeBps: 150,       // 1.5% of interest to treasury
    active: true
  });

  // Register product
  console.log("Registering Fix & Flip product in registry...");
  await productRegistry.registerProduct(PRODUCT_ID_FIXFLIP, await fixFlipManager.getAddress());

  console.log("\n=== Deployment Complete ===\n");

  const addresses = {
    riskConfig: await riskConfig.getAddress(),
    loanReceipt: await loanReceipt.getAddress(),
    vault: await vault.getAddress(),
    repaymentRouter: await repaymentRouter.getAddress(),
    fixFlipManager: await fixFlipManager.getAddress(),
    productRegistry: await productRegistry.getAddress(),
    axusd: AXUSD_ADDRESS,
    treasury: TREASURY_ADDRESS,
    insuranceFund: INSURANCE_FUND_ADDRESS
  };

  console.log("Deployed Addresses:");
  console.log(JSON.stringify(addresses, null, 2));

  // Save to file
  const fs = require("fs");
  const path = require("path");

  const outputPath = path.join(__dirname, "../deployments/realestate-addresses.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
  console.log(`\nAddresses saved to: ${outputPath}`);

  return addresses;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
