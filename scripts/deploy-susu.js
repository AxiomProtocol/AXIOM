const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying AxiomSusuHub...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Configuration - update these for your deployment
  const TREASURY_VAULT = process.env.TREASURY_VAULT || "0x2bB2c2A7a1d82097488bf0b9c2a59c1910CD8D5d";
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;
  
  // Deploy AxiomSusuHub
  const SusuHub = await ethers.getContractFactory("AxiomSusuHub");
  const susuHub = await SusuHub.deploy(TREASURY_VAULT, ADMIN_ADDRESS);
  await susuHub.waitForDeployment();
  
  const susuAddress = await susuHub.getAddress();
  console.log("AxiomSusuHub deployed to:", susuAddress);
  
  // Verify deployment
  console.log("\n--- Deployment Summary ---");
  console.log("Contract Address:", susuAddress);
  console.log("Treasury Vault:", TREASURY_VAULT);
  console.log("Admin Address:", ADMIN_ADDRESS);
  console.log("Default Protocol Fee:", await susuHub.defaultProtocolFeeBps(), "bps");
  console.log("Default Grace Period:", await susuHub.defaultGracePeriod(), "seconds");
  console.log("Default Late Fee:", await susuHub.defaultLateFeeBps(), "bps");
  
  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    contracts: {
      AxiomSusuHub: {
        address: susuAddress,
        deployedAt: new Date().toISOString(),
        constructorArgs: {
          treasuryVault: TREASURY_VAULT,
          admin: ADMIN_ADDRESS
        }
      }
    }
  };
  
  console.log("\n--- Deployment Info (JSON) ---");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  // Instructions for verification
  console.log("\n--- Verification Command ---");
  console.log(`npx hardhat verify --network ${network.name} ${susuAddress} "${TREASURY_VAULT}" "${ADMIN_ADDRESS}"`);
  
  return { susuHub, deploymentInfo };
}

// Example: Create a SUSU pool after deployment
async function createExamplePool(susuHubAddress, tokenAddress) {
  const susuHub = await ethers.getContractAt("AxiomSusuHub", susuHubAddress);
  
  const memberCount = 5;
  const contributionAmount = ethers.parseEther("100"); // 100 AXM
  const cycleDuration = 7 * 24 * 60 * 60; // 1 week
  const startTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const randomizedOrder = false;
  const openJoin = true;
  const protocolFeeBps = 100; // 1%
  
  console.log("\nCreating example SUSU pool...");
  const tx = await susuHub.createPool(
    tokenAddress,
    memberCount,
    contributionAmount,
    cycleDuration,
    startTime,
    randomizedOrder,
    openJoin,
    protocolFeeBps
  );
  
  const receipt = await tx.wait();
  console.log("Pool created! Transaction:", receipt.hash);
  
  // Get pool details
  const pool = await susuHub.getPool(1);
  console.log("\n--- Pool Details ---");
  console.log("Pool ID: 1");
  console.log("Member Count:", pool.memberCount.toString());
  console.log("Contribution Amount:", ethers.formatEther(pool.contributionAmount), "tokens");
  console.log("Cycle Duration:", pool.cycleDuration.toString(), "seconds");
  console.log("Start Time:", new Date(Number(pool.startTime) * 1000).toISOString());
  console.log("Status: Pending (waiting for members)");
}

// Main execution
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

module.exports = { main, createExamplePool };
