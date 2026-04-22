/**
 * Grant MINTER_ROLE and Mint AXM Tokens for Testing
 * 
 * Run with: npx hardhat run scripts/grant-minter-and-mint.js --network arbitrum
 */

const { ethers } = require("hardhat");

const AXM_TOKEN_ADDRESS = "0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D";

const AXM_ABI = [
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function grantRole(bytes32 role, address account) external",
  "function MINTER_ROLE() view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)"
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Using wallet:", signer.address);
  
  const axmToken = new ethers.Contract(AXM_TOKEN_ADDRESS, AXM_ABI, signer);
  
  const MINTER_ROLE = await axmToken.MINTER_ROLE();
  const DEFAULT_ADMIN_ROLE = await axmToken.DEFAULT_ADMIN_ROLE();
  
  // Check admin role
  const hasAdmin = await axmToken.hasRole(DEFAULT_ADMIN_ROLE, signer.address);
  console.log("Has DEFAULT_ADMIN_ROLE:", hasAdmin);
  
  if (!hasAdmin) {
    console.error("ERROR: You don't have admin role");
    return;
  }
  
  // Check if already has minter role
  let hasMinter = await axmToken.hasRole(MINTER_ROLE, signer.address);
  console.log("Has MINTER_ROLE:", hasMinter);
  
  if (!hasMinter) {
    console.log("\n--- Granting MINTER_ROLE to your wallet ---");
    const grantTx = await axmToken.grantRole(MINTER_ROLE, signer.address);
    console.log("Grant TX:", grantTx.hash);
    await grantTx.wait();
    console.log("MINTER_ROLE granted!");
    
    hasMinter = await axmToken.hasRole(MINTER_ROLE, signer.address);
    console.log("Now has MINTER_ROLE:", hasMinter);
  }
  
  // Now mint tokens
  const decimals = await axmToken.decimals();
  const amountToMint = ethers.parseUnits("100000", decimals); // 100,000 AXM
  
  console.log("\n--- Minting 100,000 AXM ---");
  const mintTx = await axmToken.mint(signer.address, amountToMint);
  console.log("Mint TX:", mintTx.hash);
  await mintTx.wait();
  console.log("Tokens minted successfully!");
  
  // Check balance
  const balance = await axmToken.balanceOf(signer.address);
  console.log(`\nNew AXM Balance: ${ethers.formatUnits(balance, decimals)} AXM`);
  console.log("\nYou can now test the DEX! Refresh MetaMask to see your balance.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
