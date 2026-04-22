import { ethers } from "hardhat";

async function main() {
  const [admin] = await ethers.getSigners();
  console.log("============================================================");
  console.log("Node Economy Configuration (Admin Wallet Required)");
  console.log("============================================================\n");
  console.log("Signer address:", admin.address);
  
  const balance = await ethers.provider.getBalance(admin.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");

  const DEPLOYER_ADDRESS = "0x8d7892CF226B43d48B6e3ce988A1274e6D114C96";
  
  const NODE_REGISTRY_ADDRESS = process.env.NODE_REGISTRY_ADDRESS || "";
  const NODE_REWARDS_ADDRESS = process.env.NODE_REWARDS_ADDRESS || "";
  const SLASHING_ENGINE_ADDRESS = process.env.SLASHING_ENGINE_ADDRESS || "";
  
  if (!NODE_REGISTRY_ADDRESS || !NODE_REWARDS_ADDRESS || !SLASHING_ENGINE_ADDRESS) {
    console.error("ERROR: Set NODE_REGISTRY_ADDRESS, NODE_REWARDS_ADDRESS, SLASHING_ENGINE_ADDRESS env vars");
    process.exit(1);
  }

  const nodeRegistry = await ethers.getContractAt("NodeRegistry", NODE_REGISTRY_ADDRESS);
  const nodeRewards = await ethers.getContractAt("NodeRewards", NODE_REWARDS_ADDRESS);
  const slashingEngine = await ethers.getContractAt("SlashingEngine", SLASHING_ENGINE_ADDRESS);

  const NODE_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("NODE_MANAGER_ROLE"));
  const REWARDS_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REWARDS_MANAGER_ROLE"));
  const ORACLE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORACLE_ROLE"));
  const SLASHER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SLASHER_ROLE"));
  const ARBITER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ARBITER_ROLE"));

  console.log("--- Step 1: Configure Cross-Contract References ---");
  console.log("Setting contracts on NodeRegistry...");
  let tx = await nodeRegistry.setContracts(NODE_REWARDS_ADDRESS, SLASHING_ENGINE_ADDRESS);
  await tx.wait();
  console.log("  TX:", tx.hash);

  console.log("\n--- Step 2: Grant Roles on NodeRegistry ---");
  console.log("Granting NODE_MANAGER_ROLE to deployer...");
  tx = await nodeRegistry.grantRole(NODE_MANAGER_ROLE, DEPLOYER_ADDRESS);
  await tx.wait();
  console.log("  TX:", tx.hash);

  console.log("\n--- Step 3: Grant Roles on NodeRewards ---");
  console.log("Granting REWARDS_MANAGER_ROLE to deployer...");
  tx = await nodeRewards.grantRole(REWARDS_MANAGER_ROLE, DEPLOYER_ADDRESS);
  await tx.wait();
  console.log("  TX:", tx.hash);

  console.log("Granting ORACLE_ROLE to deployer...");
  tx = await nodeRewards.grantRole(ORACLE_ROLE, DEPLOYER_ADDRESS);
  await tx.wait();
  console.log("  TX:", tx.hash);

  console.log("\n--- Step 4: Grant Roles on SlashingEngine ---");
  console.log("Granting SLASHER_ROLE to deployer...");
  tx = await slashingEngine.grantRole(SLASHER_ROLE, DEPLOYER_ADDRESS);
  await tx.wait();
  console.log("  TX:", tx.hash);

  console.log("Granting ARBITER_ROLE to deployer...");
  tx = await slashingEngine.grantRole(ARBITER_ROLE, DEPLOYER_ADDRESS);
  await tx.wait();
  console.log("  TX:", tx.hash);

  console.log("\n============================================================");
  console.log("Node Economy Configuration Complete!");
  console.log("============================================================\n");
  
  console.log("Contracts configured:");
  console.log("  NodeRegistry:", NODE_REGISTRY_ADDRESS);
  console.log("  NodeRewards:", NODE_REWARDS_ADDRESS);
  console.log("  SlashingEngine:", SLASHING_ENGINE_ADDRESS);
  
  console.log("\nRoles granted to deployer:", DEPLOYER_ADDRESS);
  console.log("  - NODE_MANAGER_ROLE (NodeRegistry)");
  console.log("  - REWARDS_MANAGER_ROLE (NodeRewards)");
  console.log("  - ORACLE_ROLE (NodeRewards)");
  console.log("  - SLASHER_ROLE (SlashingEngine)");
  console.log("  - ARBITER_ROLE (SlashingEngine)");
  
  console.log("\nSLASHER_ROLE auto-granted to SlashingEngine on NodeRegistry");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
