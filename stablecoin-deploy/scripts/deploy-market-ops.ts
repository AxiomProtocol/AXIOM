import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  AXUSD - MARKETOPERATIONS DEPLOYMENT (Camelot DEX)");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\nDeployer:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  // Previously deployed contracts
  const contracts = {
    axusd: "0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C",
    backstopVaultETH: "0xF2540BD6fa365Bf8F1b9dd4efa7534Ff6522393f"
  };

  // Camelot DEX on Arbitrum
  const CAMELOT_ROUTER = "0xc873fEcbd354f5A56E00E710B90EF4201db2448d";
  const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  // NOTE: You need to create an AXUSD/USDC liquidity pair on Camelot first
  // Once created, replace this with the actual pair address
  const AXUSD_USDC_PAIR = "0x0000000000000000000000000000000000000000"; // REPLACE AFTER LP CREATION

  console.log("\n[INFO] Camelot Router:", CAMELOT_ROUTER);
  console.log("[INFO] USDC:", USDC_ARBITRUM);
  
  if (AXUSD_USDC_PAIR === "0x0000000000000000000000000000000000000000") {
    console.log("\n⚠️  AXUSD/USDC Pair not created yet!");
    console.log("\nTo create the liquidity pair:");
    console.log("1. Go to https://app.camelot.exchange/liquidity");
    console.log("2. Connect wallet with AXUSD + USDC tokens");
    console.log("3. Add liquidity for AXUSD/USDC pair");
    console.log("4. Copy the LP pair address from Arbiscan/Camelot");
    console.log("5. Update AXUSD_USDC_PAIR in this script");
    console.log("6. Re-run this deployment");
    return;
  }

  console.log("\nDeploying MarketOperations...");
  const lowerBound = ethers.parseEther("0.995"); // $0.995 - buy AXUSD
  const upperBound = ethers.parseEther("1.005"); // $1.005 - sell AXUSD
  const dailyBuyLimit = ethers.parseEther("100000"); // 100k AXUSD
  const dailySellLimit = ethers.parseEther("100000"); // 100k AXUSD

  const MarketOperations = await ethers.getContractFactory("MarketOperations");
  const marketOps = await MarketOperations.deploy(
    contracts.axusd,
    USDC_ARBITRUM,
    CAMELOT_ROUTER,
    AXUSD_USDC_PAIR,
    lowerBound,
    upperBound,
    dailyBuyLimit,
    dailySellLimit
  );
  await marketOps.waitForDeployment();
  const marketOpsAddress = await marketOps.getAddress();
  console.log("   ✓ MarketOperations:", marketOpsAddress);

  // Update deployed contracts file
  const deployedFile = fs.readFileSync("deployed-full.json", "utf8");
  const deployed = JSON.parse(deployedFile);
  deployed.contracts.marketOperations = marketOpsAddress;
  deployed.dexIntegration = {
    router: CAMELOT_ROUTER,
    pair: AXUSD_USDC_PAIR,
    dex: "Camelot"
  };
  fs.writeFileSync("deployed-full.json", JSON.stringify(deployed, null, 2));

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  MARKETOPERATIONS DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\nMarketOperations:", marketOpsAddress);
  console.log("Camelot Router:", CAMELOT_ROUTER);
  console.log("AXUSD/USDC Pair:", AXUSD_USDC_PAIR);
  console.log("\nPeg maintenance bounds: $0.995 - $1.005");

  return marketOpsAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
