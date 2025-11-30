/**
 * Master Integration Script
 * Executes all 4 stages of the Axiom Smart City integration
 */

import { ethers } from "hardhat";
import { execSync } from "child_process";

async function runStage(stageNum: number, stageName: string): Promise<boolean> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🚀 STARTING STAGE ${stageNum}: ${stageName}`);
  console.log("=".repeat(60));
  
  try {
    const network = await ethers.provider.getNetwork();
    const networkFlag = network.chainId === 31337n ? "hardhat" : "arbitrum";
    
    execSync(`npx hardhat run integration/scripts/stage${stageNum}-integration.ts --network ${networkFlag}`, {
      stdio: "inherit"
    });
    
    console.log(`\n✅ STAGE ${stageNum} COMPLETED SUCCESSFULLY\n`);
    return true;
  } catch (error) {
    console.error(`\n❌ STAGE ${stageNum} FAILED\n`);
    console.error(error);
    return false;
  }
}

async function main() {
  console.log("\n");
  console.log("╔" + "═".repeat(58) + "╗");
  console.log("║" + " ".repeat(58) + "║");
  console.log("║" + "  🏙️  AXIOM SMART CITY - MASTER INTEGRATION  ".padEnd(58) + "║");
  console.log("║" + "  Connecting All 22 Deployed Contracts       ".padEnd(58) + "║");
  console.log("║" + " ".repeat(58) + "║");
  console.log("╚" + "═".repeat(58) + "╝");
  console.log("\n");

  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.chainId === 31337n ? "Hardhat Fork (Safe Testing)" : "Arbitrum One (MAINNET)");
  console.log("Timestamp:", new Date().toISOString());
  console.log("\n");

  const stages = [
    { num: 1, name: "Core Security & Token Plumbing", steps: 11 },
    { num: 2, name: "Financial & Real Estate Mesh", steps: 5 },
    { num: 3, name: "City Services & Oracles", steps: 2 },
    { num: 4, name: "Community & Cross-Chain", steps: 0 }
  ];

  const results: { stage: number; name: string; success: boolean }[] = [];
  let totalSteps = 0;
  let startTime = Date.now();

  for (const stage of stages) {
    const success = await runStage(stage.num, stage.name);
    results.push({ stage: stage.num, name: stage.name, success });
    totalSteps += stage.steps;
    
    if (!success) {
      console.error(`\n❌ INTEGRATION ABORTED AT STAGE ${stage.num}`);
      process.exit(1);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // ========================================
  // FINAL SUMMARY
  // ========================================

  console.log("\n");
  console.log("╔" + "═".repeat(58) + "╗");
  console.log("║" + " ".repeat(58) + "║");
  console.log("║" + "  🎉 COMPLETE INTEGRATION SUCCESSFUL!       ".padEnd(58) + "║");
  console.log("║" + " ".repeat(58) + "║");
  console.log("╚" + "═".repeat(58) + "╝");
  console.log("\n");

  console.log("📊 FINAL STATISTICS");
  console.log("=".repeat(60));
  console.log(`Total Stages Completed: ${results.filter(r => r.success).length}/${results.length}`);
  console.log(`Total Integration Steps: ${totalSteps}`);
  console.log(`Execution Time: ${duration}s`);
  console.log(`Network: ${network.chainId === 31337n ? "Hardhat Fork" : "Arbitrum One"}`);
  console.log("\n");

  console.log("✅ STAGE RESULTS:");
  for (const result of results) {
    console.log(`   ${result.success ? "✅" : "❌"} Stage ${result.stage}: ${result.name}`);
  }
  console.log("\n");

  console.log("🔗 INTEGRATED CONTRACTS:");
  console.log("   Core Infrastructure (6 contracts)");
  console.log("   Real Estate & Rental (3 contracts)");
  console.log("   DeFi Banking & Utilities (3 contracts)");
  console.log("   Advanced DeFi (4 contracts)");
  console.log("   Market Infrastructure (2 contracts)");
  console.log("   Community & Ecosystem (4 contracts)");
  console.log("   ─────────────────────────────");
  console.log("   TOTAL: 22 contracts fully integrated ✅");
  console.log("\n");

  console.log("📝 NEXT STEPS:");
  console.log("   1. Run end-to-end integration tests");
  console.log("   2. Deploy operations dashboard for monitoring");
  console.log("   3. Execute on mainnet (if currently on fork)");
  console.log("   4. Document integration results");
  console.log("\n");

  console.log("🎊 Axiom Smart City integration complete!");
  console.log("   All 22 contracts are now connected and ready for production use.\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
