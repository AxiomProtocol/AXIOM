import { ethers } from "ethers";

const CAPITAL_BRIDGE_HUB = "0x6a00455dC277C9430e5c45324B34F2425ba0408d";
const READINESS_GATE = "0xc3f798066e1401aa30Da8703A4c0588A1076ff39";

const ABI = [
  "function setCapitalReadinessGate(address newGate) external",
  "function readinessGate() external view returns (address)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)"
];

async function main() {
  const adminPk = process.env.ADMIN_PRIVATE_KEY;
  if (!adminPk) throw new Error("ADMIN_PRIVATE_KEY not set");
  
  const rpcUrl = process.env.ARBITRUM_RPC_URL || `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const admin = new ethers.Wallet(adminPk, provider);
  
  console.log("Admin wallet:", admin.address);
  const balance = await provider.getBalance(admin.address);
  console.log("Admin balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.001")) {
    throw new Error("Admin wallet needs ETH for gas. Please fund: " + admin.address);
  }

  const hub = new ethers.Contract(CAPITAL_BRIDGE_HUB, ABI, admin);
  
  // Check if already configured
  const currentGate = await hub.readinessGate();
  console.log("\nCurrent readiness gate:", currentGate);
  
  if (currentGate === READINESS_GATE) {
    console.log("Already configured!");
    return;
  }
  
  console.log("\nSetting readiness gate to:", READINESS_GATE);
  const tx = await hub.setCapitalReadinessGate(READINESS_GATE);
  console.log("Transaction hash:", tx.hash);
  await tx.wait();
  console.log("Configuration complete!");
  
  // Verify
  const newGate = await hub.readinessGate();
  console.log("Verified readiness gate:", newGate);
}

main().catch(console.error);
