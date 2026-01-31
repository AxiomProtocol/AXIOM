import { ethers } from "ethers";

const READINESS_GATE = "0xc3f798066e1401aa30Da8703A4c0588A1076ff39";

const ABI = [
  "function checkReadiness() external view returns (bool isReady, string memory failureReason)",
  "function assertReady() external view returns (bool ready)",
  "function latestAttestation() external view returns (uint256 uptimeBps, uint256 incidentsCount, uint256 tvlUsd, uint64 lastUpdated, uint64 observationStartTimestamp, bytes32 auditHash)",
  "function config() external view returns (bytes32 requiredAuditHash, uint256 minimumUptimeBps, uint256 minimumObservationDaysElapsed, uint256 maxIncidentsAllowed, uint256 minimumTVLUsd, uint256 freezeWindowSeconds)",
  "function maxAttestationStaleness() external view returns (uint256)",
  "function lastConfigChangeAt() external view returns (uint64)"
];

async function main() {
  const rpcUrl = process.env.ARBITRUM_RPC_URL || `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  const gate = new ethers.Contract(READINESS_GATE, ABI, provider);
  
  console.log("=== Readiness Gate Status ===\n");
  
  // Get attestation
  const attestation = await gate.latestAttestation();
  console.log("Latest Attestation:");
  console.log("  Uptime:", attestation[0].toString(), "bps");
  console.log("  Incidents:", attestation[1].toString());
  console.log("  TVL USD:", attestation[2].toString());
  console.log("  Last Updated:", new Date(Number(attestation[3]) * 1000).toISOString());
  console.log("  Observation Start:", new Date(Number(attestation[4]) * 1000).toISOString());
  
  // Get config
  const cfg = await gate.config();
  console.log("\nConfig:");
  console.log("  Min Uptime:", cfg[1].toString(), "bps");
  console.log("  Min Observation Days:", cfg[2].toString());
  console.log("  Max Incidents:", cfg[3].toString());
  console.log("  Min TVL:", cfg[4].toString());
  console.log("  Freeze Window:", cfg[5].toString(), "seconds");
  
  // Calculate observation days
  const now = Math.floor(Date.now() / 1000);
  const daysSinceStart = Math.floor((now - Number(attestation[4])) / 86400);
  console.log("\nObservation Days Elapsed:", daysSinceStart);
  
  // Get staleness
  const staleness = await gate.maxAttestationStaleness();
  const lastUpdate = Number(attestation[3]);
  const staleAt = lastUpdate + Number(staleness);
  console.log("\nAttestation Staleness:");
  console.log("  Max Staleness:", Number(staleness) / 3600, "hours");
  console.log("  Stale At:", new Date(staleAt * 1000).toISOString());
  console.log("  Current Time:", new Date(now * 1000).toISOString());
  console.log("  Is Stale:", now > staleAt);
  
  // Check readiness
  console.log("\n=== Readiness Check ===");
  try {
    const [isReady, failureReason] = await gate.checkReadiness();
    console.log("Ready:", isReady);
    if (!isReady) {
      console.log("Failure Reason:", failureReason);
    }
  } catch (e: any) {
    console.log("Error checking readiness:", e.message);
  }
}

main().catch(console.error);
