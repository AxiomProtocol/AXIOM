import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  
  console.log("Available wallets:");
  for (let i = 0; i < signers.length; i++) {
    const address = await signers[i].getAddress();
    const balance = await ethers.provider.getBalance(address);
    console.log(`  [${i}] ${address} - ${ethers.formatEther(balance)} ETH`);
  }
  
  const adminAddress = "0x2bb2c2a7a1d82097488bf0b9c2a59c1910cd8d5d";
  console.log("\nRequired admin address:", adminAddress);
  
  const isAdmin = signers.some(async (s) => {
    const addr = await s.getAddress();
    return addr.toLowerCase() === adminAddress.toLowerCase();
  });
  
  if (isAdmin) {
    console.log("Admin wallet is available!");
  } else {
    console.log("Admin wallet NOT available. Need ADMIN_PRIVATE_KEY secret.");
  }
}

main().catch(console.error);
