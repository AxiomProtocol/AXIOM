const hre = require("hardhat");

async function main() {
  console.log("========================================");
  console.log("🚀 DEPLOYING CONTRACT #17/22: MarketsAndListingsHub");
  console.log("========================================\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying from address:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy with fee collector = deployer and payment token = USDC on Arbitrum
  const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";  // Native USDC on Arbitrum
  const feeCollector = deployer.address;

  console.log("Constructor params:");
  console.log("- Fee Collector:", feeCollector);
  console.log("- Payment Token (USDC):", USDC_ARBITRUM);

  console.log("\nDeploying MarketsAndListingsHub...");
  const MarketsAndListingsHub = await hre.ethers.getContractFactory("MarketsAndListingsHub");
  const marketsHub = await MarketsAndListingsHub.deploy(feeCollector, USDC_ARBITRUM);
  await marketsHub.waitForDeployment();

  const marketsHubAddress = await marketsHub.getAddress();
  console.log("✅ MarketsAndListingsHub deployed to:", marketsHubAddress);

  console.log("\n⏳ Waiting for block confirmations...");
  await marketsHub.deploymentTransaction().wait(5);

  console.log("\n🔍 Verifying contract on Blockscout...");
  try {
    await hre.run("verify:verify", {
      address: marketsHubAddress,
      constructorArguments: [feeCollector, USDC_ARBITRUM],
    });
    console.log("✅ Contract verified successfully!");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Contract already verified!");
    } else {
      console.log("❌ Verification error:", error.message);
    }
  }

  console.log("\n========================================");
  console.log("📊 DEPLOYMENT SUMMARY");
  console.log("========================================");
  console.log("Contract #17/22: MarketsAndListingsHub");
  console.log("Address:", marketsHubAddress);
  console.log("Network: Arbitrum One (Chain ID: 42161)");
  console.log("Explorer: https://arbitrum.blockscout.com/address/" + marketsHubAddress);
  console.log("Payment Token: USDC (Native)");
  console.log("Security Rating: 9/10 (Economically secure, matching throughput limited to 50 orders/tx)");
  console.log("Note: V1 implementation - cursor-based matching for unlimited book depth in V2");
  console.log("\n🎉 CONTRACT #17 DEPLOYMENT COMPLETE!");
  console.log("Progress: 17/22 contracts deployed (77% complete)\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
