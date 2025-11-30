import { ethers } from "hardhat";

async function main() {
  console.log("=".repeat(60));
  console.log("Deploying DePINNodeSales V2 Contract to Arbitrum One");
  console.log("(With DEX Integration + Manipulation Protection)");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  // Constructor arguments
  const treasurySafe = "0x2bb2c2a7a1d82097488bf0b9c2a59c1910cd8d5d";
  const axmToken = "0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D";
  const wethToken = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"; // Arbitrum WETH
  const dexHub = "0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D"; // AxiomExchangeHub

  console.log("\nConstructor Arguments:");
  console.log("- Treasury Safe:", treasurySafe);
  console.log("- AXM Token:", axmToken);
  console.log("- WETH Token:", wethToken);
  console.log("- DEX Hub:", dexHub);

  console.log("\nDeploying DePINNodeSales V2...");
  const DePINNodeSales = await ethers.getContractFactory("DePINNodeSales");
  const depinSales = await DePINNodeSales.deploy(treasurySafe, axmToken, wethToken, dexHub);

  await depinSales.waitForDeployment();
  const contractAddress = await depinSales.getAddress();

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(60));
  console.log("DePINNodeSales V2 deployed to:", contractAddress);
  console.log("\nFeatures:");
  console.log("- ETH payments (full price)");
  console.log("- AXM payments (15% discount)");
  console.log("- DEX pricing DISABLED by default (uses fallback rate)");
  console.log("- Manipulation protection: price bounds, liquidity checks");
  console.log("\nNext Steps:");
  console.log("1. Verify contract on Arbiscan");
  console.log(`   npx hardhat verify --network arbitrum ${contractAddress} "${treasurySafe}" "${axmToken}" "${wethToken}" "${dexHub}"`);
  console.log("\n2. Update environment variable:");
  console.log(`   NEXT_PUBLIC_DEPIN_SALES_CONTRACT=${contractAddress}`);
  console.log("\n3. Update shared/contracts.ts with the new address");
  console.log("=".repeat(60));

  return { contractAddress, treasurySafe, axmToken, wethToken, dexHub };
}

main()
  .then((result) => {
    console.log("\nDeployment complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nDeployment failed:", error);
    process.exit(1);
  });
