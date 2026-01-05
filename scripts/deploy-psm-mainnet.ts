import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying PSM to Arbitrum Mainnet...");
  console.log("Deployer:", deployer.address);

  const AXUSD_ADDRESS = "0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c";
  const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  const VAULT_ENGINE = "0x72aaBb0d84077859276513106Ea225E4edE80db0";

  console.log("\n[1/3] Deploying PSM...");
  const mintFee = 10;
  const redeemFee = 10;
  const usdcDecimals = 6;
  const psmDebtCeiling = ethers.parseEther("500000");
  
  const PSM = await ethers.getContractFactory("PSM");
  const psm = await PSM.deploy(
    AXUSD_ADDRESS,
    USDC_ARBITRUM,
    usdcDecimals,
    mintFee,
    redeemFee,
    psmDebtCeiling
  );
  await psm.waitForDeployment();
  const psmAddress = await psm.getAddress();
  console.log("   ✓ PSM:", psmAddress);

  console.log("\n[2/3] Granting PSM minter role...");
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));
  
  const axusd = await ethers.getContractAt("AxiomStable", AXUSD_ADDRESS);
  await axusd.grantRole(MINTER_ROLE, psmAddress);
  console.log("   ✓ PSM granted MINTER_ROLE");
  
  console.log("\n[3/3] Granting PSM burner role...");
  await axusd.grantRole(BURNER_ROLE, psmAddress);
  console.log("   ✓ PSM granted BURNER_ROLE");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  PSM DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════════════════");
  console.log("\nPSM Address:", psmAddress);
  console.log("USDC Address:", USDC_ARBITRUM);
  console.log("Mint Fee: 0.1%");
  console.log("Redeem Fee: 0.1%");
  console.log("Debt Ceiling: 500,000 AXUSD");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
