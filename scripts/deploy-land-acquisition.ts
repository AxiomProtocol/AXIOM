import { ethers } from "hardhat";
import { AXUSD_STABLECOIN_CONTRACTS, CORE_CONTRACTS, AXUSD_INTEGRATION_CONTRACTS } from "../shared/contracts";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  const AXUSD_ADDRESS = AXUSD_STABLECOIN_CONTRACTS.AXUSD;
  const TREASURY_ADDRESS = CORE_CONTRACTS.TREASURY_REVENUE;
  const REVENUE_ROUTER_ADDRESS = AXUSD_INTEGRATION_CONTRACTS.REVENUE_ROUTER;
  const ESCROW_WALLET = deployer.address;

  console.log("\n=== Phase 2 Land Acquisition Contracts Deployment ===\n");

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
  console.log(`export const LAND_ACQUISITION_CONTRACTS = {`);
  console.log(`  LAND_OPTION_REGISTRY: '${landOptionRegistryAddress}',`);
  console.log(`  LAND_ACQUISITION_POOL: '${landAcquisitionPoolAddress}',`);
  console.log(`  REG_CF_CROWDFUNDING: '${regCFCrowdfundingAddress}'`);
  console.log(`} as const;`);

  console.log("\n=== Verification Commands ===\n");
  console.log(`npx hardhat verify --network arbitrumOne ${landOptionRegistryAddress} "${AXUSD_ADDRESS}" "${TREASURY_ADDRESS}" "${REVENUE_ROUTER_ADDRESS}"`);
  console.log(`npx hardhat verify --network arbitrumOne ${landAcquisitionPoolAddress} "${AXUSD_ADDRESS}" "${landOptionRegistryAddress}" "${TREASURY_ADDRESS}"`);
  console.log(`npx hardhat verify --network arbitrumOne ${regCFCrowdfundingAddress} "${AXUSD_ADDRESS}" "${landOptionRegistryAddress}" "${ESCROW_WALLET}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
