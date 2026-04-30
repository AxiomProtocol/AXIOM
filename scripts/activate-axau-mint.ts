/**
 * activate-axau-mint.ts
 * Activates minting and redemption on the AXAU MintRedeemController.
 *
 * Calls:
 *   controller.pauseMint(false)   — opens mint
 *   controller.pauseRedeem(false) — opens redeem
 *
 * Usage:
 *   npx hardhat run scripts/activate-axau-mint.ts --network arbitrum
 */

import { ethers } from "hardhat";

const CONTROLLER = "0x682Ed413767b6275e29fc706391474F2C5Cc1A2A";

const ABI = [
  "function pauseMint(bool paused) external",
  "function pauseRedeem(bool paused) external",
  "function mintPaused() view returns (bool)",
  "function redeemPaused() view returns (bool)",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Signer:", deployer.address);

  const controller = new ethers.Contract(CONTROLLER, ABI, deployer);

  // ── Pre-flight check ──────────────────────────────────────────────────────
  const mintBefore   = await controller.mintPaused();
  const redeemBefore = await controller.redeemPaused();
  console.log(`\nPre-flight:`);
  console.log(`  mintPaused   = ${mintBefore}`);
  console.log(`  redeemPaused = ${redeemBefore}`);

  // ── Activate mint ─────────────────────────────────────────────────────────
  if (mintBefore) {
    console.log("\n→ Calling pauseMint(false) …");
    const tx = await controller.pauseMint(false);
    console.log("  tx:", tx.hash);
    await tx.wait();
    console.log("  ✓ Mint activated");
  } else {
    console.log("\n  Mint already active — skipping");
  }

  // ── Activate redeem ───────────────────────────────────────────────────────
  if (redeemBefore) {
    console.log("\n→ Calling pauseRedeem(false) …");
    const tx = await controller.pauseRedeem(false);
    console.log("  tx:", tx.hash);
    await tx.wait();
    console.log("  ✓ Redeem activated");
  } else {
    console.log("\n  Redeem already active — skipping");
  }

  // ── Post-flight check ─────────────────────────────────────────────────────
  const mintAfter   = await controller.mintPaused();
  const redeemAfter = await controller.redeemPaused();
  console.log(`\nPost-flight:`);
  console.log(`  mintPaused   = ${mintAfter}`);
  console.log(`  redeemPaused = ${redeemAfter}`);

  if (!mintAfter && !redeemAfter) {
    console.log("\n✅ AXAU mint and redeem are now LIVE on Arbitrum One.");
    console.log("   Verify on Arbiscan: https://arbiscan.io/address/" + CONTROLLER);
  } else {
    console.error("\n❌ One or more activations failed — check signer roles.");
    process.exitCode = 1;
  }
}

main().catch(e => { console.error(e); process.exitCode = 1; });
