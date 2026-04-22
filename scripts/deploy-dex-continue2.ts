import { ethers, upgrades } from "hardhat";

const TREASURY_SAFE = "0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d";
const AXM_TOKEN = "0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D";
const WETH_TOKEN = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const AXUSD_TOKEN = "0x0000000000000000000000000000000000000000";

const DEPLOYED = {
  AxiomExchangeHubV2: "0x31eF3DCB076ba97229113F4e58Cc9315cb8Dcd28",
  AxiomOracleAdapter: "0xe0074F15EFe0E39fdc39c8e13f752DDC63AB35c7"
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Continuing DEX Deployment with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("\n========================================\n");

  const deployed: Record<string, string> = { ...DEPLOYED };

  // 3. Deploy AxiomLPStaking (proxy)
  console.log("3. Deploying AxiomLPStaking...");
  const LPStaking = await ethers.getContractFactory("AxiomLPStaking");
  const lpStaking = await upgrades.deployProxy(LPStaking, [
    DEPLOYED.AxiomExchangeHubV2,
    AXM_TOKEN,
    TREASURY_SAFE,
    ethers.parseEther("0.001")
  ]);
  await lpStaking.waitForDeployment();
  deployed.AxiomLPStaking = await lpStaking.getAddress();
  console.log("   AxiomLPStaking:", deployed.AxiomLPStaking, "\n");

  // 4. Deploy AxiomFeeDistributor (proxy)
  console.log("4. Deploying AxiomFeeDistributor...");
  const FeeDistributor = await ethers.getContractFactory("AxiomFeeDistributor");
  const feeDistributor = await upgrades.deployProxy(FeeDistributor, [
    DEPLOYED.AxiomExchangeHubV2,
    TREASURY_SAFE,
    1000
  ]);
  await feeDistributor.waitForDeployment();
  deployed.AxiomFeeDistributor = await feeDistributor.getAddress();
  console.log("   AxiomFeeDistributor:", deployed.AxiomFeeDistributor, "\n");

  // 5. Deploy AxiomTradingRewards (proxy) - needs 6 args
  console.log("5. Deploying AxiomTradingRewards...");
  const TradingRewards = await ethers.getContractFactory("AxiomTradingRewards");
  const tradingRewards = await upgrades.deployProxy(TradingRewards, [
    AXM_TOKEN,
    TREASURY_SAFE,
    DEPLOYED.AxiomExchangeHubV2,
    86400 * 7,
    100,
    ethers.parseEther("10000")
  ]);
  await tradingRewards.waitForDeployment();
  deployed.AxiomTradingRewards = await tradingRewards.getAddress();
  console.log("   AxiomTradingRewards:", deployed.AxiomTradingRewards, "\n");

  // 6. Deploy AxiomDEXRouter (proxy) - needs 5 args
  console.log("6. Deploying AxiomDEXRouter...");
  const Router = await ethers.getContractFactory("AxiomDEXRouter");
  const router = await upgrades.deployProxy(Router, [
    DEPLOYED.AxiomExchangeHubV2,
    TREASURY_SAFE,
    AXUSD_TOKEN,
    WETH_TOKEN,
    AXM_TOKEN
  ]);
  await router.waitForDeployment();
  deployed.AxiomDEXRouter = await router.getAddress();
  console.log("   AxiomDEXRouter:", deployed.AxiomDEXRouter, "\n");

  // 7. Deploy AxiomDEXAnalytics (proxy) - 2 args
  console.log("7. Deploying AxiomDEXAnalytics...");
  const Analytics = await ethers.getContractFactory("AxiomDEXAnalytics");
  const analytics = await upgrades.deployProxy(Analytics, [
    DEPLOYED.AxiomExchangeHubV2,
    TREASURY_SAFE
  ]);
  await analytics.waitForDeployment();
  deployed.AxiomDEXAnalytics = await analytics.getAddress();
  console.log("   AxiomDEXAnalytics:", deployed.AxiomDEXAnalytics, "\n");

  // 8. Deploy AxiomLimitOrders (proxy) - 4 args
  console.log("8. Deploying AxiomLimitOrders...");
  const LimitOrders = await ethers.getContractFactory("AxiomLimitOrders");
  const limitOrders = await upgrades.deployProxy(LimitOrders, [
    DEPLOYED.AxiomExchangeHubV2,
    DEPLOYED.AxiomOracleAdapter,
    TREASURY_SAFE,
    ethers.parseEther("0.001")
  ]);
  await limitOrders.waitForDeployment();
  deployed.AxiomLimitOrders = await limitOrders.getAddress();
  console.log("   AxiomLimitOrders:", deployed.AxiomLimitOrders, "\n");

  // 9. Deploy AxiomDEXGovernor (proxy) - 6 args
  console.log("9. Deploying AxiomDEXGovernor...");
  const Governor = await ethers.getContractFactory("AxiomDEXGovernor");
  const governor = await upgrades.deployProxy(Governor, [
    AXM_TOKEN,
    DEPLOYED.AxiomExchangeHubV2,
    TREASURY_SAFE,
    ethers.parseEther("10000"),
    7 * 24 * 60 * 60,
    2 * 24 * 60 * 60
  ]);
  await governor.waitForDeployment();
  deployed.AxiomDEXGovernor = await governor.getAddress();
  console.log("   AxiomDEXGovernor:", deployed.AxiomDEXGovernor, "\n");

  // 10. Deploy AxiomInsuranceFund (proxy) - 3 args
  console.log("10. Deploying AxiomInsuranceFund...");
  const InsuranceFund = await ethers.getContractFactory("AxiomInsuranceFund");
  const insuranceFund = await upgrades.deployProxy(InsuranceFund, [
    TREASURY_SAFE,
    AXM_TOKEN,
    ethers.parseEther("100")
  ]);
  await insuranceFund.waitForDeployment();
  deployed.AxiomInsuranceFund = await insuranceFund.getAddress();
  console.log("   AxiomInsuranceFund:", deployed.AxiomInsuranceFund, "\n");

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
