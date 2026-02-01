import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying BuilderFarmerCredit with account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Use exact checksummed addresses from shared/contracts.ts
  const AXUSD_ADDRESS = "0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c";
  const TREASURY_ADDRESS = "0x3fD63728288546AC41dAe3bf25ca383061c3A929";
  const LENDING_POOL = "0x5a09cb67518e6E28d8307D75174430939C044A7d"; // DSCR_POOL_VAULT

  console.log("\n=== BuilderFarmerCredit Contract Deployment ===\n");
  console.log("Network: Arbitrum One (Chain ID: 42161)");
  console.log("Payment Token: AXUSD", AXUSD_ADDRESS);
  console.log("Treasury:", TREASURY_ADDRESS);
  console.log("Lending Pool:", LENDING_POOL);
  console.log("");

  console.log("Deploying BuilderFarmerCredit...");
  const BuilderFarmerCredit = await ethers.getContractFactory("BuilderFarmerCredit");
  const builderFarmerCredit = await BuilderFarmerCredit.deploy(
    AXUSD_ADDRESS,
    TREASURY_ADDRESS,
    LENDING_POOL
  );
  await builderFarmerCredit.waitForDeployment();
  const address = await builderFarmerCredit.getAddress();
  console.log("BuilderFarmerCredit deployed to:", address);

  console.log("\n=== Deployment Complete ===\n");
  console.log("Add to shared/contracts.ts:");
  console.log(`  // Contract 56: BuilderFarmerCredit`);
  console.log(`  BUILDER_FARMER_CREDIT: '${address}'`);
  console.log("\n=== Verification Command ===\n");
  console.log(`npx hardhat verify --network arbitrum ${address} "${AXUSD_ADDRESS}" "${TREASURY_ADDRESS}" "${LENDING_POOL}" --config hardhat-land.config.ts`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
