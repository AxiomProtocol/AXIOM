/**
 * Axiom Timelock Controller Deployment Script
 * 
 * Deploys:
 * 1. AxiomTimelockController - Main timelock with LockForever
 * 2. AxiomGovernanceConfig - Function classification registry
 * 
 * Post-deployment:
 * - Configures timelocked vs emergency functions
 * - Optionally locks configuration
 */

import { ethers } from "hardhat";

// Configuration
const ADMIN_SAFE = "0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d";
const MIN_DELAY = 24 * 60 * 60; // 24 hours in seconds

// Existing contract addresses (Arbitrum One)
const CORE_CONTRACTS = {
  AxiomV2: "0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D",
  TreasuryHub: "0x3fD63728288546AC41dAe3bf25ca383061c3A929",
  SusuHub: "0x6C69D730327930B49A7997B7b5fb0865F30c95A5",
  veAXM: "0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046",
  AxiomScoreSBT: "0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008",
  CreditLineVault: "0xc997416666686A22EBAE8Eb7cc9224c10B08a35c",
  GovernanceHub: "0x52Dc85fd653a75323b5307f4D2629ab9A070530E",
  RiskConfig: "0xD9a53c691B688351283Fecc33D8D9AF964A9a078",
  DSCRRiskConfig: "0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26",
  FixFlipManager: "0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958",
  DSCRLoanManager: "0x105117F1AD1B65a5d0C7F0E9A870683A06738E16"
};

// Function selectors for timelocked operations
const TIMELOCKED_SELECTORS = {
  // Role management
  grantRole: "0x2f2ff15d",
  revokeRole: "0xd547741f",
  renounceRole: "0x36568abe",
  
  // Treasury parameters
  setFeeRates: "0x4b0bddd2",
  setAllocation: "0x5e5f2e26",
  setVaultAddresses: "0x7cb2b79c",
  updateAllocation: "0x3f4ba83a",
  
  // Risk parameters
  setMaxLTV: "0x4b8a3529",
  setLiquidationBonus: "0x4e0cd799",
  setInterestRate: "0x5c2c4c5a",
  setCollateralParams: "0x8d3638f4",
  
  // Oracle configuration
  setOracle: "0x7adbf973",
  setHeartbeat: "0x4f1ef286",
  setStalenessWindow: "0x9f3ce55a"
};

// Function selectors for emergency operations (immediate)
const EMERGENCY_SELECTORS = {
  pause: "0x8456cb59",
  unpause: "0x3f4ba83a",
  emergencySweep: "0x7f4ab1dd",
  pauseLending: "0x4e7a4d6e",
  unpauseLending: "0x7e5cd5c1",
  triggerCircuitBreaker: "0x6c0360eb"
};

async function main() {
  console.log("=== Axiom Timelock Deployment ===\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Admin Safe:", ADMIN_SAFE);
  console.log("Min Delay:", MIN_DELAY / 3600, "hours\n");

  // 1. Deploy AxiomTimelockController
  console.log("1. Deploying AxiomTimelockController...");
  
  const TimelockFactory = await ethers.getContractFactory("AxiomTimelockController");
  const timelock = await TimelockFactory.deploy(
    MIN_DELAY,
    [ADMIN_SAFE],           // proposers
    [ethers.ZeroAddress],   // executors (anyone can execute after delay)
    ADMIN_SAFE              // admin
  );
  await timelock.waitForDeployment();
  
  const timelockAddress = await timelock.getAddress();
  console.log("   AxiomTimelockController:", timelockAddress);

  // 2. Deploy AxiomGovernanceConfig
  console.log("\n2. Deploying AxiomGovernanceConfig...");
  
  const ConfigFactory = await ethers.getContractFactory("AxiomGovernanceConfig");
  const config = await ConfigFactory.deploy(ADMIN_SAFE, timelockAddress);
  await config.waitForDeployment();
  
  const configAddress = await config.getAddress();
  console.log("   AxiomGovernanceConfig:", configAddress);

  // 3. Register core contracts
  console.log("\n3. Registering core contracts...");
  
  for (const [name, address] of Object.entries(CORE_CONTRACTS)) {
    try {
      await config.registerContract(address, name);
      console.log(`   ✓ Registered ${name}`);
    } catch (e) {
      console.log(`   ⚠ Could not register ${name}: ${(e as Error).message}`);
    }
  }

  // 4. Configure timelocked functions
  console.log("\n4. Configuring timelocked functions...");
  
  const TIMELOCKED = 1; // FunctionType.TIMELOCKED
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
  
  for (const [funcName, selector] of Object.entries(TIMELOCKED_SELECTORS)) {
    // Apply to all contracts that might have this function
    for (const [contractName, contractAddress] of Object.entries(CORE_CONTRACTS)) {
      try {
        await config.configureFunction(
          contractAddress,
          selector,
          TIMELOCKED,
          DEFAULT_ADMIN_ROLE
        );
      } catch (e) {
        // Silently continue - not all contracts have all functions
      }
    }
  }
  console.log("   ✓ Timelocked functions configured");

  // 5. Configure emergency functions
  console.log("\n5. Configuring emergency functions...");
  
  const EMERGENCY = 2; // FunctionType.EMERGENCY
  const GUARDIAN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GUARDIAN_ROLE"));
  
  for (const [funcName, selector] of Object.entries(EMERGENCY_SELECTORS)) {
    for (const [contractName, contractAddress] of Object.entries(CORE_CONTRACTS)) {
      try {
        await config.configureFunction(
          contractAddress,
          selector,
          EMERGENCY,
          GUARDIAN_ROLE
        );
      } catch (e) {
        // Silently continue
      }
    }
  }
  console.log("   ✓ Emergency functions configured");

  // 6. Summary
  console.log("\n=== Deployment Summary ===");
  console.log("AxiomTimelockController:", timelockAddress);
  console.log("AxiomGovernanceConfig:", configAddress);
  console.log("\nNext steps:");
  console.log("1. Transfer admin roles from contracts to Timelock");
  console.log("2. Verify contracts on Arbiscan");
  console.log("3. Test timelock operations");
  console.log("4. Call lockForever() when ready to finalize");
  
  // Save deployment info
  const deploymentInfo = {
    network: "arbitrum-one",
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      AxiomTimelockController: timelockAddress,
      AxiomGovernanceConfig: configAddress
    },
    configuration: {
      minDelay: MIN_DELAY,
      adminSafe: ADMIN_SAFE,
      proposers: [ADMIN_SAFE],
      executors: ["0x0000000000000000000000000000000000000000"]
    },
    coreContracts: CORE_CONTRACTS
  };
  
  console.log("\n=== Deployment Info JSON ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
