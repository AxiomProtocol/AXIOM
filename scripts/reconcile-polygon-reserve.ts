/**
 * Axiom Protocol — Polygon USDC Reserve Reconciliation Script (Phase 5).
 *
 * CLI wrapper around lib/capinfra/reconciliation/polygonReconcile.ts.
 * The shared module is also called by /api/cron/reconcile-polygon-reserve.
 *
 * What this script does (when env vars are configured):
 *   1. Checks POLYGON_RPC_URL and CHAIN_POLYGON_ENABLED — exits with clear message if absent.
 *   2. Reads native USDC balance from the configured Polygon treasury wallet via RPC.
 *   3. Queries capinfra DB for POLYGON-type SETTLED TRANSFER movements.
 *   4. Computes discrepancy = on_chain_balance − net_capinfra_movements.
 *   5. Writes a JSON report to documents/operations/reconciliation-reports/polygon-YYYY-MM-DD.json
 *   6. Exits 0 if CLEAN/WARNING, 1 if ANOMALY/ERROR, 0 if BLOCKED (pre-activation).
 *
 * Phase 5 notes:
 *   - No Axiom contracts are deployed on Polygon — USDC balance reconciliation only.
 *   - AXUSD is Arbitrum-canonical. No AXUSD supply to reconcile on Polygon.
 *   - The treasury wallet must be a BitGo CaaS Polygon custody wallet.
 *   - Script will report BLOCKED until POLYGON_RPC_URL, POLYGON_TREASURY_WALLET,
 *     and CHAIN_POLYGON_ENABLED=true are all set.
 *
 * Env vars:
 *   POLYGON_RPC_URL            — Polygon PoS mainnet RPC endpoint (required for mainnet)
 *   POLYGON_AMOY_RPC_URL       — Polygon Amoy testnet RPC (for amoy network)
 *   ALCHEMY_API_KEY            — Fallback: constructs Alchemy Amoy URL for amoy network
 *   CHAIN_POLYGON_ENABLED      — Must be 'true' for reconciliation to proceed
 *   POLYGON_TREASURY_WALLET    — 0x... treasury wallet address to check USDC balance
 *   POLYGON_AMOY_USDC_CONTRACT — Override Amoy USDC contract address (default: Circle canonical)
 *   RECONCILE_NETWORK          — 'mainnet' (default) | 'amoy'
 *   RECONCILE_DATE             — override report date (YYYY-MM-DD, default: today UTC)
 *
 * Usage:
 *   npx tsx scripts/reconcile-polygon-reserve.ts               # mainnet
 *   RECONCILE_NETWORK=amoy npx tsx scripts/reconcile-polygon-reserve.ts
 */

import 'dotenv/config';
import { runPolygonReconcile } from '../lib/capinfra/reconciliation/polygonReconcile';
import type { ReconcileNetwork } from '../lib/capinfra/reconciliation/polygonReconcile';

async function main() {
  const networkRaw = (process.env.RECONCILE_NETWORK ?? 'mainnet').toLowerCase();
  const network: ReconcileNetwork = networkRaw === 'amoy' ? 'amoy' : 'mainnet';
  const date = process.env.RECONCILE_DATE;

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  AXIOM PROTOCOL — POLYGON RESERVE RECONCILIATION (Phase 5)');
  console.log(`  Network: ${network.toUpperCase()}   Date: ${date ?? 'today'}`);
  console.log(`  Run at:  ${new Date().toISOString()}`);
  console.log('══════════════════════════════════════════════════════════════\n');

  const result = await runPolygonReconcile({ network, date, writeReport: true });

  // Print summary
  if (result.status === 'BLOCKED') {
    console.log('  STATUS: BLOCKED\n');
    for (const b of result.blockers) {
      console.log(`  BLOCKER: ${b}`);
    }
    console.log('\n  Fix the blockers above before running live reconciliation.');
    console.log('  See documents/chains/AXIOM_POLYGON_AMOY_ACTIVATION_GUIDE.md for setup steps.\n');
    if (result.reportPath) console.log(`  Report: ${result.reportPath}\n`);
    process.exit(0); // BLOCKED is expected pre-activation, not an error
  }

  if (result.status === 'ERROR') {
    console.log(`  STATUS: ERROR`);
    for (const b of result.blockers) console.log(`  ERROR: ${b}`);
    if (result.reportPath) console.log(`  Report: ${result.reportPath}\n`);
    process.exit(1);
  }

  // CLEAN / WARNING / ANOMALY
  console.log(`  On-chain balance:  ${result.onChainBalanceHuman} USDC`);
  console.log(`  Capinfra movements: ${result.capinfraNetMovementRaw} (raw)`);
  console.log(`  Discrepancy:       ${result.discrepancyHuman} USDC`);
  console.log(`  Treasury wallet:   ${result.treasuryWallet}`);
  console.log(`  Chain ID:          ${result.chainId}`);
  console.log(`  STATUS:            ${result.status}`);

  if (result.status === 'WARNING') {
    console.log('\n  Action: Review the discrepancy. Check for pending POLYGON instructions.');
    console.log('  If unresolved in 4 hours, escalate to Operations Lead.\n');
  }

  if (result.status === 'ANOMALY') {
    console.log('\n  ⚠ ANOMALY DETECTED. Immediate action required.');
    console.log('  1. Check for any pending or failed POLYGON settlement instructions.');
    console.log('  2. Verify no unauthorized USDC movements from the treasury wallet.');
    console.log('  3. Escalate per INCIDENT_RESPONSE_PLAN.md §5F.\n');
  }

  if (result.reportPath) console.log(`\n  Report: ${result.reportPath}`);

  for (const note of result.notes) {
    console.log(`  Note: ${note}`);
  }
  console.log('');

  process.exit(result.status === 'ANOMALY' ? 1 : 0);
}

main().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
