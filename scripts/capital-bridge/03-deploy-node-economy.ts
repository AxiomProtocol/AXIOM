import { ethers } from "hardhat";

async function main() {
  console.log("=".repeat(60));
  console.log("NODE ECONOMY LAYER 7 DEPLOYMENT");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("\nDeployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const adminAddress = process.env.ADMIN_ADDRESS || deployer.address;
  const treasuryAddress = process.env.TREASURY_ADDRESS || adminAddress;
  console.log("Admin Address:", adminAddress);
  console.log("Treasury Address:", treasuryAddress);

  console.log("\n--- Deploying NodeRegistry ---");
  const NodeRegistry = await ethers.getContractFactory("NodeRegistry");
  const nodeRegistry = await NodeRegistry.deploy(adminAddress);
  await nodeRegistry.waitForDeployment();
  const nodeRegistryAddress = await nodeRegistry.getAddress();
  console.log("NodeRegistry deployed to:", nodeRegistryAddress);

  console.log("\n--- Deploying NodeRewards ---");
  const NodeRewards = await ethers.getContractFactory("NodeRewards");
  const nodeRewards = await NodeRewards.deploy(adminAddress, nodeRegistryAddress);
  await nodeRewards.waitForDeployment();
  const nodeRewardsAddress = await nodeRewards.getAddress();
  console.log("NodeRewards deployed to:", nodeRewardsAddress);

  console.log("\n--- Deploying SlashingEngine ---");
  const SlashingEngine = await ethers.getContractFactory("SlashingEngine");
  const slashingEngine = await SlashingEngine.deploy(adminAddress, nodeRegistryAddress, treasuryAddress);
  await slashingEngine.waitForDeployment();
  const slashingEngineAddress = await slashingEngine.getAddress();
  console.log("SlashingEngine deployed to:", slashingEngineAddress);

  console.log("\n--- Configuring Cross-Contract References ---");
  const tx = await nodeRegistry.setContracts(nodeRewardsAddress, slashingEngineAddress);
  await tx.wait();
  console.log("NodeRegistry.setContracts configured (grants SLASHER_ROLE to SlashingEngine)");

  console.log("\n" + "=".repeat(60));
  console.log("NODE ECONOMY DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("\nDeployed Contracts:");
  console.log("  NodeRegistry:", nodeRegistryAddress);
  console.log("  NodeRewards:", nodeRewardsAddress);
  console.log("  SlashingEngine:", slashingEngineAddress);
  console.log("\nNode Class Configuration:");
  console.log("  Storage:   0.1 ETH stake, 30 day lock");
  console.log("  Execution: 0.5 ETH stake, 60 day lock");
  console.log("  Indexing:  0.25 ETH stake, 30 day lock");
  console.log("  Research:  1.0 ETH stake, 90 day lock");
  console.log("\nNext Steps:");
  console.log("  1. Run 04-configure-roles.ts");
  console.log("  2. Run 05-start-observation.ts");

  return {
    nodeRegistry: nodeRegistryAddress,
    nodeRewards: nodeRewardsAddress,
    slashingEngine: slashingEngineAddress,
  };
}

main()
  .then((addresses) => {
    console.log("\nExport addresses for next script:");
    console.log(JSON.stringify(addresses, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
