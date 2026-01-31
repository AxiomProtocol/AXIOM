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
  DEFAULT_ADMIN_ROLE: ethers.ZeroHash,
  GUARDIAN_ROLE: ethers.keccak256(ethers.toUtf8Bytes("GUARDIAN_ROLE")),
  RISK_COMMITTEE_ROLE: ethers.keccak256(ethers.toUtf8Bytes("RISK_COMMITTEE_ROLE")),
  SETTLEMENT_AUTHORITY_ROLE: ethers.keccak256(ethers.toUtf8Bytes("SETTLEMENT_AUTHORITY_ROLE")),
  RESEARCH_ATTESTOR_A_ROLE: ethers.keccak256(ethers.toUtf8Bytes("RESEARCH_ATTESTOR_A_ROLE")),
  RESEARCH_ATTESTOR_B_ROLE: ethers.keccak256(ethers.toUtf8Bytes("RESEARCH_ATTESTOR_B_ROLE")),
  REPORTING_ORACLE_ROLE: ethers.keccak256(ethers.toUtf8Bytes("REPORTING_ORACLE_ROLE")),
  SLASHER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("SLASHER_ROLE")),
};

const ADMIN_ADDRESS = "0xA6Ed10E752d5FACD989ee9CEd113b3a064b47493";
const OPERATOR_ADDRESS = "0x8d7892CF226B43d48B6e3ce988A1274e6D114C96";

async function main() {
  console.log("=".repeat(60));
  console.log("CAPITAL BRIDGE DEPLOYMENT VERIFICATION");
  console.log("=".repeat(60));

  const provider = ethers.provider;
  let passed = 0;
  let failed = 0;

  async function check(name: string, condition: boolean) {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.log(`  [FAIL] ${name}`);
      failed++;
    }
  }

  console.log("\n--- Contract Deployment ---");
  for (const [name, address] of Object.entries(DEPLOYED_CONTRACTS)) {
    const code = await provider.getCode(address);
    await check(`${name} deployed at ${address}`, code !== "0x");
  }

  console.log("\n--- CapitalBridgeHub Configuration ---");
  const hubAbi = [
    "function readinessGate() view returns (address)",
    "function hasRole(bytes32 role, address account) view returns (bool)",
  ];
  const hub = new ethers.Contract(DEPLOYED_CONTRACTS.CapitalBridgeHub, hubAbi, provider);
  
  const readinessGate = await hub.readinessGate();
  await check("ReadinessGate configured", readinessGate === DEPLOYED_CONTRACTS.CapitalReadinessGate);
  await check("Admin has DEFAULT_ADMIN_ROLE", await hub.hasRole(ROLES.DEFAULT_ADMIN_ROLE, ADMIN_ADDRESS));
  await check("Operator has RISK_COMMITTEE_ROLE", await hub.hasRole(ROLES.RISK_COMMITTEE_ROLE, OPERATOR_ADDRESS));
  await check("Operator has SETTLEMENT_AUTHORITY_ROLE", await hub.hasRole(ROLES.SETTLEMENT_AUTHORITY_ROLE, OPERATOR_ADDRESS));

  console.log("\n--- CapitalReadinessGate Status ---");
  const gateAbi = [
    "function isReady() view returns (bool)",
    "function observationStartTimestamp() view returns (uint256)",
    "function hasRole(bytes32 role, address account) view returns (bool)",
  ];
  const gate = new ethers.Contract(DEPLOYED_CONTRACTS.CapitalReadinessGate, gateAbi, provider);
  
  const isReady = await gate.isReady();
  const obsStart = await gate.observationStartTimestamp();
  console.log(`  Observation Start: ${obsStart > 0n ? new Date(Number(obsStart) * 1000).toISOString() : "Not started"}`);
  console.log(`  Is Ready: ${isReady}`);
  await check("Operator has REPORTING_ORACLE_ROLE", await gate.hasRole(ROLES.REPORTING_ORACLE_ROLE, OPERATOR_ADDRESS));

  console.log("\n--- NodeRegistry Configuration ---");
  const registryAbi = [
    "function rewardsContract() view returns (address)",
    "function slashingContract() view returns (address)",
    "function areContractsConfigured() view returns (bool)",
    "function hasRole(bytes32 role, address account) view returns (bool)",
  ];
  const registry = new ethers.Contract(DEPLOYED_CONTRACTS.NodeRegistry, registryAbi, provider);
  
  const rewardsContract = await registry.rewardsContract();
  const slashingContract = await registry.slashingContract();
  const configured = await registry.areContractsConfigured();
  
  await check("NodeRewards configured", rewardsContract === DEPLOYED_CONTRACTS.NodeRewards);
  await check("SlashingEngine configured", slashingContract === DEPLOYED_CONTRACTS.SlashingEngine);
  await check("Contracts marked configured", configured);
  await check("SlashingEngine has SLASHER_ROLE", await registry.hasRole(ROLES.SLASHER_ROLE, DEPLOYED_CONTRACTS.SlashingEngine));

  console.log("\n" + "=".repeat(60));
  console.log("VERIFICATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`\n  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`\n  Status: ${failed === 0 ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED"}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
