const { ethers } = require("hardhat");
const AXM = "0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D";

async function main() {
  console.log("Finding admin by checking RoleGranted events...\n");
  
  const abi = [
    "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
    "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
    "function MINTER_ROLE() view returns (bytes32)"
  ];
  
  const token = new ethers.Contract(AXM, abi, ethers.provider);
  const adminRole = await token.DEFAULT_ADMIN_ROLE();
  const minterRole = await token.MINTER_ROLE();
  
  console.log("DEFAULT_ADMIN_ROLE:", adminRole);
  console.log("MINTER_ROLE:", minterRole);
  
  // Get RoleGranted events from deployment
  const filter = token.filters.RoleGranted();
  const events = await token.queryFilter(filter, 0, "latest");
  
  console.log("\nRoleGranted events found:", events.length);
  
  for (const event of events) {
    const role = event.args.role;
    const account = event.args.account;
    const sender = event.args.sender;
    
    let roleName = "UNKNOWN";
    if (role === adminRole) roleName = "DEFAULT_ADMIN_ROLE";
    else if (role === minterRole) roleName = "MINTER_ROLE";
    
    console.log(`\nBlock ${event.blockNumber}:`);
    console.log(`  Role: ${roleName}`);
    console.log(`  Granted to: ${account}`);
    console.log(`  Granted by: ${sender}`);
  }
}

main().catch(console.error);
