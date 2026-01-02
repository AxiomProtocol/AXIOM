const { ethers } = require("hardhat");
const AXM = "0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D";
const SAFE = "0x93696b537d814Aed5875C4490143195983AED365";

const abi = [
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function MINTER_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)"
];

async function main() {
  const token = new ethers.Contract(AXM, abi, ethers.provider);
  const adminRole = await token.DEFAULT_ADMIN_ROLE();
  const minterRole = await token.MINTER_ROLE();
  
  const hasAdmin = await token.hasRole(adminRole, SAFE);
  const hasMinter = await token.hasRole(minterRole, SAFE);
  
  console.log("Safe wallet:", SAFE);
  console.log("  Has ADMIN_ROLE:", hasAdmin ? "✅" : "❌");
  console.log("  Has MINTER_ROLE:", hasMinter ? "✅" : "❌");
}

main().catch(console.error);
