const hre = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("AXUSD Real Estate Lending Fund - Deployment");
  console.log("Network:", hre.network.name);
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

  const AXUSD_ADDRESS = "0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C";
  const TREASURY_ADDRESS = "0x3fD63728288546AC41dAe3bf25ca383061c3A929";
  const INSURANCE_FUND = deployer.address;

  console.log("Configuration:");
  console.log("  AXUSD:", AXUSD_ADDRESS);
  console.log("  Treasury:", TREASURY_ADDRESS);
  console.log("  Insurance Fund:", INSURANCE_FUND);
  console.log("");

  console.log("1. Deploying RiskConfig...");
  const RiskConfig = await hre.ethers.getContractFactory("RiskConfig");
  const riskConfig = await RiskConfig.deploy();
  await riskConfig.waitForDeployment();
  const riskConfigAddr = await riskConfig.getAddress();
  console.log("   RiskConfig deployed to:", riskConfigAddr);

  console.log("2. Deploying LoanReceiptNFT...");
  const LoanReceiptNFT = await hre.ethers.getContractFactory("LoanReceiptNFT");
  const loanReceipt = await LoanReceiptNFT.deploy();
  await loanReceipt.waitForDeployment();
  const loanReceiptAddr = await loanReceipt.getAddress();
  console.log("   LoanReceiptNFT deployed to:", loanReceiptAddr);

  console.log("3. Deploying FixFlipPoolVault...");
  const FixFlipPoolVault = await hre.ethers.getContractFactory("FixFlipPoolVault");
  const vault = await FixFlipPoolVault.deploy(
    AXUSD_ADDRESS,
    "AXUSD Fix & Flip Vault",
    "axFFV"
  );
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log("   FixFlipPoolVault deployed to:", vaultAddr);

  console.log("4. Deploying RepaymentRouter...");
  const RepaymentRouter = await hre.ethers.getContractFactory("RepaymentRouter");
  const router = await RepaymentRouter.deploy(
    AXUSD_ADDRESS,
    vaultAddr,
    riskConfigAddr,
    loanReceiptAddr,
    INSURANCE_FUND,
    TREASURY_ADDRESS
  );
  await router.waitForDeployment();
  const routerAddr = await router.getAddress();
  console.log("   RepaymentRouter deployed to:", routerAddr);

  console.log("5. Deploying FixFlipManager...");
  const FixFlipManager = await hre.ethers.getContractFactory("FixFlipManager");
  const manager = await FixFlipManager.deploy(
    AXUSD_ADDRESS,
    vaultAddr,
    loanReceiptAddr,
    riskConfigAddr,
    routerAddr
  );
  await manager.waitForDeployment();
  const managerAddr = await manager.getAddress();
  console.log("   FixFlipManager deployed to:", managerAddr);

  console.log("6. Deploying ProductRegistry...");
  const ProductRegistry = await hre.ethers.getContractFactory("ProductRegistry");
  const registry = await ProductRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("   ProductRegistry deployed to:", registryAddr);

  console.log("\n7. Configuring roles and parameters...");
  
  const MANAGER_ROLE = await vault.MANAGER_ROLE();
  await vault.grantRole(MANAGER_ROLE, managerAddr);
  console.log("   Granted MANAGER_ROLE to FixFlipManager on vault");

  const MINTER_ROLE = await loanReceipt.MINTER_ROLE();
  await loanReceipt.grantRole(MINTER_ROLE, managerAddr);
  console.log("   Granted MINTER_ROLE to FixFlipManager on LoanReceiptNFT");

  await registry.registerProduct(1, managerAddr);
  console.log("   Registered Product 1: Fix & Flip Bridge Loans");

  await riskConfig.setProductRisk(1, {
    maxLtvBps: 7000,
    maxTermDays: 365,
    minLoanSize: hre.ethers.parseUnits("50000", 18),
    maxLoanSize: hre.ethers.parseUnits("500000", 18),
    interestRateBps: 1400,
    originationFeeBps: 300,
    lateFeePerDayBps: 50,
    insuranceReserveBps: 200,
    protocolFeeBps: 150,
    active: true
  });
  console.log("   Set Product 1 risk parameters");

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("\nContract Addresses:");
  console.log("  RiskConfig:", riskConfigAddr);
  console.log("  LoanReceiptNFT:", loanReceiptAddr);
  console.log("  FixFlipPoolVault:", vaultAddr);
  console.log("  RepaymentRouter:", routerAddr);
  console.log("  FixFlipManager:", managerAddr);
  console.log("  ProductRegistry:", registryAddr);
  
  console.log("\nEnvironment Variables to Set:");
  console.log(`  RISK_CONFIG_ADDRESS=${riskConfigAddr}`);
  console.log(`  LOAN_RECEIPT_ADDRESS=${loanReceiptAddr}`);
  console.log(`  FIXFLIP_VAULT_ADDRESS=${vaultAddr}`);
  console.log(`  REPAYMENT_ROUTER_ADDRESS=${routerAddr}`);
  console.log(`  FIXFLIP_MANAGER_ADDRESS=${managerAddr}`);
  console.log(`  PRODUCT_REGISTRY_ADDRESS=${registryAddr}`);

  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nVerifying contracts on block explorer...");
    
    try {
      await hre.run("verify:verify", {
        address: riskConfigAddr,
        constructorArguments: [],
      });
      console.log("   RiskConfig verified");
    } catch (e) {
      console.log("   RiskConfig verification skipped:", e.message?.slice(0, 50));
    }

    try {
      await hre.run("verify:verify", {
        address: loanReceiptAddr,
        constructorArguments: [],
      });
      console.log("   LoanReceiptNFT verified");
    } catch (e) {
      console.log("   LoanReceiptNFT verification skipped:", e.message?.slice(0, 50));
    }

    try {
      await hre.run("verify:verify", {
        address: vaultAddr,
        constructorArguments: [AXUSD_ADDRESS, "AXUSD Fix & Flip Vault", "axFFV"],
      });
      console.log("   FixFlipPoolVault verified");
    } catch (e) {
      console.log("   FixFlipPoolVault verification skipped:", e.message?.slice(0, 50));
    }

    try {
      await hre.run("verify:verify", {
        address: routerAddr,
        constructorArguments: [AXUSD_ADDRESS, vaultAddr, riskConfigAddr, loanReceiptAddr, INSURANCE_FUND, TREASURY_ADDRESS],
      });
      console.log("   RepaymentRouter verified");
    } catch (e) {
      console.log("   RepaymentRouter verification skipped:", e.message?.slice(0, 50));
    }

    try {
      await hre.run("verify:verify", {
        address: managerAddr,
        constructorArguments: [AXUSD_ADDRESS, vaultAddr, loanReceiptAddr, riskConfigAddr, routerAddr],
      });
      console.log("   FixFlipManager verified");
    } catch (e) {
      console.log("   FixFlipManager verification skipped:", e.message?.slice(0, 50));
    }

    try {
      await hre.run("verify:verify", {
        address: registryAddr,
        constructorArguments: [],
      });
      console.log("   ProductRegistry verified");
    } catch (e) {
      console.log("   ProductRegistry verification skipped:", e.message?.slice(0, 50));
    }
  }

  console.log("\nDone!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
