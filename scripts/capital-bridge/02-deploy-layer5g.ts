import { ethers } from "hardhat";

async function main() {
  console.log("=".repeat(60));
  console.log("CAPITAL BRIDGE LAYER 5G DEPLOYMENT (SECURITIZATION)");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("\nDeployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const adminAddress = process.env.ADMIN_ADDRESS || deployer.address;
  console.log("Admin Address:", adminAddress);

  console.log("\n--- Deploying InstrumentRegistry ---");
  const InstrumentRegistry = await ethers.getContractFactory("InstrumentRegistry");
  const instrumentRegistry = await InstrumentRegistry.deploy(adminAddress);
  await instrumentRegistry.waitForDeployment();
  const instrumentRegistryAddress = await instrumentRegistry.getAddress();
  console.log("InstrumentRegistry deployed to:", instrumentRegistryAddress);

  console.log("\n--- Deploying PoolRegistry ---");
  const PoolRegistry = await ethers.getContractFactory("PoolRegistry");
  const poolRegistry = await PoolRegistry.deploy(adminAddress, instrumentRegistryAddress);
  await poolRegistry.waitForDeployment();
  const poolRegistryAddress = await poolRegistry.getAddress();
  console.log("PoolRegistry deployed to:", poolRegistryAddress);

  console.log("\n--- Deploying ServicingEventLog ---");
  const ServicingEventLog = await ethers.getContractFactory("ServicingEventLog");
  const servicingLog = await ServicingEventLog.deploy(adminAddress, instrumentRegistryAddress);
  await servicingLog.waitForDeployment();
  const servicingLogAddress = await servicingLog.getAddress();
  console.log("ServicingEventLog deployed to:", servicingLogAddress);

  console.log("\n--- Configuring Cross-Contract References ---");
  
  let tx = await instrumentRegistry.setPoolRegistry(poolRegistryAddress);
  await tx.wait();
  console.log("InstrumentRegistry.setPoolRegistry configured");

  tx = await instrumentRegistry.setServicingLog(servicingLogAddress);
  await tx.wait();
  console.log("InstrumentRegistry.setServicingLog configured");

  console.log("\n" + "=".repeat(60));
  console.log("LAYER 5G DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("\nDeployed Contracts:");
  console.log("  InstrumentRegistry:", instrumentRegistryAddress);
  console.log("  PoolRegistry:", poolRegistryAddress);
  console.log("  ServicingEventLog:", servicingLogAddress);
  console.log("\nNext Steps:");
  console.log("  1. Run 03-deploy-node-economy.ts");
  console.log("  2. Run 04-configure-roles.ts");

  return {
    instrumentRegistry: instrumentRegistryAddress,
    poolRegistry: poolRegistryAddress,
    servicingLog: servicingLogAddress,
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
