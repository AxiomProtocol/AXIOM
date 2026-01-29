const { ethers } = require("hardhat");
const AXM = "0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D";
const abi = [
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function MINTER_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)"
];

// Known addresses to check - fixed checksums
const addresses = [
  { name: "Current Deployer", addr: "0x8d7892CF226B43d48B6e3ce988A1274e6D114C96" },
    { name: "Treasury Multisig", addr: ethers.getAddress("0x2bb2c2a7a1d82097488bf0b9c2a59c1910cd8d5d") },
  { name: "Token Contract", addr: AXM }
];

async function main() {
  const token = new ethers.Contract(AXM, abi, ethers.provider);
  const adminRole = await token.DEFAULT_ADMIN_ROLE();
  const minterRole = await token.MINTER_ROLE();
  
  console.log("Checking roles on AXM token contract...\n");
  console.log("DEFAULT_ADMIN_ROLE:", adminRole);
  console.log("MINTER_ROLE:", minterRole);
  console.log("");
  
  for (const {name, addr} of addresses) {
    const hasAdmin = await token.hasRole(adminRole, addr);
    const hasMinter = await token.hasRole(minterRole, addr);
    console.log(`${name} (${addr})`);
    console.log(`  Admin: ${hasAdmin} | Minter: ${hasMinter}`);
  }
}

main().catch(console.error);
