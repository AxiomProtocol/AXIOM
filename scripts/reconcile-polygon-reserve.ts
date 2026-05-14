/**
 * Axiom Protocol — Polygon USDC Reserve Reconciliation Script (Phase 4).
 *
 * Phase 4 status: READ-ONLY. No writes, no transaction signing, no live movement.
 *
 * What this script does (when Polygon env is present):
 *   1. Checks POLYGON_RPC_URL and CHAIN_POLYGON_ENABLED — exits with clear message if absent.
 *   2. Reads native USDC balance from the configured Polygon treasury wallet via RPC.
 *   3. Queries capinfra DB for POLYGON-type SETTLED instructions (sum of TRANSFER movements).
 *   4. Computes discrepancy = on_chain_balance − net_capinfra_movements.
 *   5. Writes a JSON report to documents/operations/reconciliation-reports/polygon-YYYY-MM-DD.json
 *   6. Exits 0 if within tolerance, 1 if anomaly detected.
 *
 * Phase 4 constraints:
 *   - No Axiom contracts are deployed on Polygon — no AXUSD supply to reconcile.
 *   - The treasury wallet on Polygon does not yet exist in custody.
 *   - This script will report BLOCKED until both POLYGON_RPC_URL and
 *     POLYGON_TREASURY_WALLET are set in the environment.
 *   - No live dispatch, no transaction signing, no writes to DB.
 *
 * Env vars:
 *   POLYGON_RPC_URL            — Polygon PoS mainnet RPC endpoint (required for live mode)
 *   POLYGON_AMOY_RPC_URL       — Polygon Amoy testnet RPC (for testnet reconciliation)
 *   CHAIN_POLYGON_ENABLED      — Must be 'true' for reconciliation to proceed
 *   POLYGON_TREASURY_WALLET    — 0x... treasury wallet address to check USDC balance
 *   RECONCILE_NETWORK          — 'mainnet' (default) | 'amoy'
 *   RECONCILE_DATE             — override report date (YYYY-MM-DD, default: today UTC)
 *
 * Usage:
 *   npx tsx scripts/reconcile-polygon-reserve.ts               # mainnet (read-only)
 *   RECONCILE_NETWORK=amoy npx tsx scripts/reconcile-polygon-reserve.ts
 */

import 'dotenv/config';
import fs   from 'fs';
import path from 'path';

// ── Report output types ───────────────────────────────────────────

type ReconcileStatus = 'BLOCKED' | 'CLEAN' | 'WARNING' | 'ANOMALY' | 'ERROR';

interface ReconcileReport {
  version:          '1.0';
  adapter:          'POLYGON';
  network:          string;
  date:             string;
  runAt:            string;
  status:           ReconcileStatus;
  blockers:         string[];
  onChainBalanceRaw: string | null;
  onChainBalanceHuman: string | null;
  capinfraNetMovementRaw: string | null;
  discrepancyRaw:   string | null;
  discrepancyHuman: string | null;
  treasuryWallet:   string | null;
  usdcContract:     string;
  notes:            string[];
}

// ── Constants ─────────────────────────────────────────────────────

const POLYGON_USDC_NATIVE    = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const POLYGON_USDC_DECIMALS  = 6;
const USDC_SCALE             = BigInt(10 ** POLYGON_USDC_DECIMALS);

const ERC20_BALANCE_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

// ── Network resolution ────────────────────────────────────────────

type Network = 'mainnet' | 'amoy';

function resolveNetwork(): Network {
  const raw = (process.env.RECONCILE_NETWORK || 'mainnet').toLowerCase();
  if (raw === 'amoy') return 'amoy';
  return 'mainnet';
}

function resolveRpcUrl(network: Network): string | null {
  if (network === 'amoy') {
    return process.env.POLYGON_AMOY_RPC_URL ?? process.env.POLYGON_RPC_URL ?? null;
  }
  return process.env.POLYGON_RPC_URL ?? null;
}

function resolveDate(): string {
  const override = process.env.RECONCILE_DATE;
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) return override;
  return new Date().toISOString().slice(0, 10);
}

function humanUsdc(raw: bigint): string {
  const whole = raw / USDC_SCALE;
  const frac  = raw % USDC_SCALE;
  return `${whole}.${frac.toString().padStart(POLYGON_USDC_DECIMALS, '0')}`;
}

// ── Report writer ─────────────────────────────────────────────────

function writeReport(report: ReconcileReport, date: string): void {
  const dir = path.join(process.cwd(), 'documents', 'operations', 'reconciliation-reports');
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, `polygon-${date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`  Report written: ${outPath}`);
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  const network = resolveNetwork();
  const date    = resolveDate();
  const runAt   = new Date().toISOString();

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  AXIOM PROTOCOL — POLYGON RESERVE RECONCILIATION (Phase 4)');
  console.log(`  Network: ${network.toUpperCase()}   Date: ${date}`);
  console.log(`  Run at:  ${runAt}`);
  console.log('  Phase 4: READ-ONLY — no writes, no signing, no live movement');
  console.log('══════════════════════════════════════════════════════════════\n');

  const blockers: string[] = [];
  const notes: string[]    = [];

  // ── Pre-flight checks ───────────────────────────────────────────

  if (process.env.CHAIN_POLYGON_ENABLED !== 'true') {
    blockers.push('CHAIN_POLYGON_ENABLED is not set to "true" — Polygon reconciliation disabled');
  }

  const rpcUrl = resolveRpcUrl(network);
  if (!rpcUrl) {
    blockers.push(
      network === 'amoy'
        ? 'POLYGON_AMOY_RPC_URL (or POLYGON_RPC_URL) is required for Amoy reconciliation'
        : 'POLYGON_RPC_URL is required for mainnet reconciliation',
    );
  }

  const treasuryWallet = process.env.POLYGON_TREASURY_WALLET ?? null;
  if (!treasuryWallet) {
    blockers.push(
      'POLYGON_TREASURY_WALLET is not set — no treasury wallet to check. ' +
      'Register a BitGo Polygon wallet in custodyWalletRegistry before enabling live reconciliation.',
    );
  }

  notes.push(
    'Phase 4: No Axiom contracts deployed on Polygon. USDC balance reconciliation only.',
    'AXUSD is Arbitrum-canonical. No AXUSD supply to reconcile on Polygon.',
    'LIVE reconciliation requires: POLYGON_TREASURY_WALLET, POLYGON_RPC_URL, CHAIN_POLYGON_ENABLED=true.',
  );

  if (blockers.length > 0) {
    const report: ReconcileReport = {
      version:                '1.0',
      adapter:                'POLYGON',
      network,
      date,
      runAt,
      status:                 'BLOCKED',
      blockers,
      onChainBalanceRaw:      null,
      onChainBalanceHuman:    null,
      capinfraNetMovementRaw: null,
      discrepancyRaw:         null,
      discrepancyHuman:       null,
      treasuryWallet:         treasuryWallet,
      usdcContract:           POLYGON_USDC_NATIVE,
      notes,
    };

    console.log('  STATUS: BLOCKED\n');
    for (const b of blockers) {
      console.log(`  BLOCKER: ${b}`);
    }
    console.log('\n  This is expected in Phase 4 — no Polygon treasury wallet exists yet.');
    console.log('  Fix the blockers above before running live reconciliation.\n');

    writeReport(report, date);
    process.exit(0); // Exit 0 — BLOCKED is the expected Phase 4 state, not an error
  }

  // ── Live reconciliation (only reached when all env vars are set) ──

  let onChainBalanceRaw: bigint;
  try {
    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(rpcUrl!);
    const contract = new ethers.Contract(POLYGON_USDC_NATIVE, ERC20_BALANCE_ABI, provider);
    const raw = await contract.balanceOf(treasuryWallet!);
    onChainBalanceRaw = BigInt(raw.toString());
    console.log(`  On-chain USDC balance: ${humanUsdc(onChainBalanceRaw)} USDC`);
  } catch (err) {
    const report: ReconcileReport = {
      version:                '1.0',
      adapter:                'POLYGON',
      network,
      date,
      runAt,
      status:                 'ERROR',
      blockers:               [`RPC call failed: ${(err as Error).message}`],
      onChainBalanceRaw:      null,
      onChainBalanceHuman:    null,
      capinfraNetMovementRaw: null,
      discrepancyRaw:         null,
      discrepancyHuman:       null,
      treasuryWallet,
      usdcContract:           POLYGON_USDC_NATIVE,
      notes,
    };
    console.error(`  RPC ERROR: ${(err as Error).message}`);
    writeReport(report, date);
    process.exit(1);
  }

  // ── Capinfra DB query (POLYGON SETTLED instructions) ───────────────

  let capinfraNetMovementRaw = 0n;
  try {
    const { db }  = await import('../server/db');
    const { sql } = await import('drizzle-orm');

    const rows = await db.execute(sql`
      SELECT
        action_type,
        COALESCE(SUM(amount::numeric), 0) AS total
      FROM cap_settlement_instructions
      WHERE settlement_type = 'POLYGON'
        AND status = 'SETTLED'
      GROUP BY action_type
    `);

    for (const row of rows.rows as Array<{ action_type: string; total: string }>) {
      const amountRaw = BigInt(
        Math.round(parseFloat(row.total) * Number(USDC_SCALE)).toString(),
      );
      if (row.action_type === 'TRANSFER') {
        capinfraNetMovementRaw += amountRaw;
      }
    }
    console.log(`  Capinfra net POLYGON movements: ${humanUsdc(capinfraNetMovementRaw)} USDC`);
    notes.push(
      'capinfra_net_movement = sum of SETTLED POLYGON TRANSFER instructions.',
      'No MINT/REDEEM are expected on Polygon in Phase 4 (USDC only, no AXUSD).',
    );
  } catch (err) {
    console.warn(`  DB query skipped (${(err as Error).message}) — proceeding with balance-only check`);
    notes.push(`DB query skipped: ${(err as Error).message}`);
  }

  // ── Discrepancy check ─────────────────────────────────────────────

  const discrepancy = onChainBalanceRaw - capinfraNetMovementRaw;
  const TOLERANCE   = 1n; // 0.000001 USDC — sub-cent rounding tolerance

  let status: ReconcileStatus = 'CLEAN';
  if (discrepancy < 0n || discrepancy > TOLERANCE * 10_000n) {
    status = 'ANOMALY';
    notes.push(`ANOMALY: discrepancy=${humanUsdc(discrepancy < 0n ? -discrepancy : discrepancy)} USDC exceeds threshold.`);
  } else if (discrepancy > TOLERANCE) {
    status = 'WARNING';
    notes.push(`WARNING: discrepancy=${humanUsdc(discrepancy)} USDC (within tolerance but non-zero).`);
  }

  const report: ReconcileReport = {
    version:                '1.0',
    adapter:                'POLYGON',
    network,
    date,
    runAt,
    status,
    blockers:               [],
    onChainBalanceRaw:      onChainBalanceRaw.toString(),
    onChainBalanceHuman:    humanUsdc(onChainBalanceRaw),
    capinfraNetMovementRaw: capinfraNetMovementRaw.toString(),
    discrepancyRaw:         discrepancy.toString(),
    discrepancyHuman:       humanUsdc(discrepancy < 0n ? -discrepancy : discrepancy),
    treasuryWallet,
    usdcContract:           POLYGON_USDC_NATIVE,
    notes,
  };

  console.log(`  Discrepancy: ${humanUsdc(discrepancy < 0n ? -discrepancy : discrepancy)} USDC`);
  console.log(`  Status: ${status}`);

  writeReport(report, date);
  process.exit(status === 'ANOMALY' ? 1 : 0);
}

main().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
