const { ethers } = require("hardhat");

async function main() {
  const targetAdmin = "0x93696b537d814Aed5875C4490143195983AED365";
  console.log("Target admin address:", targetAdmin);
  console.log("\nChecking available private keys...\n");
  
  const keys = [
    { name: "DEPLOYER_PK", value: process.env.DEPLOYER_PK },
    { name: "PRIVATE_KEY", value: process.env.PRIVATE_KEY },
    { name: "Private_Key", value: process.env.Private_Key },
    { name: "PEAQ_PRIVATE_KEY", value: process.env.PEAQ_PRIVATE_KEY }
  ];
  
  for (const key of keys) {
    if (!key.value) {
      console.log(`${key.name}: Not set`);
      continue;
    }
    try {
      const wallet = new ethers.Wallet(key.value);
      const isAdmin = wallet.address.toLowerCase() === targetAdmin.toLowerCase();
      console.log(`${key.name}: ${wallet.address} ${isAdmin ? '✅ MATCH!' : ''}`);
    } catch (e) {
      console.log(`${key.name}: Invalid key format`);
    }
  }
}

main().catch(console.error);
