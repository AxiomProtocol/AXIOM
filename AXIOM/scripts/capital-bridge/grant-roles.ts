import { ethers } from "ethers";

const CAPITAL_BRIDGE_HUB = "0x6a00455dC277C9430e5c45324B34F2425ba0408d";
const READINESS_GATE = "0xc3f798066e1401aa30Da8703A4c0588A1076ff39";

const ADMIN_ADDRESS = "0xA6Ed10E752d5FACD989ee9CEd113b3a064b47493";
const DEPLOYER_ADDRESS = "0x8d7892CF226B43d48B6e3ce988A1274e6D114C96";

const ABI = [
  "function grantRole(bytes32 role, address account) external",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function RISK_COMMITTEE_ROLE() external view returns (bytes32)",
  "function SETTLEMENT_AUTHORITY_ROLE() external view returns (bytes32)",
  "function RESEARCH_ATTESTOR_A_ROLE() external view returns (bytes32)",
  "function RESEARCH_ATTESTOR_B_ROLE() external view returns (bytes32)",
  "function REPORTING_ORACLE_ROLE() external view returns (bytes32)",
];

async function main() {
  const adminPk = process.env.ADMIN_PRIVATE_KEY;
  if (!adminPk) throw new Error("ADMIN_PRIVATE_KEY not set");
  
  const rpcUrl = process.env.ARBITRUM_RPC_URL || `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const admin = new ethers.Wallet(adminPk, provider);
  
  console.log("Granting roles using admin wallet:", admin.address);
  
  const hub = new ethers.Contract(CAPITAL_BRIDGE_HUB, ABI, admin);
  const gate = new ethers.Contract(READINESS_GATE, ABI, admin);
  
  // Get role hashes
  const RISK_COMMITTEE_ROLE = await hub.RISK_COMMITTEE_ROLE();
  const SETTLEMENT_AUTHORITY_ROLE = await hub.SETTLEMENT_AUTHORITY_ROLE();
  const RESEARCH_ATTESTOR_A_ROLE = await hub.RESEARCH_ATTESTOR_A_ROLE();
  const RESEARCH_ATTESTOR_B_ROLE = await hub.RESEARCH_ATTESTOR_B_ROLE();
  const REPORTING_ORACLE_ROLE = await gate.REPORTING_ORACLE_ROLE();
  
  console.log("\n--- CapitalBridgeHub Roles ---");
  
  // Grant RISK_COMMITTEE_ROLE to DEPLOYER
  if (!(await hub.hasRole(RISK_COMMITTEE_ROLE, DEPLOYER_ADDRESS))) {
    console.log("Granting RISK_COMMITTEE_ROLE to DEPLOYER...");
    const tx = await hub.grantRole(RISK_COMMITTEE_ROLE, DEPLOYER_ADDRESS);
    await tx.wait();
    console.log("  Done:", tx.hash);
  } else {
    console.log("RISK_COMMITTEE_ROLE already granted to DEPLOYER");
  }
  
  // Grant SETTLEMENT_AUTHORITY_ROLE to DEPLOYER
  if (!(await hub.hasRole(SETTLEMENT_AUTHORITY_ROLE, DEPLOYER_ADDRESS))) {
    console.log("Granting SETTLEMENT_AUTHORITY_ROLE to DEPLOYER...");
    const tx = await hub.grantRole(SETTLEMENT_AUTHORITY_ROLE, DEPLOYER_ADDRESS);
    await tx.wait();
    console.log("  Done:", tx.hash);
  } else {
    console.log("SETTLEMENT_AUTHORITY_ROLE already granted to DEPLOYER");
  }
  
  // Grant RESEARCH_ATTESTOR_A_ROLE to ADMIN
  if (!(await hub.hasRole(RESEARCH_ATTESTOR_A_ROLE, ADMIN_ADDRESS))) {
    console.log("Granting RESEARCH_ATTESTOR_A_ROLE to ADMIN...");
    const tx = await hub.grantRole(RESEARCH_ATTESTOR_A_ROLE, ADMIN_ADDRESS);
    await tx.wait();
    console.log("  Done:", tx.hash);
  } else {
    console.log("RESEARCH_ATTESTOR_A_ROLE already granted to ADMIN");
  }
  
  // Grant RESEARCH_ATTESTOR_B_ROLE to DEPLOYER
  if (!(await hub.hasRole(RESEARCH_ATTESTOR_B_ROLE, DEPLOYER_ADDRESS))) {
    console.log("Granting RESEARCH_ATTESTOR_B_ROLE to DEPLOYER...");
    const tx = await hub.grantRole(RESEARCH_ATTESTOR_B_ROLE, DEPLOYER_ADDRESS);
    await tx.wait();
    console.log("  Done:", tx.hash);
  } else {
    console.log("RESEARCH_ATTESTOR_B_ROLE already granted to DEPLOYER");
  }
  
  console.log("\n--- CapitalReadinessGate Roles ---");
  
  // Grant REPORTING_ORACLE_ROLE to DEPLOYER on ReadinessGate
  if (!(await gate.hasRole(REPORTING_ORACLE_ROLE, DEPLOYER_ADDRESS))) {
    console.log("Granting REPORTING_ORACLE_ROLE to DEPLOYER...");
    const tx = await gate.grantRole(REPORTING_ORACLE_ROLE, DEPLOYER_ADDRESS);
    await tx.wait();
    console.log("  Done:", tx.hash);
  } else {
    console.log("REPORTING_ORACLE_ROLE already granted to DEPLOYER");
  }
  
  console.log("\n=== Role Assignment Complete ===");
  console.log("\nSummary:");
  console.log("  RISK_COMMITTEE_ROLE      -> DEPLOYER");
  console.log("  SETTLEMENT_AUTHORITY_ROLE -> DEPLOYER");
  console.log("  RESEARCH_ATTESTOR_A_ROLE -> ADMIN");
  console.log("  RESEARCH_ATTESTOR_B_ROLE -> DEPLOYER");
  console.log("  REPORTING_ORACLE_ROLE    -> DEPLOYER");
}

main().catch(console.error);
