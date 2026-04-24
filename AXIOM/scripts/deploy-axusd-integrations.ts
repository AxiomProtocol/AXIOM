import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════════");
  console.log("  AXUSD ECOSYSTEM INTEGRATIONS DEPLOYMENT");
  console.log("═══════════════════════════════════════════════════════");
  console.log("\nDeployer:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  const AXUSD = "0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c";
  const PSM = "0x4584888cB411E9cc88e3800BAB73A430D90d3793";
  const BACKSTOP_VAULT = "0x9D59e65aF3F5251578DC5F7576793de28A95c00a";
  const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  const TREASURY_VAULT = "0x3fD63728288546AC41dAe3bf25ca383061c3A929";
  const SEED = "0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046";
  const SUSU_VAULT = "0x7F474D9D5aF702D587A126c49aDa43318c1420E5";
  
  const CAMELOT_ROUTER = "0xc873fEcbd354f5A56E00E710B90EF4201db2448d";
  const CAMELOT_FACTORY = "0x6EcCab422D763aC031210895C81787E87B43A652";

  const deployedContracts: Record<string, string> = {};

  console.log("\n[1/5] Deploying SEEDYieldDistributor...");
  const SEEDYieldDistributor = await ethers.getContractFactory("SEEDYieldDistributor");
  const seedYield = await SEEDYieldDistributor.deploy(AXUSD, SEED, TREASURY_VAULT);
  await seedYield.waitForDeployment();
  deployedContracts.seedYieldDistributor = await seedYield.getAddress();
  console.log("   ✓ SEEDYieldDistributor:", deployedContracts.seedYieldDistributor);

  console.log("\n[2/5] Deploying AXUSDRevenueRouter...");
  const AXUSDRevenueRouter = await ethers.getContractFactory("AXUSDRevenueRouter");
  const revenueRouter = await AXUSDRevenueRouter.deploy(
    AXUSD,
    deployedContracts.seedYieldDistributor,
    TREASURY_VAULT,
    BACKSTOP_VAULT
  );
  await revenueRouter.waitForDeployment();
  deployedContracts.revenueRouter = await revenueRouter.getAddress();
  console.log("   ✓ AXUSDRevenueRouter:", deployedContracts.revenueRouter);

  console.log("\n[3/5] Deploying SusuAXUSDAdapter...");
  const SusuAXUSDAdapter = await ethers.getContractFactory("SusuAXUSDAdapter");
  const susuAdapter = await SusuAXUSDAdapter.deploy(
    AXUSD,
    USDC_ARBITRUM,
    PSM,
    SUSU_VAULT,
    TREASURY_VAULT
  );
  await susuAdapter.waitForDeployment();
  deployedContracts.susuAdapter = await susuAdapter.getAddress();
  console.log("   ✓ SusuAXUSDAdapter:", deployedContracts.susuAdapter);

  console.log("\n[4/5] Deploying KeyGrowPaymentModule...");
  const KeyGrowPaymentModule = await ethers.getContractFactory("KeyGrowPaymentModule");
  const keyGrow = await KeyGrowPaymentModule.deploy(AXUSD, USDC_ARBITRUM, PSM, TREASURY_VAULT);
  await keyGrow.waitForDeployment();
  deployedContracts.keyGrowPayment = await keyGrow.getAddress();
  console.log("   ✓ KeyGrowPaymentModule:", deployedContracts.keyGrowPayment);

  console.log("\n[5/5] Deploying LiquidityBootstrapper...");
  const LiquidityBootstrapper = await ethers.getContractFactory("LiquidityBootstrapper");
  const liquidityBootstrapper = await LiquidityBootstrapper.deploy(
    AXUSD,
    CAMELOT_ROUTER,
    CAMELOT_FACTORY,
    TREASURY_VAULT
  );
  await liquidityBootstrapper.waitForDeployment();
  deployedContracts.liquidityBootstrapper = await liquidityBootstrapper.getAddress();
  console.log("   ✓ LiquidityBootstrapper:", deployedContracts.liquidityBootstrapper);

  console.log("\n[6/5] Configuring roles...");

  const REVENUE_ROUTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REVENUE_ROUTER_ROLE"));
  await seedYield.grantRole(REVENUE_ROUTER_ROLE, deployedContracts.revenueRouter);
  console.log("   ✓ RevenueRouter granted REVENUE_ROUTER_ROLE on SEEDYieldDistributor");

  const finalBalance = await ethers.provider.getBalance(deployer.address);
  const gasUsed = balance - finalBalance;

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  INTEGRATION DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════════════════");
  console.log("\nGas Used:", ethers.formatEther(gasUsed), "ETH");
  console.log("\nDeployed Contracts:");
  console.log(JSON.stringify(deployedContracts, null, 2));
  console.log("\nPhase Rollout Ready:");
  console.log("  Phase 1: Treasury Pilot - Use RevenueRouter");
  console.log("  Phase 2: KeyGrow Cohort - Use KeyGrowPaymentModule");
  console.log("  Phase 3: Community Minting - All systems active");

  return deployedContracts;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
