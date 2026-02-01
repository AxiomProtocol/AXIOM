import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying AXUSD Phase 3 (T-Bill Integration) with account:", deployer.address);

  const AXUSD_ADDRESS = process.env.AXUSD_ADDRESS || "";
  const BACKSTOP_VAULT_ADDRESS = process.env.BACKSTOP_VAULT_ADDRESS || "";
  const FEE_BURNER_ADDRESS = process.env.FEE_BURNER_ADDRESS || "";
  const INSURANCE_FUND_ADDRESS = process.env.INSURANCE_FUND_ADDRESS || "";

  if (!AXUSD_ADDRESS) {
    console.log("Please set AXUSD_ADDRESS from Phase 1 deployment");
    return;
  }

  const MAX_MINT_RATIO = 9000;
  const TARGET_TBILL_RATIO = 7000;
  const TARGET_BACKSTOP_RATIO = 1500;

  console.log("\n1. Deploying TBillVault...");
  const TBillVault = await ethers.getContractFactory("TBillVault");
  const tbillVault = await TBillVault.deploy(
    AXUSD_ADDRESS,
    FEE_BURNER_ADDRESS || deployer.address,
    INSURANCE_FUND_ADDRESS || deployer.address,
    MAX_MINT_RATIO
  );
  await tbillVault.waitForDeployment();
  console.log("   TBillVault deployed to:", await tbillVault.getAddress());

  console.log("\n2. Deploying ReserveManager...");
  const ReserveManager = await ethers.getContractFactory("ReserveManager");
  const reserveManager = await ReserveManager.deploy(
    BACKSTOP_VAULT_ADDRESS || ethers.ZeroAddress,
    await tbillVault.getAddress(),
    ethers.ZeroAddress,
    TARGET_TBILL_RATIO,
    TARGET_BACKSTOP_RATIO
  );
  await reserveManager.waitForDeployment();
  console.log("   ReserveManager deployed to:", await reserveManager.getAddress());

  console.log("\n========================================");
  console.log("PHASE 3 CONTRACTS DEPLOYED");
  console.log("========================================");
  console.log("TBillVault:     ", await tbillVault.getAddress());
  console.log("ReserveManager: ", await reserveManager.getAddress());
  console.log("========================================");

  console.log("\nNEXT STEPS:");
  console.log("1. Grant MINTER_ROLE to TBillVault on AxiomStable");
  console.log("2. Grant BURNER_ROLE to TBillVault on AxiomStable");
  console.log("3. Add supported tokenized T-bill assets:");
  console.log("   - Ondo USDY: 0x96F6eF951840721AdBF46Ac996b59E0235CB985C");
  console.log("   - Backed bIB01: 0xCA30c93B02514f86d5C86a6e375E3A330B435Fb5");
  console.log("   - Matrixdock STBT: 0x530824DA86689C9C17CdC2871Ff29B058345b44a");
  console.log("4. Set BackstopVault address in ReserveManager");
  console.log("5. Configure yield distribution shares");
  console.log("6. Transfer admin roles to multisig + timelock");

  console.log("\nTOKENIZED T-BILL PROVIDERS:");
  console.log("  Ondo Finance (USDY): Short-term US Treasuries");
  console.log("  Backed Finance (bIB01): iShares $ Treasury Bond 0-1yr");
  console.log("  Matrixdock (STBT): Short-term T-Bills");
  console.log("  Franklin Templeton (BENJI): Money Market Fund (coming)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
