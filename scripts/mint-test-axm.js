/**
 * Mint AXM Tokens for Testing
 * 
 * Run with: npx hardhat run scripts/mint-test-axm.js --network arbitrum
 * 
 * Requirements:
 * - DEPLOYER_PK environment variable set
 * - Some ETH for gas on Arbitrum
 */

const { ethers } = require("hardhat");

const AXM_TOKEN_ADDRESS = "0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D";

const AXM_ABI = [
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address account) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function MINTER_ROLE() view returns (bytes32)"
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Minting from address:", signer.address);
  
  const axmToken = new ethers.Contract(AXM_TOKEN_ADDRESS, AXM_ABI, signer);
  
  // Check if signer has MINTER_ROLE
  const MINTER_ROLE = await axmToken.MINTER_ROLE();
  const hasMinterRole = await axmToken.hasRole(MINTER_ROLE, signer.address);
  console.log("Has MINTER_ROLE:", hasMinterRole);
  
  if (!hasMinterRole) {
    console.error("ERROR: Your address does not have the MINTER_ROLE");
    console.log("Make sure you're using the deployer wallet");
    return;
  }
  
  // Amount to mint: 10,000 AXM for testing
  const decimals = await axmToken.decimals();
  const amountToMint = ethers.parseUnits("10000", decimals);
  
  console.log(`\nMinting 10,000 AXM to ${signer.address}...`);
  
  const tx = await axmToken.mint(signer.address, amountToMint);
  console.log("Transaction hash:", tx.hash);
  
  await tx.wait();
  console.log("Transaction confirmed!");
  
  // Check new balance
  const balance = await axmToken.balanceOf(signer.address);
  console.log(`\nNew AXM Balance: ${ethers.formatUnits(balance, decimals)} AXM`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
