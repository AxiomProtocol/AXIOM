const hre = require("hardhat");

async function main() {
  console.log("Configuring Fix-and-Flip Contracts...\n");

  const RISK_CONFIG = "0x07A7b9644d32E0f1f113976B0FB3F5F5fbb1E937";
  
  const [signer] = await hre.ethers.getSigners();
  console.log("Signer:", signer.address);

  const riskConfigAbi = [
    "function setProductRisk(uint256 productId, tuple(uint256 productId, uint256 maxLtvBps, uint256 maxTermDays, uint256 maxLoanSize, uint256 minLoanSize, uint256 originationFeeBps, uint256 interestRateBps, uint256 lateFeePerDayBps, uint256 insuranceReserveBps, uint256 protocolFeeBps, bool active) config) external"
  ];
  
  const riskConfig = new hre.ethers.Contract(RISK_CONFIG, riskConfigAbi, signer);

  console.log("Setting Product 1 risk parameters...");
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
  await tx.wait();
  console.log("Product 1 configured!");
  console.log("TX:", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
