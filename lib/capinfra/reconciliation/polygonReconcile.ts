/**
 * Axiom Protocol — Polygon USDC Reserve Reconciliation (Phase 5).
 *
 * Core reconciliation logic shared between:
 *   - scripts/reconcile-polygon-reserve.ts  (CLI invocation)
 *   - pages/api/cron/reconcile-polygon-reserve.ts  (Vercel daily cron)
 *
 * What this does:
 *   1. Gates on CHAIN_POLYGON_ENABLED=true and required env vars.
 *   2. Reads native USDC balance of the treasury wallet via RPC.
 *   3. Queries capinfra DB for net SETTLED POLYGON TRANSFER movements.
 *   4. Computes discrepancy = on_chain_balance − net_capinfra_movements.
 *   5. Optionally writes a JSON report to documents/operations/reconciliation-reports/.
 *   6. Returns a typed result object — no process.exit() calls here.
 *
 * Phase 5 scope:
 *   - No Axiom contracts are deployed on Polygon. USDC-only balance check.
 *   - AXUSD is Arbitrum-canonical. No AXUSD supply to reconcile on Polygon.
 *   - Treasury wallet balance is the single source of truth for Polygon USDC.
 *
 * Polygon USDC (mainnet):  0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
 * Polygon Amoy USDC:       use POLYGON_AMOY_USDC_CONTRACT env override
 */

import fs   from 'fs';
import path from 'path';

export type ReconcileStatus = 'BLOCKED' | 'CLEAN' | 'WARNING' | 'ANOMALY' | 'ERROR';
export type ReconcileNetwork = 'mainnet' | 'amoy';

export interface PolygonReconcileResult {
  version:                '1.0';
  adapter:                'POLYGON';
  network:                string;
  date:                   string;
  runAt:                  string;
  status:                 ReconcileStatus;
  blockers:               string[];
  onChainBalanceRaw:      string | null;
  onChainBalanceHuman:    string | null;
  capinfraNetMovementRaw: string | null;
  discrepancyRaw:         string | null;
  discrepancyHuman:       string | null;
  treasuryWallet:         string | null;
  usdcContract:           string;
  chainId:                number | null;
  notes:                  string[];
  reportPath:             string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const POLYGON_USDC_MAINNET  = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const POLYGON_CHAIN_ID      = 137;
const AMOY_CHAIN_ID         = 80002;
const USDC_DECIMALS         = 6;
const USDC_SCALE            = BigInt(10 ** USDC_DECIMALS);

// Tolerance thresholds (raw units at 6 decimals)
const TOLERANCE_NORMAL_RAW  = 1n;           // 0.000001 USDC — no action
const TOLERANCE_WARNING_RAW = 100_000n;     // 0.10 USDC — flag for review
const TOLERANCE_ANOMALY_RAW = 10_000_000n;  // 10.00 USDC — escalate

const ERC20_BALANCE_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function humanUsdc(raw: bigint): string {
  const abs   = raw < 0n ? -raw : raw;
  const sign  = raw < 0n ? '-' : '';
  const whole = abs / USDC_SCALE;
  const frac  = abs % USDC_SCALE;
  return `${sign}${whole}.${frac.toString().padStart(USDC_DECIMALS, '0')}`;
}

function resolveUsdcContract(network: ReconcileNetwork): string {
  if (network === 'amoy') {
    return (
      process.env.POLYGON_AMOY_USDC_CONTRACT?.trim() ??
      '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582' // Circle canonical Amoy USDC
    );
  }
  return POLYGON_USDC_MAINNET;
}

function resolveRpcUrl(network: ReconcileNetwork): string | null {
  if (network === 'amoy') {
    if (process.env.POLYGON_AMOY_RPC_URL) return process.env.POLYGON_AMOY_RPC_URL;
    if (process.env.ALCHEMY_API_KEY) {
      return `https://polygon-amoy.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
    }
    return process.env.POLYGON_RPC_URL ?? null;
  }
  return process.env.POLYGON_RPC_URL ?? null;
}

function resolveExpectedChainId(network: ReconcileNetwork): number {
  return network === 'amoy' ? AMOY_CHAIN_ID : POLYGON_CHAIN_ID;
}

// ── Core reconciliation runner ────────────────────────────────────────────────

export interface RunPolygonReconcileOptions {
  network?:     ReconcileNetwork;
  date?:        string;
  writeReport?: boolean;
}

export async function runPolygonReconcile(
  opts: RunPolygonReconcileOptions = {},
): Promise<PolygonReconcileResult> {
  const network = opts.network ?? 'mainnet';
  const date    = opts.date ?? new Date().toISOString().slice(0, 10);
  const runAt   = new Date().toISOString();

  const blockers: string[] = [];
  const notes:    string[] = [];

  notes.push(
    'Phase 5: Polygon USDC payment rail only. No Axiom contracts on Polygon.',
    'AXUSD is Arbitrum-canonical — no AXUSD supply to reconcile on Polygon.',
    'LIVE reconciliation requires: POLYGON_TREASURY_WALLET, POLYGON_RPC_URL, CHAIN_POLYGON_ENABLED=true.',
  );

  // ── Gate 1: CHAIN_POLYGON_ENABLED ─────────────────────────────────────────
  if (process.env.CHAIN_POLYGON_ENABLED !== 'true') {
    blockers.push('CHAIN_POLYGON_ENABLED is not "true" — Polygon reconciliation disabled');
  }

  // ── Gate 2: RPC URL ────────────────────────────────────────────────────────
  const rpcUrl = resolveRpcUrl(network);
  if (!rpcUrl) {
    blockers.push(
      network === 'amoy'
        ? 'POLYGON_AMOY_RPC_URL (or ALCHEMY_API_KEY) is required for Amoy reconciliation'
        : 'POLYGON_RPC_URL is required for Polygon mainnet reconciliation',
    );
  }

  // ── Gate 3: Treasury wallet ────────────────────────────────────────────────
  const treasuryWallet = process.env.POLYGON_TREASURY_WALLET?.trim() ?? null;
  if (!treasuryWallet) {
    blockers.push(
      'POLYGON_TREASURY_WALLET is not set — no treasury wallet to check. ' +
      'Provision a BitGo Polygon wallet and register it via seed-polygon-custody-wallet.ts.',
    );
  }

  const usdcContract    = resolveUsdcContract(network);
  const expectedChainId = resolveExpectedChainId(network);

  // ── BLOCKED — return early ─────────────────────────────────────────────────
  if (blockers.length > 0) {
    const result: PolygonReconcileResult = {
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
      treasuryWallet,
      usdcContract,
      chainId:                null,
      notes,
      reportPath:             null,
    };
    if (opts.writeReport) result.reportPath = writeReport(result, network, date);
    return result;
  }

  // ── Step 1: On-chain USDC balance ──────────────────────────────────────────
  let onChainBalanceRaw: bigint;
  let confirmedChainId: number;

  try {
    const { ethers } = await import('ethers');
    const provider   = new ethers.JsonRpcProvider(rpcUrl!);

    const net = await provider.getNetwork();
    confirmedChainId = Number(net.chainId);

    if (confirmedChainId !== expectedChainId) {
      throw new Error(
        `RPC returned chainId=${confirmedChainId} but expected ${expectedChainId} (${network}). ` +
        'Check POLYGON_RPC_URL — it may be pointing at the wrong network.',
      );
    }

    const contract  = new ethers.Contract(usdcContract, ERC20_BALANCE_ABI, provider);
    const raw       = await contract.balanceOf(treasuryWallet!);
    onChainBalanceRaw = BigInt(raw.toString());
  } catch (err) {
    const result: PolygonReconcileResult = {
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
      usdcContract,
      chainId:                null,
      notes,
      reportPath:             null,
    };
    if (opts.writeReport) result.reportPath = writeReport(result, network, date);
    return result;
  }

  // ── Step 2: Capinfra DB query (POLYGON SETTLED TRANSFER instructions) ───────
  let capinfraNetMovementRaw = 0n;
  try {
    const { db }  = await import('../../../server/db');
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
      const amountRaw = BigInt(Math.round(parseFloat(row.total) * Number(USDC_SCALE)).toString());
      if (row.action_type === 'TRANSFER') {
        capinfraNetMovementRaw += amountRaw;
      }
    }
    notes.push('capinfra_net_movement = sum of SETTLED POLYGON TRANSFER instructions.');
    notes.push('No MINT/REDEEM expected on Polygon — USDC payments only in Phase 5.');
  } catch (err) {
    notes.push(`DB query skipped: ${(err as Error).message} — balance-only check used`);
  }

  // ── Step 3: Discrepancy ────────────────────────────────────────────────────
  const discrepancy = onChainBalanceRaw - capinfraNetMovementRaw;
  const absDisc     = discrepancy < 0n ? -discrepancy : discrepancy;

  let status: ReconcileStatus = 'CLEAN';
  if (discrepancy < 0n) {
    status = 'ANOMALY';
    notes.push(`ANOMALY: on-chain balance is LESS than capinfra movements — possible missing transaction.`);
  } else if (absDisc > TOLERANCE_ANOMALY_RAW) {
    status = 'ANOMALY';
    notes.push(`ANOMALY: discrepancy=${humanUsdc(discrepancy)} USDC exceeds 10.00 USDC threshold.`);
  } else if (absDisc > TOLERANCE_WARNING_RAW) {
    status = 'WARNING';
    notes.push(`WARNING: discrepancy=${humanUsdc(discrepancy)} USDC exceeds 0.10 USDC threshold.`);
  } else if (absDisc > TOLERANCE_NORMAL_RAW) {
    status = 'WARNING';
    notes.push(`WARNING: discrepancy=${humanUsdc(discrepancy)} USDC — small but non-zero.`);
  }

  const result: PolygonReconcileResult = {
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
    usdcContract,
    chainId:                confirmedChainId!,
    notes,
    reportPath:             null,
  };

  if (opts.writeReport) {
    result.reportPath = writeReport(result, network, date);
  }

  return result;
}

// ── Report writer ─────────────────────────────────────────────────────────────

function writeReport(
  report: PolygonReconcileResult,
  network: ReconcileNetwork,
  date: string,
): string {
  const dir = path.join(process.cwd(), 'documents', 'operations', 'reconciliation-reports');
  fs.mkdirSync(dir, { recursive: true });
  const suffix  = network === 'amoy' ? `-amoy` : '';
  const outPath = path.join(dir, `polygon-${date}${suffix}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
  return outPath;
}
