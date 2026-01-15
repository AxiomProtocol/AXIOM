import { ethers } from "hardhat";

async function main() {
  console.log("=".repeat(60));
  console.log("DEPLOYING PHASE 3 CONTRACTS TO ARBITRUM ONE");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");

  const AXUSD_ADDRESS = "0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c";
  const AXM_ADDRESS = "0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D";
  const TREASURY_ADDRESS = "0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d";
  const SCORE_SBT_ADDRESS = "0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008";

  console.log("Configuration:");
  console.log("  AXUSD:", AXUSD_ADDRESS);
  console.log("  AXM:", AXM_ADDRESS);
  console.log("  Treasury:", TREASURY_ADDRESS);
  console.log("  AxiomScoreSBT:", SCORE_SBT_ADDRESS);
  console.log("");

  console.log("Deploying CreditLineVault...");
  const CreditLineVault = await ethers.getContractFactory("CreditLineVault");
  const creditLineVault = await CreditLineVault.deploy(
    AXUSD_ADDRESS,
    TREASURY_ADDRESS,
    SCORE_SBT_ADDRESS
  );
  await creditLineVault.waitForDeployment();
  const creditLineAddress = await creditLineVault.getAddress();
  console.log("  CreditLineVault deployed:", creditLineAddress);

  console.log("Deploying InsurancePoolHub...");
  const InsurancePoolHub = await ethers.getContractFactory("InsurancePoolHub");
  const insurancePoolHub = await InsurancePoolHub.deploy(
    AXUSD_ADDRESS,
    TREASURY_ADDRESS
  );
  await insurancePoolHub.waitForDeployment();
  const insuranceAddress = await insurancePoolHub.getAddress();
  console.log("  InsurancePoolHub deployed:", insuranceAddress);

  console.log("Deploying TreasuryNoteToken...");
  const TreasuryNoteToken = await ethers.getContractFactory("TreasuryNoteToken");
  const treasuryNoteToken = await TreasuryNoteToken.deploy(
    AXUSD_ADDRESS,
    TREASURY_ADDRESS,
    "https://axiom.city/api/treasury-notes/metadata/{id}"
  );
  await treasuryNoteToken.waitForDeployment();
  const treasuryNoteAddress = await treasuryNoteToken.getAddress();
  console.log("  TreasuryNoteToken deployed:", treasuryNoteAddress);

  console.log("\n" + "=".repeat(60));
  console.log("CONFIGURING CONTRACTS");
  console.log("=".repeat(60));

  console.log("\nSetting up CreditLineVault collateral types...");
  
  const axmCollateralId = ethers.keccak256(ethers.toUtf8Bytes("axm-credit"));
  await creditLineVault.addCollateralType(
    axmCollateralId,
    AXM_ADDRESS,
    "AXM",
    5000,  // 50% LTV
    6500,  // 65% liquidation threshold
    850,   // 8.5% APR
    ethers.parseEther("1000"),  // min 1000 AXM
    100000000  // $1.00 initial price
  );
  console.log("  Added AXM collateral type");

  console.log("\nCreating InsurancePoolHub pools...");
  
  const smartContractPoolId = ethers.keccak256(ethers.toUtf8Bytes("smart-contract"));
  await insurancePoolHub.createPool(
    smartContractPoolId,
    "Smart Contract Coverage",
    "Technical Risk",
    "Protection against smart contract exploits, bugs, and vulnerabilities",
    ethers.parseEther("5000000"),  // 5M total coverage
    250,   // 2.5% annual premium
    ethers.parseEther("1000"),     // min 1K coverage
    ethers.parseEther("500000")    // max 500K coverage
  );
  console.log("  Created Smart Contract Coverage pool");

  const depegPoolId = ethers.keccak256(ethers.toUtf8Bytes("stablecoin-depeg"));
  await insurancePoolHub.createPool(
    depegPoolId,
    "AXUSD Depeg Protection",
    "Peg Risk",
    "Coverage for losses if AXUSD deviates more than 5% from $1 peg",
    ethers.parseEther("10000000"),  // 10M total coverage
    180,   // 1.8% annual premium
    ethers.parseEther("500"),       // min 500 coverage
    ethers.parseEther("1000000")    // max 1M coverage
  );
  console.log("  Created AXUSD Depeg Protection pool");

  const liquidationPoolId = ethers.keccak256(ethers.toUtf8Bytes("liquidation-protection"));
  await insurancePoolHub.createPool(
    liquidationPoolId,
    "Liquidation Protection",
    "Position Risk",
    "Partial coverage for unexpected liquidations due to extreme market volatility",
    ethers.parseEther("2000000"),   // 2M total coverage
    400,   // 4% annual premium
    ethers.parseEther("500"),       // min 500 coverage
    ethers.parseEther("100000")     // max 100K coverage
  );
  console.log("  Created Liquidation Protection pool");

  const oraclePoolId = ethers.keccak256(ethers.toUtf8Bytes("oracle-failure"));
  await insurancePoolHub.createPool(
    oraclePoolId,
    "Oracle Failure Coverage",
    "Infrastructure Risk",
    "Protection against losses from oracle manipulation or failure",
    ethers.parseEther("3000000"),   // 3M total coverage
    300,   // 3% annual premium
    ethers.parseEther("1000"),      // min 1K coverage
    ethers.parseEther("250000")     // max 250K coverage
  );
  console.log("  Created Oracle Failure Coverage pool");

  console.log("\nCreating TreasuryNoteToken series...");
  
  await treasuryNoteToken.createSeries(
    "Axiom 6-Month Note Series A",
    "AXN-6M-A",
    6,      // 6 months maturity
    600,    // 6% annual coupon
    ethers.parseEther("1000"),      // min 1K investment
    ethers.parseEther("100000"),    // max 100K investment
    ethers.parseEther("2500000")    // 2.5M max issuance
  );
  console.log("  Created 6-Month Note Series");

  await treasuryNoteToken.createSeries(
    "Axiom 12-Month Note Series A",
    "AXN-12M-A",
    12,     // 12 months maturity
    800,    // 8% annual coupon
    ethers.parseEther("2500"),      // min 2.5K investment
    ethers.parseEther("250000"),    // max 250K investment
    ethers.parseEther("5000000")    // 5M max issuance
  );
  console.log("  Created 12-Month Note Series");

  await treasuryNoteToken.createSeries(
    "Axiom 24-Month Note Series A",
    "AXN-24M-A",
    24,     // 24 months maturity
    1000,   // 10% annual coupon
    ethers.parseEther("5000"),      // min 5K investment
    ethers.parseEther("500000"),    // max 500K investment
    ethers.parseEther("8000000")    // 8M max issuance
  );
  console.log("  Created 24-Month Note Series");

  await treasuryNoteToken.createSeries(
    "Axiom 36-Month Institutional Note",
    "AXN-36M-INST",
    36,     // 36 months maturity
    1200,   // 12% annual coupon
    ethers.parseEther("50000"),     // min 50K investment
    ethers.parseEther("2000000"),   // max 2M investment
    ethers.parseEther("15000000")   // 15M max issuance
  );
  console.log("  Created 36-Month Institutional Note Series");

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("\nDeployed Contracts:");
  console.log("  CreditLineVault:", creditLineAddress);
  console.log("  InsurancePoolHub:", insuranceAddress);
  console.log("  TreasuryNoteToken:", treasuryNoteAddress);

  console.log("\nVerification Commands:");
  console.log(`npx hardhat verify --network arbitrum ${creditLineAddress} "${AXUSD_ADDRESS}" "${TREASURY_ADDRESS}" "${SCORE_SBT_ADDRESS}"`);
  console.log(`npx hardhat verify --network arbitrum ${insuranceAddress} "${AXUSD_ADDRESS}" "${TREASURY_ADDRESS}"`);
  console.log(`npx hardhat verify --network arbitrum ${treasuryNoteAddress} "${AXUSD_ADDRESS}" "${TREASURY_ADDRESS}" "https://axiom.city/api/treasury-notes/metadata/{id}"`);

  const deploymentInfo = {
    network: "Arbitrum One",
    chainId: 42161,
    deployedAt: new Date().toISOString(),
    contracts: {
      CreditLineVault: {
        address: creditLineAddress,
        axusd: AXUSD_ADDRESS,
        treasury: TREASURY_ADDRESS,
        scoreSBT: SCORE_SBT_ADDRESS
      },
      InsurancePoolHub: {
        address: insuranceAddress,
        axusd: AXUSD_ADDRESS,
        treasury: TREASURY_ADDRESS
      },
      TreasuryNoteToken: {
        address: treasuryNoteAddress,
        axusd: AXUSD_ADDRESS,
        treasury: TREASURY_ADDRESS
      }
    },
    collateralTypes: {
      "axm-credit": axmCollateralId
    },
    insurancePools: {
      "smart-contract": smartContractPoolId,
      "stablecoin-depeg": depegPoolId,
      "liquidation-protection": liquidationPoolId,
      "oracle-failure": oraclePoolId
    }
  };

  console.log("\nDeployment Info JSON:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
