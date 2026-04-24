import { ethers } from "hardhat";

async function main() {
  console.log("=".repeat(60));
  console.log("CAPITAL BRIDGE LAYER 5E DEPLOYMENT");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("\nDeployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const adminAddress = process.env.ADMIN_ADDRESS || deployer.address;
  console.log("Admin Address:", adminAddress);

  console.log("\n--- Deploying CapitalReadinessGate ---");
  const ReadinessGate = await ethers.getContractFactory("CapitalReadinessGate");
  const readinessGate = await ReadinessGate.deploy(adminAddress);
  await readinessGate.waitForDeployment();
  const readinessGateAddress = await readinessGate.getAddress();
  console.log("CapitalReadinessGate deployed to:", readinessGateAddress);

  console.log("\n--- Deploying CapitalBridgeHub ---");
  const Hub = await ethers.getContractFactory("CapitalBridgeHub");
  const hub = await Hub.deploy(adminAddress);
  await hub.waitForDeployment();
  const hubAddress = await hub.getAddress();
  console.log("CapitalBridgeHub deployed to:", hubAddress);

  console.log("\n--- Configuring CapitalBridgeHub ---");
  const tx = await hub.setReadinessGate(readinessGateAddress);
  await tx.wait();
  console.log("ReadinessGate configured on Hub");

  console.log("\n" + "=".repeat(60));
  console.log("LAYER 5E DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("\nDeployed Contracts:");
  console.log("  CapitalReadinessGate:", readinessGateAddress);
  console.log("  CapitalBridgeHub:", hubAddress);
  console.log("\nNext Steps:");
  console.log("  1. Run 02-deploy-layer5g.ts");
  console.log("  2. Run 03-deploy-node-economy.ts");
  console.log("  3. Run 04-configure-roles.ts");
  console.log("  4. Run 05-start-observation.ts");

  return {
    readinessGate: readinessGateAddress,
    hub: hubAddress,
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
