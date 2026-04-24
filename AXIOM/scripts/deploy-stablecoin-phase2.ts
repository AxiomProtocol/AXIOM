import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying AXUSD Phase 2 with account:", deployer.address);

  const AXUSD_ADDRESS = process.env.AXUSD_ADDRESS || "";
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS || "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506";
  const PAIR_ADDRESS = process.env.PAIR_ADDRESS || "";

  if (!AXUSD_ADDRESS) {
    console.log("Please set AXUSD_ADDRESS from Phase 1 deployment");
    return;
  }

  const MARKET_OPS_DAILY_LIMIT = ethers.parseEther("100");
  const EMERGENCY_DAILY_LIMIT = ethers.parseEther("100");
  const PSM_DEBT_CEILING = ethers.parseUnits("1000000", 6);
  const LOWER_PEG_BOUND = ethers.parseEther("0.995");
  const UPPER_PEG_BOUND = ethers.parseEther("1.005");
  const DAILY_BUY_LIMIT = ethers.parseEther("100000");
  const DAILY_SELL_LIMIT = ethers.parseEther("100000");

  console.log("\n1. Deploying BackstopVault...");
  const BackstopVault = await ethers.getContractFactory("BackstopVault");
  const backstopVault = await BackstopVault.deploy(MARKET_OPS_DAILY_LIMIT, EMERGENCY_DAILY_LIMIT);
  await backstopVault.waitForDeployment();
  console.log("   BackstopVault deployed to:", await backstopVault.getAddress());

  console.log("\n2. Deploying PSM (Peg Stability Module)...");
  const PSM = await ethers.getContractFactory("PSM");
  const psm = await PSM.deploy(
    AXUSD_ADDRESS,
    USDC_ADDRESS,
    6,
    10,
    10,
    PSM_DEBT_CEILING
  );
  await psm.waitForDeployment();
  console.log("   PSM deployed to:", await psm.getAddress());

  if (PAIR_ADDRESS) {
    console.log("\n3. Deploying MarketOperations...");
    const MarketOperations = await ethers.getContractFactory("MarketOperations");
    const marketOps = await MarketOperations.deploy(
      AXUSD_ADDRESS,
      USDC_ADDRESS,
      ROUTER_ADDRESS,
      PAIR_ADDRESS,
      LOWER_PEG_BOUND,
      UPPER_PEG_BOUND,
      DAILY_BUY_LIMIT,
      DAILY_SELL_LIMIT
    );
    await marketOps.waitForDeployment();
    console.log("   MarketOperations deployed to:", await marketOps.getAddress());

    console.log("\n4. Configuring MarketOperations with BackstopVault...");
    await marketOps.setBackstopVault(await backstopVault.getAddress());
    console.log("   BackstopVault linked to MarketOperations");

    const MARKET_OPS_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MARKET_OPS_ROLE"));
    await backstopVault.grantRole(MARKET_OPS_ROLE, await marketOps.getAddress());
    console.log("   MARKET_OPS_ROLE granted to MarketOperations");

    console.log("\n========================================");
    console.log("PHASE 2 CONTRACTS DEPLOYED");
    console.log("========================================");
    console.log("BackstopVault:    ", await backstopVault.getAddress());
    console.log("PSM:              ", await psm.getAddress());
    console.log("MarketOperations: ", await marketOps.getAddress());
  } else {
    console.log("\n3. Skipping MarketOperations (no PAIR_ADDRESS set)");
    console.log("   Deploy after creating AXUSD/USDC liquidity pool");

    console.log("\n========================================");
    console.log("PHASE 2 CONTRACTS DEPLOYED (PARTIAL)");
    console.log("========================================");
    console.log("BackstopVault:", await backstopVault.getAddress());
    console.log("PSM:          ", await psm.getAddress());
  }

  console.log("========================================");

  console.log("\nNEXT STEPS:");
  console.log("1. Grant MINTER_ROLE to PSM on AxiomStable");
  console.log("2. Grant BURNER_ROLE to PSM on AxiomStable");
  console.log("3. Grant MINTER_ROLE to MarketOperations on AxiomStable");
  console.log("4. Grant BURNER_ROLE to MarketOperations on AxiomStable");
  console.log("5. Fund BackstopVault with ETH for emergency reserves");
  console.log("6. Set fee recipient on PSM");
  console.log("7. Transfer admin roles to multisig + timelock");

  console.log("\nARBITRUM ONE DEX ROUTERS:");
  console.log("  SushiSwap: 0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506");
  console.log("  Camelot:   0xc873fEcbd354f5A56E00E710B90EF4201db2448d");
  console.log("  Uniswap:   0xE592427A0AEce92De3Edee1F18E0157C05861564");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
