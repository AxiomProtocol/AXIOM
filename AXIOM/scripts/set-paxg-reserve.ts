/**
 * set-paxg-reserve.ts
 * Migrates AXGoldVault reserve asset from WETH to PAXG (Arbitrum One).
 *
 * Requires:
 *   - Vault totalUnits() == 0  (no WETH in vault — safe to migrate)
 *   - Caller has GOVERNOR_ROLE on AXGoldVault
 *
 * PAXG on Arbitrum One: 0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429
 *   bridged from Ethereum 0x45804880De22913dAFE09f4980848ECE6EcbAf78
 *   via Arbitrum Standard Bridge (origin: 0x09e9222E96E7B4AE2a407B98d48e330053351EEe)
 *
 * Usage:
 *   npx hardhat run scripts/set-paxg-reserve.ts --network arbitrum
 */

import { ethers } from "hardhat";

const GOLD_VAULT = "0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8";
const WETH_ARBONE = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const PAXG_ARBONE = "0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429";

const ABI = [
  "function setReserveAsset(address newAsset) external",
  "function reserveAsset() view returns (address)",
  "function totalUnits() view returns (uint256)",
  "function vaultFrozen() view returns (bool)",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Signer:", deployer.address);

  const vault = new ethers.Contract(GOLD_VAULT, ABI, deployer);

  // ── Pre-flight ─────────────────────────────────────────────────────────────
  const [currentAsset, units, frozen] = await Promise.all([
    vault.reserveAsset(),
    vault.totalUnits(),
    vault.vaultFrozen(),
  ]);

  console.log("\nPre-flight:");
  console.log("  reserveAsset:", currentAsset);
  console.log("  totalUnits: ", units.toString());
  console.log("  vaultFrozen:", frozen);

  if (currentAsset.toLowerCase() === PAXG_ARBONE.toLowerCase()) {
    console.log("\n  PAXG already set as reserve asset — nothing to do.");
    return;
  }
  if (units >= 1n) {
    console.error("\n❌ Vault is not empty (totalUnits >= 1). Drain vault before migrating.");
    process.exitCode = 1;
    return;
  }
  if (frozen) {
    console.warn("\n⚠  Vault is frozen — proceeding anyway (migration still valid while frozen).");
  }
  if (currentAsset.toLowerCase() !== WETH_ARBONE.toLowerCase()) {
    console.warn("\n⚠  Unexpected current reserve asset:", currentAsset, "— proceeding.");
  }

  // ── Migration ──────────────────────────────────────────────────────────────
  console.log("\n→ Calling setReserveAsset(PAXG) …");
  console.log("  New asset:", PAXG_ARBONE);
  const tx = await vault.setReserveAsset(PAXG_ARBONE);
  console.log("  tx:", tx.hash);
  const receipt = await tx.wait();
  console.log("  Confirmed in block:", receipt?.blockNumber);

  // ── Post-flight ────────────────────────────────────────────────────────────
  const [newAsset, newUnits] = await Promise.all([
    vault.reserveAsset(),
    vault.totalUnits(),
  ]);

  console.log("\nPost-flight:");
  console.log("  reserveAsset:", newAsset);
  console.log("  totalUnits: ", newUnits.toString());

  if (newAsset.toLowerCase() === PAXG_ARBONE.toLowerCase()) {
    console.log("\n✅ AXGoldVault reserve asset is now PAXG on Arbitrum One.");
    console.log("   Users must now approve PAXG (not WETH) before minting AXAU.");
    console.log("   Oracle: Chainlink XAU/USD — correctly prices 1 PAXG = 1 oz XAU.");
    console.log("   Arbiscan (vault): https://arbiscan.io/address/" + GOLD_VAULT);
    console.log("   Arbiscan (PAXG):  https://arbiscan.io/address/" + PAXG_ARBONE);
  } else {
    console.error("\n❌ Migration failed — reserveAsset did not update.");
    process.exitCode = 1;
  }
}

main().catch(e => { console.error(e); process.exitCode = 1; });
