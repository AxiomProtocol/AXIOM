import { ethers } from "hardhat";

const LEGACY_CONTRACTS = {
  DePINNodeSuite: "0x16dC3884d88b767D99E0701Ba026a1ed39a250F1",
  LeaseAndRentEngine: "0x26a20dEa57F951571AD6e518DFb3dC60634D5297"
};

const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));
const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

const PAUSABLE_ABI = [
  "function pause() external",
  "function unpause() external",
  "function paused() external view returns (bool)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function totalLeases() external view returns (uint256)"
];

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=== Legacy Contract Management ===");
  console.log("Operator:", deployer.address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("");

  for (const [name, address] of Object.entries(LEGACY_CONTRACTS)) {
    console.log(`\n=== ${name} (${address}) ===`);
    
    const contract = new ethers.Contract(address, PAUSABLE_ABI, deployer);
    
    try {
      const isPaused = await contract.paused();
      console.log("Current status:", isPaused ? "PAUSED" : "ACTIVE");
      
      const hasPauserRole = await contract.hasRole(PAUSER_ROLE, deployer.address);
      const hasAdminRole = await contract.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
      console.log("Has PAUSER_ROLE:", hasPauserRole);
      console.log("Has DEFAULT_ADMIN_ROLE:", hasAdminRole);
      
      try {
        const totalLeases = await contract.totalLeases();
        console.log("Total leases:", totalLeases.toString());
      } catch (e) {
        console.log("Total leases: N/A (function may not exist)");
      }
      
      if (!isPaused && (hasPauserRole || hasAdminRole)) {
        console.log("\nPausing contract...");
        const tx = await contract.pause();
        console.log("Transaction hash:", tx.hash);
        await tx.wait();
        console.log("Contract PAUSED successfully!");
      } else if (isPaused) {
        console.log("Contract is already paused.");
      } else {
        console.log("WARNING: No permission to pause this contract.");
      }
    } catch (error: any) {
      console.error("Error:", error.message);
    }
  }
  
  console.log("\n=== Summary ===");
  console.log("Legacy DePINNodeSuite:", LEGACY_CONTRACTS.DePINNodeSuite);
  console.log("Legacy LeaseAndRentEngine:", LEGACY_CONTRACTS.LeaseAndRentEngine);
  console.log("\nNew DePINNodeSuite: 0x223dF824B320beD4A8Fd0648b242621e4d01aAEF");
  console.log("New LeaseAndRentEngine: 0x00591d360416dE7b016bBedbC6AA1AE798eA873B");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
