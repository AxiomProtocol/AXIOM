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
  
  // AXUSD/USDC liquidity pair on Camelot (created via add-liquidity-camelot.ts)
  const AXUSD_USDC_PAIR = "0x266F6Cf7eA36d3f676eb292B274EAb25172790a2";

  console.log("\n[INFO] Camelot Router:", CAMELOT_ROUTER);
  console.log("[INFO] USDC:", USDC_ARBITRUM);
  console.log("[INFO] LP Pair:", AXUSD_USDC_PAIR);

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
