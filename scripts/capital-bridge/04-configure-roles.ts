import { ethers } from "hardhat";

const DEPLOYED_CONTRACTS = {
  CapitalBridgeHub: "0x6a00455dC277C9430e5c45324B34F2425ba0408d",
  CapitalReadinessGate: "0xc3f798066e1401aa30Da8703A4c0588A1076ff39",
  InstrumentRegistry: "0xcDE54ED7d19768be02Eb7C4799d7d8689310C7A5",
  PoolRegistry: "0x7D386357F0D461Be9DA5FBb90E1F194c5aeafcD9",
  ServicingEventLog: "0x4A152350e3df79CbE895453ee1B7d486E7338093",
  NodeRegistry: "0x31bc6268155219B627FC3B2d8434d010F33DCb03",
  NodeRewards: "0x0c1c96F38566d056877cEf4791c701C4F5AEf362",
  SlashingEngine: "0x1ae162B80cEfb82f9ccF25b5E7A45E5e133E6F87",
};

const ROLES = {
  RISK_COMMITTEE_ROLE: ethers.keccak256(ethers.toUtf8Bytes("RISK_COMMITTEE_ROLE")),
  SETTLEMENT_AUTHORITY_ROLE: ethers.keccak256(ethers.toUtf8Bytes("SETTLEMENT_AUTHORITY_ROLE")),
  RESEARCH_ATTESTOR_A_ROLE: ethers.keccak256(ethers.toUtf8Bytes("RESEARCH_ATTESTOR_A_ROLE")),
  RESEARCH_ATTESTOR_B_ROLE: ethers.keccak256(ethers.toUtf8Bytes("RESEARCH_ATTESTOR_B_ROLE")),
  REPORTING_ORACLE_ROLE: ethers.keccak256(ethers.toUtf8Bytes("REPORTING_ORACLE_ROLE")),
  ISSUER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("ISSUER_ROLE")),
  SERVICER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("SERVICER_ROLE")),
  POOL_MANAGER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("POOL_MANAGER_ROLE")),
  AUDITOR_ROLE: ethers.keccak256(ethers.toUtf8Bytes("AUDITOR_ROLE")),
  NODE_MANAGER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("NODE_MANAGER_ROLE")),
  SLASHER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("SLASHER_ROLE")),
  REWARDS_MANAGER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("REWARDS_MANAGER_ROLE")),
  ORACLE_ROLE: ethers.keccak256(ethers.toUtf8Bytes("ORACLE_ROLE")),
  ARBITER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("ARBITER_ROLE")),
};

const ABI = [
  "function grantRole(bytes32 role, address account) external",
  "function hasRole(bytes32 role, address account) view returns (bool)",
];

async function grantRoleIfNeeded(contract: any, roleName: string, roleHash: string, account: string) {
  const hasRole = await contract.hasRole(roleHash, account);
  if (hasRole) {
    console.log(`  [SKIP] ${roleName} already granted to ${account}`);
    return false;
  }
  const tx = await contract.grantRole(roleHash, account);
  await tx.wait();
  console.log(`  [DONE] ${roleName} granted to ${account}`);
  return true;
}

async function main() {
  console.log("=".repeat(60));
  console.log("CAPITAL BRIDGE ROLE CONFIGURATION");
  console.log("=".repeat(60));

  const [admin] = await ethers.getSigners();
  console.log("\nAdmin Signer:", admin.address);

  const operatorAddress = process.env.OPERATOR_ADDRESS || admin.address;
  const attestorAAddress = process.env.ATTESTOR_A_ADDRESS || admin.address;
  const attestorBAddress = process.env.ATTESTOR_B_ADDRESS || operatorAddress;
  const oracleAddress = process.env.ORACLE_ADDRESS || operatorAddress;

  console.log("\nRole Recipients:");
  console.log("  Operator:", operatorAddress);
  console.log("  Attestor A:", attestorAAddress);
  console.log("  Attestor B:", attestorBAddress);
  console.log("  Oracle:", oracleAddress);

  console.log("\n--- CapitalBridgeHub Roles ---");
  const hub = new ethers.Contract(DEPLOYED_CONTRACTS.CapitalBridgeHub, ABI, admin);
  await grantRoleIfNeeded(hub, "RISK_COMMITTEE_ROLE", ROLES.RISK_COMMITTEE_ROLE, operatorAddress);
  await grantRoleIfNeeded(hub, "SETTLEMENT_AUTHORITY_ROLE", ROLES.SETTLEMENT_AUTHORITY_ROLE, operatorAddress);
  await grantRoleIfNeeded(hub, "RESEARCH_ATTESTOR_A_ROLE", ROLES.RESEARCH_ATTESTOR_A_ROLE, attestorAAddress);
  await grantRoleIfNeeded(hub, "RESEARCH_ATTESTOR_B_ROLE", ROLES.RESEARCH_ATTESTOR_B_ROLE, attestorBAddress);

  console.log("\n--- CapitalReadinessGate Roles ---");
  const gate = new ethers.Contract(DEPLOYED_CONTRACTS.CapitalReadinessGate, ABI, admin);
  await grantRoleIfNeeded(gate, "REPORTING_ORACLE_ROLE", ROLES.REPORTING_ORACLE_ROLE, oracleAddress);

  console.log("\n--- InstrumentRegistry Roles ---");
  const instrumentRegistry = new ethers.Contract(DEPLOYED_CONTRACTS.InstrumentRegistry, ABI, admin);
  await grantRoleIfNeeded(instrumentRegistry, "ISSUER_ROLE", ROLES.ISSUER_ROLE, operatorAddress);
  await grantRoleIfNeeded(instrumentRegistry, "SERVICER_ROLE", ROLES.SERVICER_ROLE, operatorAddress);

  console.log("\n--- PoolRegistry Roles ---");
  const poolRegistry = new ethers.Contract(DEPLOYED_CONTRACTS.PoolRegistry, ABI, admin);
  await grantRoleIfNeeded(poolRegistry, "POOL_MANAGER_ROLE", ROLES.POOL_MANAGER_ROLE, operatorAddress);

  console.log("\n--- ServicingEventLog Roles ---");
  const servicingLog = new ethers.Contract(DEPLOYED_CONTRACTS.ServicingEventLog, ABI, admin);
  await grantRoleIfNeeded(servicingLog, "SERVICER_ROLE", ROLES.SERVICER_ROLE, operatorAddress);
  await grantRoleIfNeeded(servicingLog, "AUDITOR_ROLE", ROLES.AUDITOR_ROLE, operatorAddress);

  console.log("\n--- NodeRewards Roles ---");
  const nodeRewards = new ethers.Contract(DEPLOYED_CONTRACTS.NodeRewards, ABI, admin);
  await grantRoleIfNeeded(nodeRewards, "REWARDS_MANAGER_ROLE", ROLES.REWARDS_MANAGER_ROLE, operatorAddress);
  await grantRoleIfNeeded(nodeRewards, "ORACLE_ROLE", ROLES.ORACLE_ROLE, oracleAddress);

  console.log("\n--- SlashingEngine Roles ---");
  const slashingEngine = new ethers.Contract(DEPLOYED_CONTRACTS.SlashingEngine, ABI, admin);
  await grantRoleIfNeeded(slashingEngine, "SLASHER_ROLE", ROLES.SLASHER_ROLE, operatorAddress);
  await grantRoleIfNeeded(slashingEngine, "ARBITER_ROLE", ROLES.ARBITER_ROLE, operatorAddress);

  console.log("\n" + "=".repeat(60));
  console.log("ROLE CONFIGURATION COMPLETE");
  console.log("=".repeat(60));
  console.log("\nNext Steps:");
  console.log("  1. Run 05-start-observation.ts to begin observation window");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
