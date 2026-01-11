import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  PSM REDEPLOYMENT (Cancun EVM Target)");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\nDeployer:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  const AXUSD_ADDRESS = "0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C";
  const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

  console.log("\nDeploying new PSM with Cancun EVM (transient storage support)...");
  const usdcDecimals = 6;
  const mintFee = 10;
  const redeemFee = 10;
  const psmDebtCeiling = ethers.parseEther("5000000");
  
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
  console.log("   ✓ New PSM:", psmAddress);

  console.log("\nGranting MINTER/BURNER roles on AXUSD...");
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));
  
  const axusd = await ethers.getContractAt("AxiomStable", AXUSD_ADDRESS);
  await axusd.grantRole(MINTER_ROLE, psmAddress);
  console.log("   ✓ MINTER_ROLE granted");
  await axusd.grantRole(BURNER_ROLE, psmAddress);
  console.log("   ✓ BURNER_ROLE granted");

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  NEW PSM DEPLOYED SUCCESSFULLY");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\nNew PSM Address:", psmAddress);
  console.log("\nOld PSM (do not use):", "0x101866a92EF9DB903e4C068f63708Acd9C40f7Fc");
  console.log("\nNext: Run mint-axusd.ts with updated PSM address");

  return psmAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
