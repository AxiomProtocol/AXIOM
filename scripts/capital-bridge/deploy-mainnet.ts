import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const ADMIN_ADDRESS = "0x2bB2c2A7a1d82097488bf0b9c2a59c1910CD8D5d";
const OBSERVATION_START = Math.floor(new Date("2025-09-26").getTime() / 1000);

async function main() {
  console.log("=".repeat(60));
  console.log("Capital Bridge Mainnet Deployment");
  console.log("=".repeat(60));
  
  const [deployer] = await ethers.getSigners();
  console.log("\nDeployer address:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.01")) {
    throw new Error("Insufficient ETH balance for deployment. Need at least 0.01 ETH.");
  }

  console.log("\n--- Step 1: Deploy CapitalReadinessGate ---");
  const CapitalReadinessGate = await ethers.getContractFactory("CapitalReadinessGate");
  const readinessGate = await CapitalReadinessGate.deploy(ADMIN_ADDRESS, OBSERVATION_START);
  await readinessGate.waitForDeployment();
  const readinessGateAddress = await readinessGate.getAddress();
  console.log("CapitalReadinessGate deployed to:", readinessGateAddress);

  console.log("\n--- Step 2: Deploy CapitalBridgeHub ---");
  const CapitalBridgeHub = await ethers.getContractFactory("CapitalBridgeHub");
  const capitalBridgeHub = await CapitalBridgeHub.deploy(ADMIN_ADDRESS);
  await capitalBridgeHub.waitForDeployment();
  const capitalBridgeHubAddress = await capitalBridgeHub.getAddress();
  console.log("CapitalBridgeHub deployed to:", capitalBridgeHubAddress);

  console.log("\n--- Step 3: Configure CapitalBridgeHub ---");
  const tx = await capitalBridgeHub.setCapitalReadinessGate(readinessGateAddress);
  await tx.wait();
  console.log("Set readiness gate on CapitalBridgeHub");

  console.log("\n--- Deployment Summary ---");
  console.log("CapitalReadinessGate:", readinessGateAddress);
  console.log("CapitalBridgeHub:", capitalBridgeHubAddress);
  console.log("Admin Address:", ADMIN_ADDRESS);
  console.log("Observation Start:", new Date(OBSERVATION_START * 1000).toISOString());

  const deploymentInfo = {
    network: "Arbitrum One",
    chainId: 42161,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      CapitalReadinessGate: {
        address: readinessGateAddress,
        constructorArgs: {
          admin: ADMIN_ADDRESS,
          observationStartTimestamp: OBSERVATION_START,
        },
      },
      CapitalBridgeHub: {
        address: capitalBridgeHubAddress,
        constructorArgs: {
          admin: ADMIN_ADDRESS,
        },
        configuration: {
          readinessGate: readinessGateAddress,
        },
      },
    },
    roles: {
      note: "Roles must be granted via admin multisig",
      RISK_COMMITTEE_ROLE: "keccak256('RISK_COMMITTEE_ROLE')",
      SETTLEMENT_AUTHORITY_ROLE: "keccak256('SETTLEMENT_AUTHORITY_ROLE')",
      GUARDIAN_ROLE: "Granted to admin by default",
      RESEARCH_ATTESTOR_A_ROLE: "keccak256('RESEARCH_ATTESTOR_A_ROLE')",
      RESEARCH_ATTESTOR_B_ROLE: "keccak256('RESEARCH_ATTESTOR_B_ROLE')",
      REPORTING_ORACLE_ROLE: "keccak256('REPORTING_ORACLE_ROLE')",
    },
  };

  const outputPath = path.join(__dirname, "../../contracts/capital-bridge/deployment-info.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment info saved to:", outputPath);

  console.log("\n=".repeat(60));
  console.log("Deployment Complete!");
  console.log("=".repeat(60));
  console.log("\nNEXT STEPS:");
  console.log("1. Verify contracts on Arbiscan");
  console.log("2. Grant roles to appropriate addresses");
  console.log("3. Post initial attestation via REPORTING_ORACLE");
  console.log("4. Update main deployment-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
