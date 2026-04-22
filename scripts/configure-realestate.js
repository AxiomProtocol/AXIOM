const hre = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("AXUSD Real Estate Lending Fund - Configuration");
  console.log("Network:", hre.network.name);
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const DEPLOYED = {
    riskConfig: "0xE7E6aC1d9df331f1804D29762e5A11019A4fFa53",
    loanReceipt: "0x91B0228D87F5D52039BD47c95628707E83DD102c",
    vault: "0xAd1Fb0467139bbaA50E4A5F3E3f8CF34D6B54a65",
    router: "0x34c18F5944539D28AC86cb1E12875A3e7735E336",
    manager: "0x6Bae6F362b2d3AE91Bb5415B4718dee0e0f80dbC",
    registry: "0x1B297D92a6D6b80684a81a050D2cA6cd87187E07"
  };

  console.log("\nAttaching to deployed contracts...");
  
  const vault = await hre.ethers.getContractAt("FixFlipPoolVault", DEPLOYED.vault);
  const loanReceipt = await hre.ethers.getContractAt("LoanReceiptNFT", DEPLOYED.loanReceipt);
  const registry = await hre.ethers.getContractAt("ProductRegistry", DEPLOYED.registry);
  const riskConfig = await hre.ethers.getContractAt("RiskConfig", DEPLOYED.riskConfig);

  console.log("\nConfiguring roles and parameters...");

  try {
    const MANAGER_ROLE = await vault.MANAGER_ROLE();
    const hasManagerRole = await vault.hasRole(MANAGER_ROLE, DEPLOYED.manager);
    if (!hasManagerRole) {
      await vault.grantRole(MANAGER_ROLE, DEPLOYED.manager);
      console.log("   Granted MANAGER_ROLE to FixFlipManager on vault");
    } else {
      console.log("   MANAGER_ROLE already granted on vault");
    }
  } catch (e) {
    console.log("   Vault role check/grant:", e.message?.slice(0, 80));
  }

  try {
    const MINTER_ROLE = await loanReceipt.MINTER_ROLE();
    const hasMinterRole = await loanReceipt.hasRole(MINTER_ROLE, DEPLOYED.manager);
    if (!hasMinterRole) {
      await loanReceipt.grantRole(MINTER_ROLE, DEPLOYED.manager);
      console.log("   Granted MINTER_ROLE to FixFlipManager on LoanReceiptNFT");
    } else {
      console.log("   MINTER_ROLE already granted on LoanReceiptNFT");
    }
  } catch (e) {
    console.log("   LoanReceipt role check/grant:", e.message?.slice(0, 80));
  }

  try {
    const isRegistered = await registry.isRegistered(1);
    if (!isRegistered) {
      await registry.registerProduct(1, DEPLOYED.manager);
      console.log("   Registered Product 1: Fix & Flip Bridge Loans");
    } else {
      console.log("   Product 1 already registered");
    }
  } catch (e) {
    console.log("   Product registration:", e.message?.slice(0, 80));
  }

  try {
    const productRisk = await riskConfig.getProductRisk(1);
    if (!productRisk.active) {
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
    } else {
      console.log("   Product 1 risk parameters already set");
    }
  } catch (e) {
    console.log("   Risk config:", e.message?.slice(0, 80));
  }

  console.log("\n" + "=".repeat(60));
  console.log("CONFIGURATION COMPLETE");
  console.log("=".repeat(60));

  console.log("\nDeployed Contract Addresses:");
  console.log("  RiskConfig:", DEPLOYED.riskConfig);
  console.log("  LoanReceiptNFT:", DEPLOYED.loanReceipt);
  console.log("  FixFlipPoolVault:", DEPLOYED.vault);
  console.log("  RepaymentRouter:", DEPLOYED.router);
  console.log("  FixFlipManager:", DEPLOYED.manager);
  console.log("  ProductRegistry:", DEPLOYED.registry);
  
  console.log("\nEnvironment Variables:");
  console.log(`  RISK_CONFIG_ADDRESS=${DEPLOYED.riskConfig}`);
  console.log(`  LOAN_RECEIPT_ADDRESS=${DEPLOYED.loanReceipt}`);
  console.log(`  FIXFLIP_VAULT_ADDRESS=${DEPLOYED.vault}`);
  console.log(`  REPAYMENT_ROUTER_ADDRESS=${DEPLOYED.router}`);
  console.log(`  FIXFLIP_MANAGER_ADDRESS=${DEPLOYED.manager}`);
  console.log(`  PRODUCT_REGISTRY_ADDRESS=${DEPLOYED.registry}`);

  console.log("\nDone!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
