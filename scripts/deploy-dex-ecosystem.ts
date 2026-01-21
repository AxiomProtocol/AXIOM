import { ethers, run } from "hardhat";

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

  // 1. Deploy AxiomExchangeHubV2
  console.log("1. Deploying AxiomExchangeHubV2...");
  const ExchangeHub = await ethers.getContractFactory("AxiomExchangeHubV2");
  const exchangeHub = await ExchangeHub.deploy();
  await exchangeHub.waitForDeployment();
  deployed.AxiomExchangeHubV2 = await exchangeHub.getAddress();
  console.log("   AxiomExchangeHubV2:", deployed.AxiomExchangeHubV2);

  // Initialize ExchangeHub
  const initTx = await exchangeHub.initialize(TREASURY_SAFE, 30); // 0.3% default fee
  await initTx.wait();
  console.log("   Initialized with 0.3% fee\n");

  // 2. Deploy AxiomOracleAdapter (needed by LimitOrders)
  console.log("2. Deploying AxiomOracleAdapter...");
  const OracleAdapter = await ethers.getContractFactory("AxiomOracleAdapter");
  const oracleAdapter = await OracleAdapter.deploy();
  await oracleAdapter.waitForDeployment();
  deployed.AxiomOracleAdapter = await oracleAdapter.getAddress();
  console.log("   AxiomOracleAdapter:", deployed.AxiomOracleAdapter);

  const oracleInitTx = await oracleAdapter.initialize(TREASURY_SAFE);
  await oracleInitTx.wait();
  console.log("   Initialized\n");

  // 3. Deploy AxiomLPStaking
  console.log("3. Deploying AxiomLPStaking...");
  const LPStaking = await ethers.getContractFactory("AxiomLPStaking");
  const lpStaking = await LPStaking.deploy();
  await lpStaking.waitForDeployment();
  deployed.AxiomLPStaking = await lpStaking.getAddress();
  console.log("   AxiomLPStaking:", deployed.AxiomLPStaking);

  const stakingInitTx = await lpStaking.initialize(
    deployed.AxiomExchangeHubV2,
    AXM_TOKEN,
    TREASURY_SAFE
  );
  await stakingInitTx.wait();
  console.log("   Initialized\n");

  // 4. Deploy AxiomFeeDistributor
  console.log("4. Deploying AxiomFeeDistributor...");
  const FeeDistributor = await ethers.getContractFactory("AxiomFeeDistributor");
  const feeDistributor = await FeeDistributor.deploy();
  await feeDistributor.waitForDeployment();
  deployed.AxiomFeeDistributor = await feeDistributor.getAddress();
  console.log("   AxiomFeeDistributor:", deployed.AxiomFeeDistributor);

  const feeDistInitTx = await feeDistributor.initialize(
    deployed.AxiomExchangeHubV2,
    TREASURY_SAFE,
    1000 // 10% to treasury
  );
  await feeDistInitTx.wait();
  console.log("   Initialized with 10% treasury cut\n");

  // 5. Deploy AxiomTradingRewards
  console.log("5. Deploying AxiomTradingRewards...");
  const TradingRewards = await ethers.getContractFactory("AxiomTradingRewards");
  const tradingRewards = await TradingRewards.deploy();
  await tradingRewards.waitForDeployment();
  deployed.AxiomTradingRewards = await tradingRewards.getAddress();
  console.log("   AxiomTradingRewards:", deployed.AxiomTradingRewards);

  const rewardsInitTx = await tradingRewards.initialize(
    deployed.AxiomExchangeHubV2,
    AXM_TOKEN,
    TREASURY_SAFE
  );
  await rewardsInitTx.wait();
  console.log("   Initialized\n");

  // 6. Deploy AxiomDEXRouter
  console.log("6. Deploying AxiomDEXRouter...");
  const Router = await ethers.getContractFactory("AxiomDEXRouter");
  const router = await Router.deploy();
  await router.waitForDeployment();
  deployed.AxiomDEXRouter = await router.getAddress();
  console.log("   AxiomDEXRouter:", deployed.AxiomDEXRouter);

  const routerInitTx = await router.initialize(
    deployed.AxiomExchangeHubV2,
    TREASURY_SAFE
  );
  await routerInitTx.wait();
  console.log("   Initialized\n");

  // 7. Deploy AxiomDEXAnalytics
  console.log("7. Deploying AxiomDEXAnalytics...");
  const Analytics = await ethers.getContractFactory("AxiomDEXAnalytics");
  const analytics = await Analytics.deploy();
  await analytics.waitForDeployment();
  deployed.AxiomDEXAnalytics = await analytics.getAddress();
  console.log("   AxiomDEXAnalytics:", deployed.AxiomDEXAnalytics);

  const analyticsInitTx = await analytics.initialize(
    deployed.AxiomExchangeHubV2,
    TREASURY_SAFE
  );
  await analyticsInitTx.wait();
  console.log("   Initialized\n");

  // 8. Deploy AxiomLimitOrders
  console.log("8. Deploying AxiomLimitOrders...");
  const LimitOrders = await ethers.getContractFactory("AxiomLimitOrders");
  const limitOrders = await LimitOrders.deploy();
  await limitOrders.waitForDeployment();
  deployed.AxiomLimitOrders = await limitOrders.getAddress();
  console.log("   AxiomLimitOrders:", deployed.AxiomLimitOrders);

  const limitInitTx = await limitOrders.initialize(
    deployed.AxiomExchangeHubV2,
    deployed.AxiomOracleAdapter,
    TREASURY_SAFE,
    ethers.parseEther("0.001") // 0.001 ETH execution fee
  );
  await limitInitTx.wait();
  console.log("   Initialized with 0.001 ETH execution fee\n");

  // 9. Deploy AxiomDEXGovernor
  console.log("9. Deploying AxiomDEXGovernor...");
  const Governor = await ethers.getContractFactory("AxiomDEXGovernor");
  const governor = await Governor.deploy();
  await governor.waitForDeployment();
  deployed.AxiomDEXGovernor = await governor.getAddress();
  console.log("   AxiomDEXGovernor:", deployed.AxiomDEXGovernor);

  const govInitTx = await governor.initialize(
    AXM_TOKEN,
    deployed.AxiomExchangeHubV2,
    TREASURY_SAFE,
    ethers.parseEther("10000"), // 10,000 AXM proposal threshold
    7 * 24 * 60 * 60, // 7 days voting period
    2 * 24 * 60 * 60  // 2 days execution delay
  );
  await govInitTx.wait();
  console.log("   Initialized with 10k AXM threshold, 7d voting, 2d delay\n");

  // 10. Deploy AxiomInsuranceFund
  console.log("10. Deploying AxiomInsuranceFund...");
  const InsuranceFund = await ethers.getContractFactory("AxiomInsuranceFund");
  const insuranceFund = await InsuranceFund.deploy();
  await insuranceFund.waitForDeployment();
  deployed.AxiomInsuranceFund = await insuranceFund.getAddress();
  console.log("   AxiomInsuranceFund:", deployed.AxiomInsuranceFund);

  const insuranceInitTx = await insuranceFund.initialize(
    TREASURY_SAFE,
    AXM_TOKEN,
    ethers.parseEther("100") // 100 AXM min claim
  );
  await insuranceInitTx.wait();
  console.log("   Initialized with 100 AXM min claim\n");

  console.log("========================================");
  console.log("DEX ECOSYSTEM DEPLOYMENT COMPLETE");
  console.log("========================================\n");

  console.log("Contract Addresses:");
  for (const [name, address] of Object.entries(deployed)) {
    console.log(`  ${name}: ${address}`);
  }

  // Save deployment info
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

  // Verify contracts
  console.log("\n========================================");
  console.log("VERIFYING CONTRACTS ON BLOCKSCOUT");
  console.log("========================================\n");

  for (const [name, address] of Object.entries(deployed)) {
    console.log(`Verifying ${name}...`);
    try {
      await run("verify:verify", {
        address: address,
        constructorArguments: [],
      });
      console.log(`  ${name} verified!\n`);
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log(`  ${name} already verified\n`);
      } else {
        console.log(`  ${name} verification failed: ${error.message}\n`);
      }
    }
  }

  console.log("\n========================================");
  console.log("ALL DONE!");
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
