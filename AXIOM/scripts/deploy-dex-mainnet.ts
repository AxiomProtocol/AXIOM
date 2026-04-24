import { ethers, upgrades } from "hardhat";

const TREASURY_SAFE = "0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d";
const AXM_TOKEN = "0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying DEX Ecosystem with:", deployer.address);
  console.log("Treasury Safe:", TREASURY_SAFE);
  console.log("AXM Token:", AXM_TOKEN);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("\n========================================\n");

  const deployed: Record<string, string> = {};

  // 1. Deploy AxiomExchangeHubV2 (proxy)
  console.log("1. Deploying AxiomExchangeHubV2...");
  const ExchangeHub = await ethers.getContractFactory("AxiomExchangeHubV2");
  const exchangeHub = await upgrades.deployProxy(ExchangeHub, [
    TREASURY_SAFE,
    deployer.address,
    30
  ]);
  await exchangeHub.waitForDeployment();
  deployed.AxiomExchangeHubV2 = await exchangeHub.getAddress();
  console.log("   AxiomExchangeHubV2:", deployed.AxiomExchangeHubV2);
  console.log("   Initialized with 0.3% fee\n");

  // 2. Deploy AxiomOracleAdapter (proxy)
  console.log("2. Deploying AxiomOracleAdapter...");
  const OracleAdapter = await ethers.getContractFactory("AxiomOracleAdapter");
  const oracleAdapter = await upgrades.deployProxy(OracleAdapter, [
    TREASURY_SAFE
  ]);
  await oracleAdapter.waitForDeployment();
  deployed.AxiomOracleAdapter = await oracleAdapter.getAddress();
  console.log("   AxiomOracleAdapter:", deployed.AxiomOracleAdapter, "\n");

  // 3. Deploy AxiomLPStaking (proxy)
  console.log("3. Deploying AxiomLPStaking...");
  const LPStaking = await ethers.getContractFactory("AxiomLPStaking");
  const lpStaking = await upgrades.deployProxy(LPStaking, [
    deployed.AxiomExchangeHubV2,
    AXM_TOKEN,
    TREASURY_SAFE
  ]);
  await lpStaking.waitForDeployment();
  deployed.AxiomLPStaking = await lpStaking.getAddress();
  console.log("   AxiomLPStaking:", deployed.AxiomLPStaking, "\n");

  // 4. Deploy AxiomFeeDistributor (proxy)
  console.log("4. Deploying AxiomFeeDistributor...");
  const FeeDistributor = await ethers.getContractFactory("AxiomFeeDistributor");
  const feeDistributor = await upgrades.deployProxy(FeeDistributor, [
    deployed.AxiomExchangeHubV2,
    TREASURY_SAFE,
    1000
  ]);
  await feeDistributor.waitForDeployment();
  deployed.AxiomFeeDistributor = await feeDistributor.getAddress();
  console.log("   AxiomFeeDistributor:", deployed.AxiomFeeDistributor);
  console.log("   Initialized with 10% treasury cut\n");

  // 5. Deploy AxiomTradingRewards (proxy)
  console.log("5. Deploying AxiomTradingRewards...");
  const TradingRewards = await ethers.getContractFactory("AxiomTradingRewards");
  const tradingRewards = await upgrades.deployProxy(TradingRewards, [
    deployed.AxiomExchangeHubV2,
    AXM_TOKEN,
    TREASURY_SAFE
  ]);
  await tradingRewards.waitForDeployment();
  deployed.AxiomTradingRewards = await tradingRewards.getAddress();
  console.log("   AxiomTradingRewards:", deployed.AxiomTradingRewards, "\n");

  // 6. Deploy AxiomDEXRouter (proxy)
  console.log("6. Deploying AxiomDEXRouter...");
  const Router = await ethers.getContractFactory("AxiomDEXRouter");
  const router = await upgrades.deployProxy(Router, [
    deployed.AxiomExchangeHubV2,
    TREASURY_SAFE
  ]);
  await router.waitForDeployment();
  deployed.AxiomDEXRouter = await router.getAddress();
  console.log("   AxiomDEXRouter:", deployed.AxiomDEXRouter, "\n");

  // 7. Deploy AxiomDEXAnalytics (proxy)
  console.log("7. Deploying AxiomDEXAnalytics...");
  const Analytics = await ethers.getContractFactory("AxiomDEXAnalytics");
  const analytics = await upgrades.deployProxy(Analytics, [
    deployed.AxiomExchangeHubV2,
    TREASURY_SAFE
  ]);
  await analytics.waitForDeployment();
  deployed.AxiomDEXAnalytics = await analytics.getAddress();
  console.log("   AxiomDEXAnalytics:", deployed.AxiomDEXAnalytics, "\n");

  // 8. Deploy AxiomLimitOrders (proxy)
  console.log("8. Deploying AxiomLimitOrders...");
  const LimitOrders = await ethers.getContractFactory("AxiomLimitOrders");
  const limitOrders = await upgrades.deployProxy(LimitOrders, [
    deployed.AxiomExchangeHubV2,
    deployed.AxiomOracleAdapter,
    TREASURY_SAFE,
    ethers.parseEther("0.001")
  ]);
  await limitOrders.waitForDeployment();
  deployed.AxiomLimitOrders = await limitOrders.getAddress();
  console.log("   AxiomLimitOrders:", deployed.AxiomLimitOrders);
  console.log("   Initialized with 0.001 ETH execution fee\n");

  // 9. Deploy AxiomDEXGovernor (proxy)
  console.log("9. Deploying AxiomDEXGovernor...");
  const Governor = await ethers.getContractFactory("AxiomDEXGovernor");
  const governor = await upgrades.deployProxy(Governor, [
    AXM_TOKEN,
    deployed.AxiomExchangeHubV2,
    TREASURY_SAFE,
    ethers.parseEther("10000"),
    7 * 24 * 60 * 60,
    2 * 24 * 60 * 60
  ]);
  await governor.waitForDeployment();
  deployed.AxiomDEXGovernor = await governor.getAddress();
  console.log("   AxiomDEXGovernor:", deployed.AxiomDEXGovernor);
  console.log("   Initialized with 10k AXM threshold, 7d voting, 2d delay\n");

  // 10. Deploy AxiomInsuranceFund (proxy)
  console.log("10. Deploying AxiomInsuranceFund...");
  const InsuranceFund = await ethers.getContractFactory("AxiomInsuranceFund");
  const insuranceFund = await upgrades.deployProxy(InsuranceFund, [
    TREASURY_SAFE,
    AXM_TOKEN,
    ethers.parseEther("100")
  ]);
  await insuranceFund.waitForDeployment();
  deployed.AxiomInsuranceFund = await insuranceFund.getAddress();
  console.log("   AxiomInsuranceFund:", deployed.AxiomInsuranceFund);
  console.log("   Initialized with 100 AXM min claim\n");

  console.log("========================================");
  console.log("DEX ECOSYSTEM DEPLOYMENT COMPLETE");
  console.log("========================================\n");

  console.log("Contract Addresses:");
  for (const [name, address] of Object.entries(deployed)) {
    console.log(`  ${name}: ${address}`);
  }

  const fs = require("fs");
  const deploymentInfo = {
    network: "arbitrum-one",
    chainId: 42161,
    deployer: deployer.address,
    treasurySafe: TREASURY_SAFE,
    axmToken: AXM_TOKEN,
    timestamp: new Date().toISOString(),
    contracts: deployed
  };

  fs.writeFileSync(
    "contracts/dex-deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to contracts/dex-deployment-info.json");

  console.log("\n========================================");
  console.log("Remaining balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
