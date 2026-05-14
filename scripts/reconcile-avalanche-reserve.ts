/**
 * Axiom Protocol — Avalanche AXUSD Reserve Reconciliation Script.
 *
 * Satisfies Gate G12 (RESERVE_RECONCILIATION_MODEL.md §7 and §8).
 *
 * What this script does:
 *   1. Calls AxiomStable3643.totalSupply() via the configured Avalanche RPC.
 *   2. Queries Capinfra DB for net authorized AXUSD supply (SETTLED MINT − REDEEM).
 *   3. Computes discrepancy = on_chain_supply − net_authorized_supply.
 *   4. Writes reconciliation report to
 *        documents/operations/reconciliation-reports/YYYY-MM-DD.json
 *   5. Emits audit log on warning/escalation.
 *   6. Exits 0 if within normal tolerance, 1 if escalation threshold exceeded.
 *
 * Env vars:
 *   AVALANCHE_FUJI_RPC_URL   — Fuji RPC (preferred for chainId=43113)
 *   AVALANCHE_RPC_URL        — C-Chain RPC (fallback / mainnet)
 *   RECONCILE_NETWORK        — "fuji" (default) | "mainnet"
 *   RECONCILE_DATE           — override report date (YYYY-MM-DD, default: today UTC)
 *
 * Usage:
 *   npx tsx scripts/reconcile-avalanche-reserve.ts               # Fuji
 *   RECONCILE_NETWORK=mainnet npx tsx scripts/reconcile-avalanche-reserve.ts
 */

import 'dotenv/config';
import fs   from 'fs';
import path from 'path';
import { sql } from 'drizzle-orm';
import { db } from '../server/db';
import { FUJI_CONTRACTS, AVALANCHE_CONTRACTS, FUJI_CHAIN_ID, AVALANCHE_CHAIN_ID } from '../shared/contracts-avalanche';

// ── ERC-20 minimal ABI (totalSupply only) ────────────────────────────────────

const ERC20_SUPPLY_ABI = [
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
];

// ── Tolerance thresholds (raw units at 6 decimals) ───────────────────────────

const TOLERANCE_NORMAL_RAW    = 1n;         // 0.000001 AXUSD — no action
const TOLERANCE_WARNING_RAW   = 10_000n;    // 0.01 AXUSD — notify ops lead
const TOLERANCE_CRITICAL_RAW  = 1_000_000n; // 1.00 AXUSD — P1 incident / pause

// ── Network config ────────────────────────────────────────────────────────────

type Network = 'fuji' | 'mainnet';

function resolveNetwork(): Network {
  const raw = (process.env.RECONCILE_NETWORK || 'fuji').toLowerCase();
  if (raw === 'mainnet') return 'mainnet';
  return 'fuji';
}

function resolveRpcUrl(network: Network): string {
  if (network === 'fuji') {
    const fujiUrl = process.env.AVALANCHE_FUJI_RPC_URL;
    if (fujiUrl) return fujiUrl;
    const fallback = process.env.AVALANCHE_RPC_URL;
    if (fallback) return fallback;
    // Public Fuji endpoint — no key required
    return 'https://api.avax-test.network/ext/bc/C/rpc';
  }
  const mainnetUrl = process.env.AVALANCHE_RPC_URL;
  if (!mainnetUrl) {
    throw new Error('reconcile: AVALANCHE_RPC_URL is required for mainnet reconciliation');
  }
  return mainnetUrl;
}

function resolveContract(network: Network): string {
  if (network === 'fuji') return FUJI_CONTRACTS.AxiomStable3643;
  const addr = AVALANCHE_CONTRACTS.AxiomStable3643;
  if (!addr) throw new Error('reconcile: AVALANCHE_CONTRACTS.AxiomStable3643 is empty — mainnet not yet deployed');
  return addr;
}

function resolveChainId(network: Network): number {
  return network === 'fuji' ? FUJI_CHAIN_ID : AVALANCHE_CHAIN_ID;
}

function resolveAssetSymbolPattern(network: Network): string {
  return network === 'fuji' ? 'AXUSD-FUJI%' : 'AXUSD%';
}

// ── Report path ───────────────────────────────────────────────────────────────

function resolveReportPath(network: Network, dateStr: string): string {
  const dir = path.resolve(
    process.cwd(),
    'documents/operations/reconciliation-reports',
  );
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${dateStr}-${network}.json`);
}

// ── On-chain totalSupply ──────────────────────────────────────────────────────

async function fetchOnChainSupply(
  rpcUrl: string,
  contractAddress: string,
  expectedChainId: number,
): Promise<{ supplyRaw: bigint; decimals: number; blockNumber: number; blockTimestamp: number }> {
  const { ethers } = await import('ethers');
  const provider   = new ethers.JsonRpcProvider(rpcUrl);

  // Verify RPC chain matches expected network (T03 pattern).
  const network    = await provider.getNetwork();
  const rpcChainId = Number(network.chainId);
  if (rpcChainId !== expectedChainId) {
    throw new Error(
      `reconcile: RPC returned chainId=${rpcChainId} but expected ${expectedChainId}`,
    );
  }

  const block    = await provider.getBlock('latest');
  if (!block) throw new Error('reconcile: could not fetch latest block');

  const contract  = new ethers.Contract(contractAddress, ERC20_SUPPLY_ABI, provider);
  const supplyRaw = BigInt(await contract.totalSupply());
  const decimals  = Number(await contract.decimals());

  return {
    supplyRaw,
    decimals,
    blockNumber:    block.number,
    blockTimestamp: block.timestamp,
  };
}

// ── Capinfra DB query ─────────────────────────────────────────────────────────

interface CapinfraIssuance {
  netAuthorizedAxusd: string;
  mintCount:          number;
  redeemCount:        number;
  firstSettled:       string | null;
  lastSettled:        string | null;
  pendingCount:       number;
}

async function fetchCapinfraIssuance(symbolPattern: string): Promise<CapinfraIssuance> {
  // Net authorized supply — all SETTLED MINT/REDEEM for AXUSD-AVALANCHE assets
  const settledResult = await db.execute(sql`
    SELECT
      COALESCE(SUM(
        CASE WHEN csi.action_type = 'MINT'  THEN CAST(csi.amount AS NUMERIC)
             WHEN csi.action_type = 'REDEEM' THEN -CAST(csi.amount AS NUMERIC)
             ELSE 0
        END
      ), 0) AS net_authorized_supply_axusd,
      COUNT(*) FILTER (WHERE csi.action_type = 'MINT')   AS mint_count,
      COUNT(*) FILTER (WHERE csi.action_type = 'REDEEM') AS redeem_count,
      MIN(csi.settled_at) AS first_settled,
      MAX(csi.settled_at) AS last_settled
    FROM cap_settlement_instructions csi
    JOIN cap_assets ca ON ca.id = csi.asset_id
    WHERE csi.status = 'SETTLED'
      AND csi.action_type IN ('MINT', 'REDEEM')
      AND csi.settlement_type = 'AVALANCHE'
      AND ca.symbol LIKE ${symbolPattern}
  `);

  // Pending SUBMITTED instructions (timing delta window)
  const pendingResult = await db.execute(sql`
    SELECT COUNT(*) AS pending_count
    FROM cap_settlement_instructions csi
    JOIN cap_assets ca ON ca.id = csi.asset_id
    WHERE csi.status = 'SUBMITTED'
      AND csi.action_type = 'MINT'
      AND csi.settlement_type = 'AVALANCHE'
      AND ca.symbol LIKE ${symbolPattern}
  `);

  const row     = settledResult.rows[0] as Record<string, unknown>;
  const pendRow = pendingResult.rows[0] as Record<string, unknown>;

  return {
    netAuthorizedAxusd: String(row.net_authorized_supply_axusd ?? '0'),
    mintCount:          Number(row.mint_count   ?? 0),
    redeemCount:        Number(row.redeem_count ?? 0),
    firstSettled:       row.first_settled ? String(row.first_settled) : null,
    lastSettled:        row.last_settled  ? String(row.last_settled)  : null,
    pendingCount:       Number(pendRow.pending_count ?? 0),
  };
}

// ── Discrepancy and status ────────────────────────────────────────────────────

type ReconcileStatus = 'OK' | 'TIMING_DELTA' | 'WARNING' | 'ESCALATION' | 'CRITICAL';

function computeStatus(discrepancyRaw: bigint, pendingCount: number): ReconcileStatus {
  const abs = discrepancyRaw < 0n ? -discrepancyRaw : discrepancyRaw;
  if (abs === 0n)                              return 'OK';
  if (abs <= TOLERANCE_NORMAL_RAW)             return 'OK';
  if (pendingCount > 0 && abs <= TOLERANCE_WARNING_RAW) return 'TIMING_DELTA';
  if (abs <= TOLERANCE_WARNING_RAW)            return 'OK';
  if (abs <= TOLERANCE_CRITICAL_RAW)           return 'WARNING';
  if (discrepancyRaw > 0n)                     return 'CRITICAL';
  return 'ESCALATION';
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const network    = resolveNetwork();
  const rpcUrl     = resolveRpcUrl(network);
  const contract   = resolveContract(network);
  const chainId    = resolveChainId(network);
  const symbolPat  = resolveAssetSymbolPattern(network);
  const dateStr    = process.env.RECONCILE_DATE
    ?? new Date().toISOString().slice(0, 10);
  const reportPath = resolveReportPath(network, dateStr);

  console.log('══════════════════════════════════════════════════════════');
  console.log('  Axiom Protocol — Avalanche AXUSD Reserve Reconciliation');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Network   : ${network} (chainId=${chainId})`);
  console.log(`  Contract  : ${contract}`);
  console.log(`  RPC       : ${rpcUrl.replace(/\/v2\/[^/]+/, '/v2/<key>')}`);
  console.log(`  Date      : ${dateStr}`);
  console.log(`  Report    : ${reportPath}`);
  console.log();

  // ── Step 1: on-chain supply ───────────────────────────────────────────────
  console.log('  [1/4] Fetching on-chain totalSupply()…');
  const { supplyRaw, decimals, blockNumber, blockTimestamp } =
    await fetchOnChainSupply(rpcUrl, contract, chainId);
  const supplyAxusd = (Number(supplyRaw) / Math.pow(10, decimals)).toFixed(decimals);
  console.log(`        totalSupply = ${supplyRaw} raw (${supplyAxusd} AXUSD) at block ${blockNumber}`);

  // ── Step 2: Capinfra authorized issuance ─────────────────────────────────
  console.log('  [2/4] Querying Capinfra authorized issuance…');
  const issuance = await fetchCapinfraIssuance(symbolPat);
  const netAuthRaw = BigInt(
    Math.round(Number(issuance.netAuthorizedAxusd) * Math.pow(10, decimals)),
  );
  console.log(`        net authorized = ${issuance.netAuthorizedAxusd} AXUSD (${netAuthRaw} raw)`);
  console.log(`        mints=${issuance.mintCount} redeems=${issuance.redeemCount} pending=${issuance.pendingCount}`);

  // ── Step 3: discrepancy ───────────────────────────────────────────────────
  console.log('  [3/4] Computing discrepancy…');
  const discrepancyRaw  = supplyRaw - netAuthRaw;
  const discrepancyAxusd = (Number(discrepancyRaw) / Math.pow(10, decimals)).toFixed(decimals);
  const status          = computeStatus(discrepancyRaw, issuance.pendingCount);
  console.log(`        discrepancy = ${discrepancyRaw} raw (${discrepancyAxusd} AXUSD)`);
  console.log(`        status      = ${status}`);

  // ── Step 4: write report ──────────────────────────────────────────────────
  console.log('  [4/4] Writing report…');
  const blockTimestampUtc = new Date(blockTimestamp * 1000).toISOString();
  const report = {
    date:                      dateStr,
    network:                   network === 'fuji' ? 'avalanche-fuji' : 'avalanche-mainnet',
    chainId,
    contract,
    onChainSupplyRaw:          supplyRaw.toString(),
    onChainSupplyAxusd:        supplyAxusd,
    capinfraNetAuthorizedRaw:  netAuthRaw.toString(),
    capinfraNetAuthorizedAxusd: Number(issuance.netAuthorizedAxusd).toFixed(decimals),
    discrepancyRaw:            discrepancyRaw.toString(),
    discrepancyAxusd,
    status,
    mintCount:                 issuance.mintCount,
    redeemCount:               issuance.redeemCount,
    pendingSubmittedCount:     issuance.pendingCount,
    firstSettledAt:            issuance.firstSettled,
    lastSettledAt:             issuance.lastSettled,
    snapshotBlockNumber:       blockNumber,
    snapshotTimestampUtc:      blockTimestampUtc,
    generatedAt:               new Date().toISOString(),
    toleranceNormalRaw:        TOLERANCE_NORMAL_RAW.toString(),
    toleranceWarningRaw:       TOLERANCE_WARNING_RAW.toString(),
    toleranceCriticalRaw:      TOLERANCE_CRITICAL_RAW.toString(),
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`        wrote ${reportPath}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log();
  console.log('══════════════════════════════════════════════════════════');
  if (status === 'OK') {
    console.log('  RESULT: OK ✓ — on-chain supply matches Capinfra authorization');
  } else if (status === 'TIMING_DELTA') {
    console.log('  RESULT: TIMING_DELTA ⚠ — discrepancy within pending instruction window');
    console.log(`  Pending SUBMITTED instructions: ${issuance.pendingCount}`);
    console.log('  Recheck after all SUBMITTED instructions are settled.');
  } else if (status === 'WARNING') {
    console.log('  RESULT: WARNING ⚠ — discrepancy exceeds normal tolerance');
    console.log('  Action: Notify Operations Lead; investigate within 4 hours.');
  } else if (status === 'ESCALATION') {
    console.log('  RESULT: ESCALATION ✗ — discrepancy exceeds escalation threshold');
    console.log('  Action: P2 incident — escalate immediately per INCIDENT_RESPONSE_PLAN.md §5F');
  } else if (status === 'CRITICAL') {
    console.log('  RESULT: CRITICAL ✗ — on-chain supply EXCEEDS authorization');
    console.log('  Action: P1 incident — PAUSE TOKEN NOW per INCIDENT_RESPONSE_PLAN.md §5A');
  }
  console.log(`  Discrepancy : ${discrepancyAxusd} AXUSD (${discrepancyRaw} raw)`);
  console.log(`  On-chain    : ${supplyAxusd} AXUSD`);
  console.log(`  Authorized  : ${Number(issuance.netAuthorizedAxusd).toFixed(decimals)} AXUSD`);
  console.log(`  Block       : ${blockNumber} (${blockTimestampUtc})`);
  console.log('══════════════════════════════════════════════════════════');

  // Exit 1 on escalation or critical — allows CI/cron to detect failures.
  if (status === 'ESCALATION' || status === 'CRITICAL') {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[reconcile-avalanche-reserve] FAILED:', err);
  process.exit(1);
});
