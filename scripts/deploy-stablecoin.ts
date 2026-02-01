import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying AXUSD Stablecoin System with account:", deployer.address);

  const GLOBAL_DEBT_CEILING = ethers.parseEther("5000000");
  const DAILY_MINT_LIMIT = ethers.parseEther("1000000");
  const PER_ADDRESS_LIMIT = ethers.parseEther("100000");

  console.log("\n1. Deploying AxiomStable (AXUSD Token)...");
  const AxiomStable = await ethers.getContractFactory("AxiomStable");
  const axusd = await AxiomStable.deploy();
  await axusd.waitForDeployment();
  console.log("   AxiomStable deployed to:", await axusd.getAddress());

  console.log("\n2. Deploying OracleAdapter...");
  const OracleAdapter = await ethers.getContractFactory("OracleAdapter");
  const oracle = await OracleAdapter.deploy();
  await oracle.waitForDeployment();
  console.log("   OracleAdapter deployed to:", await oracle.getAddress());

  console.log("\n3. Deploying RateLimiter...");
  const RateLimiter = await ethers.getContractFactory("RateLimiter");
  const limiter = await RateLimiter.deploy(DAILY_MINT_LIMIT, PER_ADDRESS_LIMIT);
  await limiter.waitForDeployment();
  console.log("   RateLimiter deployed to:", await limiter.getAddress());

  console.log("\n4. Deploying VaultEngine...");
  const VaultEngine = await ethers.getContractFactory("VaultEngine");
  const vault = await VaultEngine.deploy(
    await axusd.getAddress(),
    await oracle.getAddress(),
    await limiter.getAddress(),
    GLOBAL_DEBT_CEILING
  );
  await vault.waitForDeployment();
  console.log("   VaultEngine deployed to:", await vault.getAddress());

  console.log("\n5. Deploying Liquidator...");
  const Liquidator = await ethers.getContractFactory("Liquidator");
  const liquidator = await Liquidator.deploy(
    await vault.getAddress(),
    await axusd.getAddress()
  );
  await liquidator.waitForDeployment();
  console.log("   Liquidator deployed to:", await liquidator.getAddress());

  console.log("\n6. Configuring roles...");
  
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));
  const RECORDER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RECORDER_ROLE"));
  const LIQUIDATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("LIQUIDATOR_ROLE"));

  await axusd.grantRole(MINTER_ROLE, await vault.getAddress());
  console.log("   Granted MINTER_ROLE to VaultEngine");

  await axusd.grantRole(BURNER_ROLE, await vault.getAddress());
  console.log("   Granted BURNER_ROLE to VaultEngine");

  await limiter.grantRole(RECORDER_ROLE, await vault.getAddress());
  console.log("   Granted RECORDER_ROLE to VaultEngine");

  await vault.grantRole(LIQUIDATOR_ROLE, await liquidator.getAddress());
  console.log("   Granted LIQUIDATOR_ROLE to Liquidator");

  console.log("\n========================================");
  console.log("AXUSD STABLECOIN SYSTEM DEPLOYED");
  console.log("========================================");
  console.log("AxiomStable (AXUSD):", await axusd.getAddress());
  console.log("OracleAdapter:      ", await oracle.getAddress());
  console.log("RateLimiter:        ", await limiter.getAddress());
  console.log("VaultEngine:        ", await vault.getAddress());
  console.log("Liquidator:         ", await liquidator.getAddress());
  console.log("========================================");

  console.log("\nNEXT STEPS:");
  console.log("1. Configure oracle feeds for each collateral type");
  console.log("2. Add collateral types to VaultEngine");
  console.log("3. Set FeeBurner address in VaultEngine");
  console.log("4. Transfer admin roles to multisig + timelock");

  console.log("\nChainlink Feeds on Arbitrum One:");
  console.log("  USDC/USD: 0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3");
  console.log("  ETH/USD:  0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612");
  console.log("  wstETH:   0xB1552C5e96B312d0Bf8b554186F846C40614a540");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
