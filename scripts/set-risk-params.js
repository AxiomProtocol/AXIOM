const hre = require("hardhat");

async function main() {
  console.log("Setting risk parameters for Product 1...");
  
  const riskConfig = await hre.ethers.getContractAt(
    "RiskConfig", 
    "0xE7E6aC1d9df331f1804D29762e5A11019A4fFa53"
  );

  const tx = await riskConfig.setProductRisk(1, {
    productId: 1,
    maxLtvBps: 7000,
    maxTermDays: 365,
    maxLoanSize: hre.ethers.parseUnits("500000", 18),
    minLoanSize: hre.ethers.parseUnits("50000", 18),
    originationFeeBps: 300,
    interestRateBps: 1400,
    lateFeePerDayBps: 50,
    insuranceReserveBps: 200,
    protocolFeeBps: 150,
    active: true
  });
  
  console.log("Transaction hash:", tx.hash);
  await tx.wait();
  console.log("Risk parameters set successfully!");

  const risk = await riskConfig.getProductRisk(1);
  console.log("\nVerification:");
  console.log("  maxLtvBps:", risk.maxLtvBps.toString());
  console.log("  interestRateBps:", risk.interestRateBps.toString());
  console.log("  active:", risk.active);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
