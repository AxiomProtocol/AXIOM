/**
 * Wire: set AXIOMFixedLoan NFT address on AXIOMCreditMarket
 * Run after deploy-credit-market.ts if the wiring step failed.
 */
import { ethers } from "hardhat";

const FIXED_LOAN_ADDRESS   = "0xd73B04eEbBb09c01cB40544AcD7C2fE80dbb1913";
const CREDIT_MARKET_ADDRESS = "0x322CB0cB2B1E35B6C59f6571D8250D681b1E27E1";

const CREDIT_MARKET_ABI = [
  "function setFixedLoanNFT(address nft) external",
  "function fixedLoanNFT() view returns (address)",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Signer:", deployer.address);

  const creditMarket = new ethers.Contract(CREDIT_MARKET_ADDRESS, CREDIT_MARKET_ABI, deployer);

  // Check current state
  const current = await creditMarket.fixedLoanNFT();
  console.log("Current fixedLoanNFT:", current);
  if (current.toLowerCase() === FIXED_LOAN_ADDRESS.toLowerCase()) {
    console.log("✓ Already wired correctly — nothing to do.");
    return;
  }

  console.log("Setting fixedLoanNFT to:", FIXED_LOAN_ADDRESS);
  const tx = await creditMarket.setFixedLoanNFT(FIXED_LOAN_ADDRESS);
  await tx.wait();
  console.log("✓ setFixedLoanNFT tx:", tx.hash);

  const after = await creditMarket.fixedLoanNFT();
  console.log("✓ fixedLoanNFT confirmed:", after);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
