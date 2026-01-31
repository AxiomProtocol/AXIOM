import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Layer 5G Configuration Script
 * 
 * IMPORTANT: This script must be run with the ADMIN wallet (ADMIN_PRIVATE_KEY)
 * The admin wallet has DEFAULT_ADMIN_ROLE on all Layer 5G contracts.
 * 
 * Usage:
 *   PRIVATE_KEY=$ADMIN_PRIVATE_KEY npx hardhat run scripts/capital-bridge/configure-layer5g.ts \
 *     --network arbitrum --config hardhat.config.capital-bridge.ts
 */

// Deployed Layer 5G contract addresses
const INSTRUMENT_REGISTRY = "0xcDE54ED7d19768be02Eb7C4799d7d8689310C7A5";
const POOL_REGISTRY = "0x7D386357F0D461Be9DA5FBb90E1F194c5aeafcD9";
const SERVICING_EVENT_LOG = "0x4A152350e3df79CbE895453ee1B7d486E7338093";

const ADMIN_ADDRESS = "0xA6Ed10E752d5FACD989ee9CEd113b3a064b47493";
const DEPLOYER_ADDRESS = "0x8d7892CF226B43d48B6e3ce988A1274e6D114C96";

async function main() {
  console.log("=".repeat(60));
  console.log("Layer 5G Configuration (Admin Wallet Required)");
  console.log("=".repeat(60));
  
  const [signer] = await ethers.getSigners();
  console.log("\nSigner address:", signer.address);
  
  if (signer.address.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
    console.error("\n*** ERROR: This script must be run with the ADMIN wallet ***");
    console.error("Expected:", ADMIN_ADDRESS);
    console.error("Got:", signer.address);
    console.error("\nUsage: PRIVATE_KEY=$ADMIN_PRIVATE_KEY npx hardhat run ...");
    process.exit(1);
  }
  
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  // Get contract instances
  const instrumentRegistry = await ethers.getContractAt("InstrumentRegistry", INSTRUMENT_REGISTRY, signer);
  const poolRegistry = await ethers.getContractAt("PoolRegistry", POOL_REGISTRY, signer);
  const servicingEventLog = await ethers.getContractAt("ServicingEventLog", SERVICING_EVENT_LOG, signer);

  console.log("\n--- Step 1: Configure Cross-Contract References ---");
  
  // Set PoolRegistry on InstrumentRegistry
  console.log("Setting PoolRegistry on InstrumentRegistry...");
  let tx = await instrumentRegistry.setPoolRegistry(POOL_REGISTRY);
  await tx.wait();
  console.log("  TX:", tx.hash);
  
  // Set InstrumentRegistry on PoolRegistry
  console.log("Setting InstrumentRegistry on PoolRegistry...");
  tx = await poolRegistry.setInstrumentRegistry(INSTRUMENT_REGISTRY);
  await tx.wait();
  console.log("  TX:", tx.hash);
  
  // Set InstrumentRegistry on ServicingEventLog
  console.log("Setting InstrumentRegistry on ServicingEventLog...");
  tx = await servicingEventLog.setInstrumentRegistry(INSTRUMENT_REGISTRY);
  await tx.wait();
  console.log("  TX:", tx.hash);

  console.log("\n--- Step 2: Grant Roles to Deployer ---");
  
  // Role hashes
  const ISSUER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ISSUER_ROLE"));
  const SERVICER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SERVICER_ROLE"));
  const POOL_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("POOL_MANAGER_ROLE"));
  
  // Grant ISSUER_ROLE on InstrumentRegistry
  console.log("Granting ISSUER_ROLE to deployer on InstrumentRegistry...");
  tx = await instrumentRegistry.grantRole(ISSUER_ROLE, DEPLOYER_ADDRESS);
  await tx.wait();
  console.log("  TX:", tx.hash);
  
  // Grant SERVICER_ROLE on InstrumentRegistry
  console.log("Granting SERVICER_ROLE to deployer on InstrumentRegistry...");
  tx = await instrumentRegistry.grantRole(SERVICER_ROLE, DEPLOYER_ADDRESS);
  await tx.wait();
  console.log("  TX:", tx.hash);
  
  // Grant POOL_MANAGER_ROLE on PoolRegistry
  console.log("Granting POOL_MANAGER_ROLE to deployer on PoolRegistry...");
  tx = await poolRegistry.grantRole(POOL_MANAGER_ROLE, DEPLOYER_ADDRESS);
  await tx.wait();
  console.log("  TX:", tx.hash);
  
  // Grant SERVICER_ROLE on ServicingEventLog
  console.log("Granting SERVICER_ROLE to deployer on ServicingEventLog...");
  tx = await servicingEventLog.grantRole(SERVICER_ROLE, DEPLOYER_ADDRESS);
  await tx.wait();
  console.log("  TX:", tx.hash);

  console.log("\n--- Configuration Complete ---");
  console.log("InstrumentRegistry.poolRegistry =", POOL_REGISTRY);
  console.log("PoolRegistry.instrumentRegistry =", INSTRUMENT_REGISTRY);
  console.log("ServicingEventLog.instrumentRegistry =", INSTRUMENT_REGISTRY);
  console.log("\nRoles granted to deployer:", DEPLOYER_ADDRESS);
  console.log("  - ISSUER_ROLE (InstrumentRegistry)");
  console.log("  - SERVICER_ROLE (InstrumentRegistry, ServicingEventLog)");
  console.log("  - POOL_MANAGER_ROLE (PoolRegistry)");

  console.log("\n=".repeat(60));
  console.log("Layer 5G Configuration Complete!");
  console.log("=".repeat(60));
  console.log("\nNEXT STEPS:");
  console.log("1. Verify contracts on Blockscout");
  console.log("2. Update deployment-info.json with configuration status");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
