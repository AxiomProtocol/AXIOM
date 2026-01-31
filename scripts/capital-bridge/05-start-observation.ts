import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const DEFAULT_ADDRESS = "0xc3f798066e1401aa30Da8703A4c0588A1076ff39";

function loadReadinessGateAddress(): string {
  const outputPath = path.join(__dirname, "deployment-output.json");
  if (fs.existsSync(outputPath)) {
    const output = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
    if (output.layer5E?.CapitalReadinessGate) {
      console.log("Loading CapitalReadinessGate address from deployment-output.json");
      return output.layer5E.CapitalReadinessGate;
    }
  }
  console.log("Using default CapitalReadinessGate address");
  return DEFAULT_ADDRESS;
}

const ABI = [
  "function startObservation() external",
  "function postAttestation(uint256 uptimeBps, uint256 incidentsCount, uint256 tvlUsd, bytes32 auditHash) external",
  "function setFreezeWindow(uint256 freezeWindow) external",
  "function isReady() view returns (bool)",
  "function observationStartTimestamp() view returns (uint256)",
  "function freezeWindow() view returns (uint256)",
  "function latestAttestation() view returns (uint256 uptimeBps, uint256 incidentsCount, uint256 tvlUsd, bytes32 auditHash, uint256 timestamp)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
];

const REPORTING_ORACLE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REPORTING_ORACLE_ROLE"));

async function main() {
  console.log("=".repeat(60));
  console.log("CAPITAL BRIDGE OBSERVATION WINDOW INITIALIZATION");
  console.log("=".repeat(60));

  const gateAddress = loadReadinessGateAddress();
  console.log("\nCapitalReadinessGate:", gateAddress);

  const [admin] = await ethers.getSigners();
  console.log("Admin Signer:", admin.address);

  const gate = new ethers.Contract(gateAddress, ABI, admin);

  const hasOracleRole = await gate.hasRole(REPORTING_ORACLE_ROLE, admin.address);
  if (!hasOracleRole) {
    console.log("\n[WARNING] Signer does not have REPORTING_ORACLE_ROLE");
    console.log("Attestation posting may fail. Grant role first with:");
    console.log("  npm run capital-bridge:roles");
  }

  const observationStart = await gate.observationStartTimestamp();
  const freezeWindow = await gate.freezeWindow();
  const isReady = await gate.isReady();

  console.log("\nCurrent State:");
  console.log("  Observation Start:", observationStart > 0n ? new Date(Number(observationStart) * 1000).toISOString() : "Not started");
  console.log("  Freeze Window:", Number(freezeWindow) / 86400, "days");
  console.log("  Is Ready:", isReady);

  if (observationStart === 0n) {
    console.log("\n--- Starting Observation Window ---");
    try {
      const tx = await gate.startObservation();
      await tx.wait();
      console.log("Observation window started");
    } catch (error: any) {
      console.log("[ERROR] Could not start observation:", error.message?.slice(0, 80));
    }
  } else {
    console.log("\n[SKIP] Observation window already started");
  }

  console.log("\n--- Posting Initial Attestation ---");
  const initialAttestation = {
    uptimeBps: 10000,
    incidentsCount: 0,
    tvlUsd: 0,
    auditHash: ethers.ZeroHash,
  };

  try {
    const tx = await gate.postAttestation(
      initialAttestation.uptimeBps,
      initialAttestation.incidentsCount,
      initialAttestation.tvlUsd,
      initialAttestation.auditHash
    );
    await tx.wait();
    console.log("Initial attestation posted");
  } catch (error: any) {
    if (error.message?.includes("AccessControl")) {
      console.log("[SKIP] Caller lacks REPORTING_ORACLE_ROLE");
    } else {
      console.log("[SKIP] Attestation error:", error.message?.slice(0, 80));
    }
  }

  const updatedIsReady = await gate.isReady();
  let attestation;
  try {
    attestation = await gate.latestAttestation();
  } catch {
    attestation = [0, 0, 0, ethers.ZeroHash, 0];
  }

  console.log("\n" + "=".repeat(60));
  console.log("OBSERVATION WINDOW STATUS");
  console.log("=".repeat(60));
  console.log("\nSystem Readiness:", updatedIsReady ? "READY" : "NOT READY (observation period in progress)");
  
  if (attestation[4] > 0n) {
    console.log("\nLatest Attestation:");
    console.log("  Uptime:", Number(attestation[0]) / 100, "%");
    console.log("  Incidents:", Number(attestation[1]));
    console.log("  TVL USD:", Number(attestation[2]));
    console.log("  Last Updated:", new Date(Number(attestation[4]) * 1000).toISOString());
  }

  if (!updatedIsReady) {
    const now = Math.floor(Date.now() / 1000);
    const obsStart = Number(await gate.observationStartTimestamp());
    const freeze = Number(await gate.freezeWindow());
    if (obsStart > 0 && freeze > 0) {
      const readyAt = obsStart + freeze;
      const daysRemaining = Math.max(0, (readyAt - now) / 86400);
      console.log("\nEstimated Ready Date:", new Date(readyAt * 1000).toISOString());
      console.log("Days Remaining:", daysRemaining.toFixed(1));
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
