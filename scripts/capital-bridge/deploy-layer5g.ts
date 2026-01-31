import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const ADMIN_ADDRESS = "0xA6Ed10E752d5FACD989ee9CEd113b3a064b47493";

async function main() {
  console.log("=".repeat(60));
  console.log("Layer 5G Securitization Mainnet Deployment");
  console.log("=".repeat(60));
  
  const [deployer] = await ethers.getSigners();
  console.log("\nDeployer address:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.005")) {
    throw new Error("Insufficient ETH balance for deployment. Need at least 0.005 ETH.");
  }

  console.log("\n--- Step 1: Deploy InstrumentRegistry ---");
  const InstrumentRegistry = await ethers.getContractFactory("InstrumentRegistry");
  const instrumentRegistry = await InstrumentRegistry.deploy(ADMIN_ADDRESS);
  await instrumentRegistry.waitForDeployment();
  const instrumentRegistryAddress = await instrumentRegistry.getAddress();
  console.log("InstrumentRegistry deployed to:", instrumentRegistryAddress);

  console.log("\n--- Step 2: Deploy PoolRegistry ---");
  const PoolRegistry = await ethers.getContractFactory("PoolRegistry");
  const poolRegistry = await PoolRegistry.deploy(ADMIN_ADDRESS);
  await poolRegistry.waitForDeployment();
  const poolRegistryAddress = await poolRegistry.getAddress();
  console.log("PoolRegistry deployed to:", poolRegistryAddress);

  console.log("\n--- Step 3: Deploy ServicingEventLog ---");
  const ServicingEventLog = await ethers.getContractFactory("ServicingEventLog");
  const servicingEventLog = await ServicingEventLog.deploy(ADMIN_ADDRESS);
  await servicingEventLog.waitForDeployment();
  const servicingEventLogAddress = await servicingEventLog.getAddress();
  console.log("ServicingEventLog deployed to:", servicingEventLogAddress);

  console.log("\n--- Step 4: Configure Cross-Contract References ---");
  
  // Set PoolRegistry on InstrumentRegistry
  console.log("Setting PoolRegistry on InstrumentRegistry...");
  let tx = await instrumentRegistry.setPoolRegistry(poolRegistryAddress);
  await tx.wait();
  console.log("  Done: InstrumentRegistry.poolRegistry =", poolRegistryAddress);
  
  // Set InstrumentRegistry on PoolRegistry
  console.log("Setting InstrumentRegistry on PoolRegistry...");
  tx = await poolRegistry.setInstrumentRegistry(instrumentRegistryAddress);
  await tx.wait();
  console.log("  Done: PoolRegistry.instrumentRegistry =", instrumentRegistryAddress);
  
  // Set InstrumentRegistry on ServicingEventLog
  console.log("Setting InstrumentRegistry on ServicingEventLog...");
  tx = await servicingEventLog.setInstrumentRegistry(instrumentRegistryAddress);
  await tx.wait();
  console.log("  Done: ServicingEventLog.instrumentRegistry =", instrumentRegistryAddress);

  console.log("\n--- Deployment Summary ---");
  console.log("InstrumentRegistry:", instrumentRegistryAddress);
  console.log("PoolRegistry:", poolRegistryAddress);
  console.log("ServicingEventLog:", servicingEventLogAddress);
  console.log("Admin Address:", ADMIN_ADDRESS);

  // Load existing deployment info
  const existingInfoPath = path.join(__dirname, "../../contracts/capital-bridge/deployment-info.json");
  let existingInfo: any = {};
  if (fs.existsSync(existingInfoPath)) {
    existingInfo = JSON.parse(fs.readFileSync(existingInfoPath, "utf8"));
  }

  // Merge Layer 5G contracts
  const deploymentInfo = {
    ...existingInfo,
    layer5gDeployedAt: new Date().toISOString(),
    layer5gDeployer: deployer.address,
    contracts: {
      ...existingInfo.contracts,
      InstrumentRegistry: {
        address: instrumentRegistryAddress,
        sublayer: "5G",
        constructorArgs: {
          admin: ADMIN_ADDRESS,
        },
        configuration: {
          poolRegistry: poolRegistryAddress,
        },
        roles: {
          ISSUER_ROLE: "keccak256('ISSUER_ROLE')",
          SERVICER_ROLE: "keccak256('SERVICER_ROLE')",
          GUARDIAN_ROLE: "Granted to admin by default",
        },
      },
      PoolRegistry: {
        address: poolRegistryAddress,
        sublayer: "5G",
        constructorArgs: {
          admin: ADMIN_ADDRESS,
        },
        configuration: {
          instrumentRegistry: instrumentRegistryAddress,
        },
        roles: {
          POOL_MANAGER_ROLE: "keccak256('POOL_MANAGER_ROLE')",
          GUARDIAN_ROLE: "Granted to admin by default",
        },
      },
      ServicingEventLog: {
        address: servicingEventLogAddress,
        sublayer: "5G",
        constructorArgs: {
          admin: ADMIN_ADDRESS,
        },
        configuration: {
          instrumentRegistry: instrumentRegistryAddress,
        },
        roles: {
          SERVICER_ROLE: "keccak256('SERVICER_ROLE')",
          GUARDIAN_ROLE: "Granted to admin by default",
        },
      },
    },
  };

  fs.writeFileSync(existingInfoPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment info saved to:", existingInfoPath);

  console.log("\n=".repeat(60));
  console.log("Layer 5G Deployment Complete!");
  console.log("=".repeat(60));
  console.log("\nNEXT STEPS:");
  console.log("1. Verify contracts on Arbiscan/Blockscout");
  console.log("2. Grant ISSUER_ROLE, SERVICER_ROLE, POOL_MANAGER_ROLE to appropriate addresses");
  console.log("3. Update layer-5-sublayers.md with deployed addresses");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
