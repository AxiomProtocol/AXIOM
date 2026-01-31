import { ethers } from "ethers";

async function main() {
  const adminPk = process.env.ADMIN_PRIVATE_KEY;
  const deployerPk = process.env.DEPLOYER_PK || process.env.PRIVATE_KEY;
  
  console.log("Checking wallet addresses...\n");
  
  if (adminPk) {
    const adminWallet = new ethers.Wallet(adminPk);
    console.log("ADMIN_PRIVATE_KEY address:", adminWallet.address);
  } else {
    console.log("ADMIN_PRIVATE_KEY: not set");
  }
  
  if (deployerPk) {
    const deployerWallet = new ethers.Wallet(deployerPk);
    console.log("DEPLOYER_PK address:", deployerWallet.address);
  } else {
    console.log("DEPLOYER_PK: not set");
  }
  
  console.log("\nContracts deployed with admin set to: 0x2bb2c2a7a1d82097488bf0b9c2a59c1910cd8d5d");
}

main().catch(console.error);
