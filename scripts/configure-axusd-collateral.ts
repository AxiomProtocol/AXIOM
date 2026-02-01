import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════════");
  console.log("  AXUSD - CONFIGURE ORACLE FEEDS & COLLATERAL TYPES");
  console.log("═══════════════════════════════════════════════════════");
  console.log("\nDeployer:", deployer.address);

  const ORACLE_ADAPTER = "0x6dEC19DD5472F5a82e37972008De3eBB46b754B0";
  const VAULT_ENGINE = "0x72aaBb0d84077859276513106Ea225E4edE80db0";

  const WETH_ARBITRUM = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
  const WBTC_ARBITRUM = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

  const CHAINLINK_ETH_USD = "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612";
  const CHAINLINK_WBTC_USD = "0xd0C7101eACbB49F3deCcCc166d238410D6D46d57";

  const STALE_THRESHOLD = 3600;

  const oracleAdapter = await ethers.getContractAt("OracleAdapter", ORACLE_ADAPTER);
  const vaultEngine = await ethers.getContractAt("VaultEngine", VAULT_ENGINE);

  console.log("\n[1/4] Setting ETH/USD price feed...");
  try {
    await oracleAdapter.setFeed(WETH_ARBITRUM, CHAINLINK_ETH_USD, STALE_THRESHOLD);
    console.log("   ✓ ETH/USD feed configured");
  } catch (e: any) {
    console.log("   ⚠ ETH/USD feed error:", e.reason || e.message);
  }

  console.log("\n[2/4] Setting WBTC/USD price feed...");
  try {
    await oracleAdapter.setFeed(WBTC_ARBITRUM, CHAINLINK_WBTC_USD, STALE_THRESHOLD);
    console.log("   ✓ WBTC/USD feed configured");
  } catch (e: any) {
    console.log("   ⚠ WBTC/USD feed error:", e.reason || e.message);
  }

  console.log("\n[3/4] Adding WETH as collateral...");
  try {
    await vaultEngine.addCollateral(
      WETH_ARBITRUM,
      15000,
      13000,
      500,
      ethers.parseEther("500000"),
      200
    );
    console.log("   ✓ WETH collateral added");
    console.log("     - Min Collateral Ratio: 150%");
    console.log("     - Liquidation Threshold: 130%");
    console.log("     - Liquidation Penalty: 5%");
    console.log("     - Debt Ceiling: 500,000 AXUSD");
    console.log("     - Stability Fee: 2%");
  } catch (e: any) {
    console.log("   ⚠ WETH collateral error:", e.reason || e.message);
  }

  console.log("\n[4/4] Adding WBTC as collateral...");
  try {
    await vaultEngine.addCollateral(
      WBTC_ARBITRUM,
      15000,
      13000,
      500,
      ethers.parseEther("500000"),
      200
    );
    console.log("   ✓ WBTC collateral added");
    console.log("     - Min Collateral Ratio: 150%");
    console.log("     - Liquidation Threshold: 130%");
    console.log("     - Liquidation Penalty: 5%");
    console.log("     - Debt Ceiling: 500,000 AXUSD");
    console.log("     - Stability Fee: 2%");
  } catch (e: any) {
    console.log("   ⚠ WBTC collateral error:", e.reason || e.message);
  }

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  CONFIGURATION COMPLETE");
  console.log("═══════════════════════════════════════════════════════");
  console.log("\nCollateral Types Configured:");
  console.log("  - WETH:", WETH_ARBITRUM);
  console.log("  - WBTC:", WBTC_ARBITRUM);
  console.log("\nOracle Feeds:");
  console.log("  - ETH/USD:", CHAINLINK_ETH_USD);
  console.log("  - WBTC/USD:", CHAINLINK_WBTC_USD);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Configuration failed:", error);
    process.exit(1);
  });
