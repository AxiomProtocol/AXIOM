import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Phase 2 Land Acquisition contracts with account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const AXUSD_ADDRESS = "0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c";
  const TREASURY_ADDRESS = "0x3fD63728288546AC41dAe3bf25ca383061c3A929";
  const REVENUE_ROUTER_ADDRESS = "0x39A9Ca593d350450d93aF7F24dC1A682df47F30a";
  const ESCROW_WALLET = deployer.address;

  console.log("\n=== Phase 2 Land Acquisition Contracts Deployment ===\n");
  console.log("Network: Arbitrum One (Chain ID: 42161)");
  console.log("Payment Token: AXUSD", AXUSD_ADDRESS);
  console.log("Treasury:", TREASURY_ADDRESS);
  console.log("Revenue Router:", REVENUE_ROUTER_ADDRESS);
  console.log("");

  console.log("1. Deploying LandOptionRegistry...");
  const LandOptionRegistry = await ethers.getContractFactory("LandOptionRegistry");
  const landOptionRegistry = await LandOptionRegistry.deploy(
    AXUSD_ADDRESS,
    TREASURY_ADDRESS,
    REVENUE_ROUTER_ADDRESS
  );
  await landOptionRegistry.waitForDeployment();
  const landOptionRegistryAddress = await landOptionRegistry.getAddress();
  console.log("   LandOptionRegistry deployed to:", landOptionRegistryAddress);

  console.log("\n2. Deploying LandAcquisitionPool...");
  const LandAcquisitionPool = await ethers.getContractFactory("LandAcquisitionPool");
  const landAcquisitionPool = await LandAcquisitionPool.deploy(
    AXUSD_ADDRESS,
    landOptionRegistryAddress,
    TREASURY_ADDRESS
  );
  await landAcquisitionPool.waitForDeployment();
  const landAcquisitionPoolAddress = await landAcquisitionPool.getAddress();
  console.log("   LandAcquisitionPool deployed to:", landAcquisitionPoolAddress);

  console.log("\n3. Deploying RegCFCrowdfunding...");
  const RegCFCrowdfunding = await ethers.getContractFactory("RegCFCrowdfunding");
  const regCFCrowdfunding = await RegCFCrowdfunding.deploy(
    AXUSD_ADDRESS,
    landOptionRegistryAddress,
    ESCROW_WALLET
  );
  await regCFCrowdfunding.waitForDeployment();
  const regCFCrowdfundingAddress = await regCFCrowdfunding.getAddress();
  console.log("   RegCFCrowdfunding deployed to:", regCFCrowdfundingAddress);

  console.log("\n=== Deployment Complete ===\n");
  console.log("Add these to shared/contracts.ts:\n");
  console.log(`// Phase 2 Land Acquisition Contracts`);
  console.log(`// Deployed: ${new Date().toISOString().split('T')[0]} | Arbitrum One`);
  console.log(`// Features: SEC Reg CF compliant land crowdfunding, community pooling, ERC1155 land options`);
  console.log(`export const LAND_ACQUISITION_CONTRACTS = {`);
  console.log(`  LAND_OPTION_REGISTRY: '${landOptionRegistryAddress}',`);
  console.log(`  LAND_ACQUISITION_POOL: '${landAcquisitionPoolAddress}',`);
  console.log(`  REG_CF_CROWDFUNDING: '${regCFCrowdfundingAddress}'`);
  console.log(`} as const;`);

  console.log("\n=== Verification Commands ===\n");
  console.log(`npx hardhat verify --network arbitrum ${landOptionRegistryAddress} "${AXUSD_ADDRESS}" "${TREASURY_ADDRESS}" "${REVENUE_ROUTER_ADDRESS}" --config hardhat-land.config.ts`);
  console.log(`npx hardhat verify --network arbitrum ${landAcquisitionPoolAddress} "${AXUSD_ADDRESS}" "${landOptionRegistryAddress}" "${TREASURY_ADDRESS}" --config hardhat-land.config.ts`);
  console.log(`npx hardhat verify --network arbitrum ${regCFCrowdfundingAddress} "${AXUSD_ADDRESS}" "${landOptionRegistryAddress}" "${ESCROW_WALLET}" --config hardhat-land.config.ts`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
