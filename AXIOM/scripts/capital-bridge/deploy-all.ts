import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentAddresses {
  layer5E: {
    CapitalReadinessGate: string;
    CapitalBridgeHub: string;
  };
  layer5G: {
    InstrumentRegistry: string;
    PoolRegistry: string;
    ServicingEventLog: string;
  };
  nodeEconomy: {
    NodeRegistry: string;
    NodeRewards: string;
    SlashingEngine: string;
  };
}

const OUTPUT_FILE = path.join(__dirname, "deployment-output.json");

async function deployLayer5E(adminAddress: string): Promise<{ readinessGate: string; hub: string }> {
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYING LAYER 5E (CAPITAL BRIDGE CORE)");
  console.log("=".repeat(60));

  console.log("\n--- Deploying CapitalReadinessGate ---");
  const ReadinessGate = await ethers.getContractFactory("CapitalReadinessGate");
  const readinessGate = await ReadinessGate.deploy(adminAddress);
  await readinessGate.waitForDeployment();
  const readinessGateAddress = await readinessGate.getAddress();
  console.log("CapitalReadinessGate:", readinessGateAddress);

  console.log("\n--- Deploying CapitalBridgeHub ---");
  const Hub = await ethers.getContractFactory("CapitalBridgeHub");
  const hub = await Hub.deploy(adminAddress);
  await hub.waitForDeployment();
  const hubAddress = await hub.getAddress();
  console.log("CapitalBridgeHub:", hubAddress);

  console.log("\n--- Configuring Hub with ReadinessGate ---");
  const tx = await hub.setReadinessGate(readinessGateAddress);
  await tx.wait();
  console.log("Configuration complete");

  return { readinessGate: readinessGateAddress, hub: hubAddress };
}

async function deployLayer5G(adminAddress: string): Promise<{ instrumentRegistry: string; poolRegistry: string; servicingLog: string }> {
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYING LAYER 5G (SECURITIZATION)");
  console.log("=".repeat(60));

  console.log("\n--- Deploying InstrumentRegistry ---");
  const InstrumentRegistry = await ethers.getContractFactory("InstrumentRegistry");
  const instrumentRegistry = await InstrumentRegistry.deploy(adminAddress);
  await instrumentRegistry.waitForDeployment();
  const instrumentRegistryAddress = await instrumentRegistry.getAddress();
  console.log("InstrumentRegistry:", instrumentRegistryAddress);

  console.log("\n--- Deploying PoolRegistry ---");
  const PoolRegistry = await ethers.getContractFactory("PoolRegistry");
  const poolRegistry = await PoolRegistry.deploy(adminAddress, instrumentRegistryAddress);
  await poolRegistry.waitForDeployment();
  const poolRegistryAddress = await poolRegistry.getAddress();
  console.log("PoolRegistry:", poolRegistryAddress);

  console.log("\n--- Deploying ServicingEventLog ---");
  const ServicingEventLog = await ethers.getContractFactory("ServicingEventLog");
  const servicingLog = await ServicingEventLog.deploy(adminAddress, instrumentRegistryAddress);
  await servicingLog.waitForDeployment();
  const servicingLogAddress = await servicingLog.getAddress();
  console.log("ServicingEventLog:", servicingLogAddress);

  console.log("\n--- Configuring Cross-References ---");
  let tx = await instrumentRegistry.setPoolRegistry(poolRegistryAddress);
  await tx.wait();
  console.log("InstrumentRegistry.setPoolRegistry done");

  tx = await instrumentRegistry.setServicingLog(servicingLogAddress);
  await tx.wait();
  console.log("InstrumentRegistry.setServicingLog done");

  return {
    instrumentRegistry: instrumentRegistryAddress,
    poolRegistry: poolRegistryAddress,
    servicingLog: servicingLogAddress,
  };
}

async function deployNodeEconomy(adminAddress: string, treasuryAddress: string): Promise<{ nodeRegistry: string; nodeRewards: string; slashingEngine: string }> {
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYING LAYER 7 (NODE ECONOMY)");
  console.log("=".repeat(60));

  console.log("\n--- Deploying NodeRegistry ---");
  const NodeRegistry = await ethers.getContractFactory("NodeRegistry");
  const nodeRegistry = await NodeRegistry.deploy(adminAddress);
  await nodeRegistry.waitForDeployment();
  const nodeRegistryAddress = await nodeRegistry.getAddress();
  console.log("NodeRegistry:", nodeRegistryAddress);

  console.log("\n--- Deploying NodeRewards ---");
  const NodeRewards = await ethers.getContractFactory("NodeRewards");
  const nodeRewards = await NodeRewards.deploy(adminAddress, nodeRegistryAddress);
  await nodeRewards.waitForDeployment();
  const nodeRewardsAddress = await nodeRewards.getAddress();
  console.log("NodeRewards:", nodeRewardsAddress);

  console.log("\n--- Deploying SlashingEngine ---");
  const SlashingEngine = await ethers.getContractFactory("SlashingEngine");
  const slashingEngine = await SlashingEngine.deploy(adminAddress, nodeRegistryAddress, treasuryAddress);
  await slashingEngine.waitForDeployment();
  const slashingEngineAddress = await slashingEngine.getAddress();
  console.log("SlashingEngine:", slashingEngineAddress);

  console.log("\n--- Configuring NodeRegistry ---");
  const tx = await nodeRegistry.setContracts(nodeRewardsAddress, slashingEngineAddress);
  await tx.wait();
  console.log("NodeRegistry.setContracts done (SLASHER_ROLE granted to SlashingEngine)");

  return {
    nodeRegistry: nodeRegistryAddress,
    nodeRewards: nodeRewardsAddress,
    slashingEngine: slashingEngineAddress,
  };
}

async function main() {
  console.log("=".repeat(60));
  console.log("CAPITAL BRIDGE FULL DEPLOYMENT");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("\nDeployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const adminAddress = process.env.ADMIN_ADDRESS || deployer.address;
  const treasuryAddress = process.env.TREASURY_ADDRESS || adminAddress;
  console.log("\nAdmin Address:", adminAddress);
  console.log("Treasury Address:", treasuryAddress);

  const layer5E = await deployLayer5E(adminAddress);
  const layer5G = await deployLayer5G(adminAddress);
  const nodeEconomy = await deployNodeEconomy(adminAddress, treasuryAddress);

  const deployment: DeploymentAddresses = {
    layer5E: {
      CapitalReadinessGate: layer5E.readinessGate,
      CapitalBridgeHub: layer5E.hub,
    },
    layer5G: {
      InstrumentRegistry: layer5G.instrumentRegistry,
      PoolRegistry: layer5G.poolRegistry,
      ServicingEventLog: layer5G.servicingLog,
    },
    nodeEconomy: {
      NodeRegistry: nodeEconomy.nodeRegistry,
      NodeRewards: nodeEconomy.nodeRewards,
      SlashingEngine: nodeEconomy.slashingEngine,
    },
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(deployment, null, 2));
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("\nAddresses written to:", OUTPUT_FILE);
  console.log("\nNext Steps:");
  console.log("  1. Run: npm run capital-bridge:roles -- using addresses from output file");
  console.log("  2. Run: npm run capital-bridge:observation");
  console.log("  3. Run: npm run capital-bridge:verify");

  console.log("\n" + JSON.stringify(deployment, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
