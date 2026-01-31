import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("============================================================");
  console.log("Node Economy Deployment");
  console.log("============================================================\n");
  console.log("Deployer address:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");

  const ADMIN_ADDRESS = "0xA6Ed10E752d5FACD989ee9CEd113b3a064b47493";

  console.log("--- Step 1: Deploy NodeRegistry ---");
  const NodeRegistry = await ethers.getContractFactory("NodeRegistry");
  const nodeRegistry = await NodeRegistry.deploy(ADMIN_ADDRESS);
  await nodeRegistry.waitForDeployment();
  const nodeRegistryAddress = await nodeRegistry.getAddress();
  console.log("NodeRegistry deployed to:", nodeRegistryAddress);

  console.log("\n--- Step 2: Deploy NodeRewards ---");
  const NodeRewards = await ethers.getContractFactory("NodeRewards");
  const nodeRewards = await NodeRewards.deploy(ADMIN_ADDRESS, nodeRegistryAddress);
  await nodeRewards.waitForDeployment();
  const nodeRewardsAddress = await nodeRewards.getAddress();
  console.log("NodeRewards deployed to:", nodeRewardsAddress);

  console.log("\n--- Step 3: Deploy SlashingEngine ---");
  const SlashingEngine = await ethers.getContractFactory("SlashingEngine");
  const slashingEngine = await SlashingEngine.deploy(ADMIN_ADDRESS, nodeRegistryAddress);
  await slashingEngine.waitForDeployment();
  const slashingEngineAddress = await slashingEngine.getAddress();
  console.log("SlashingEngine deployed to:", slashingEngineAddress);

  console.log("\n============================================================");
  console.log("Node Economy Deployment Complete!");
  console.log("============================================================\n");
  console.log("NodeRegistry:", nodeRegistryAddress);
  console.log("NodeRewards:", nodeRewardsAddress);
  console.log("SlashingEngine:", slashingEngineAddress);
  console.log("\nAdmin (DEFAULT_ADMIN_ROLE):", ADMIN_ADDRESS);
  console.log("\n--- NEXT STEPS ---");
  console.log("1. Call NodeRegistry.setContracts(NodeRewards, SlashingEngine) as admin");
  console.log("2. Grant NODE_MANAGER_ROLE to deployer on NodeRegistry");
  console.log("3. Grant REWARDS_MANAGER_ROLE and ORACLE_ROLE to deployer on NodeRewards");
  console.log("4. Grant SLASHER_ROLE and ARBITER_ROLE to deployer on SlashingEngine");
  console.log("5. Verify contracts on Blockscout");
  console.log("\nVerify commands:");
  console.log(`npx hardhat verify --network arbitrum --config hardhat.config.capital-bridge.ts ${nodeRegistryAddress} "${ADMIN_ADDRESS}"`);
  console.log(`npx hardhat verify --network arbitrum --config hardhat.config.capital-bridge.ts ${nodeRewardsAddress} "${ADMIN_ADDRESS}" "${nodeRegistryAddress}"`);
  console.log(`npx hardhat verify --network arbitrum --config hardhat.config.capital-bridge.ts ${slashingEngineAddress} "${ADMIN_ADDRESS}" "${nodeRegistryAddress}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
