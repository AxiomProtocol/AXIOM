import { ethers } from "hardhat";

const DEPLOYED_CONTRACTS = {
  CapitalReadinessGate: "0xc3f798066e1401aa30Da8703A4c0588A1076ff39",
};

const ABI = [
  "function startObservation() external",
  "function postAttestation(uint256 uptimeBps, uint256 incidentsCount, uint256 tvlUsd, bytes32 auditHash) external",
  "function setFreezeWindow(uint256 freezeWindow) external",
  "function isReady() view returns (bool)",
  "function observationStartTimestamp() view returns (uint256)",
  "function freezeWindow() view returns (uint256)",
  "function latestAttestation() view returns (uint256 uptimeBps, uint256 incidentsCount, uint256 tvlUsd, bytes32 auditHash, uint256 timestamp)",
];

async function main() {
  console.log("=".repeat(60));
  console.log("CAPITAL BRIDGE OBSERVATION WINDOW INITIALIZATION");
  console.log("=".repeat(60));

  const [admin] = await ethers.getSigners();
  console.log("\nAdmin Signer:", admin.address);

  const gate = new ethers.Contract(DEPLOYED_CONTRACTS.CapitalReadinessGate, ABI, admin);

  const observationStart = await gate.observationStartTimestamp();
  const freezeWindow = await gate.freezeWindow();
  const isReady = await gate.isReady();

  console.log("\nCurrent State:");
  console.log("  Observation Start:", observationStart > 0n ? new Date(Number(observationStart) * 1000).toISOString() : "Not started");
  console.log("  Freeze Window:", Number(freezeWindow) / 86400, "days");
  console.log("  Is Ready:", isReady);

  if (observationStart === 0n) {
    console.log("\n--- Starting Observation Window ---");
    const tx = await gate.startObservation();
    await tx.wait();
    console.log("Observation window started");
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
    if (error.message.includes("revert")) {
      console.log("[SKIP] Attestation already exists or caller lacks REPORTING_ORACLE_ROLE");
    } else {
      throw error;
    }
  }

  const updatedIsReady = await gate.isReady();
  const attestation = await gate.latestAttestation();

  console.log("\n" + "=".repeat(60));
  console.log("OBSERVATION WINDOW STATUS");
  console.log("=".repeat(60));
  console.log("\nSystem Readiness:", updatedIsReady ? "READY" : "NOT READY (observation period in progress)");
  console.log("\nLatest Attestation:");
  console.log("  Uptime:", Number(attestation[0]) / 100, "%");
  console.log("  Incidents:", Number(attestation[1]));
  console.log("  TVL USD:", Number(attestation[2]));
  console.log("  Last Updated:", attestation[4] > 0n ? new Date(Number(attestation[4]) * 1000).toISOString() : "Never");

  if (!updatedIsReady) {
    const now = Math.floor(Date.now() / 1000);
    const obsStart = Number(await gate.observationStartTimestamp());
    const freeze = Number(await gate.freezeWindow());
    const readyAt = obsStart + freeze;
    const daysRemaining = Math.max(0, (readyAt - now) / 86400);
    console.log("\nEstimated Ready Date:", new Date(readyAt * 1000).toISOString());
    console.log("Days Remaining:", daysRemaining.toFixed(1));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
