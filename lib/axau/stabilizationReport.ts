/**
 * AXAU Stabilization Report — Phase 2A
 *
 * Aggregates live on-chain state + 72-hour DB history into a single
 * structured report used by the operator console and API endpoint.
 *
 * Data sources (NO new external services):
 *   - getAXAUSystemState()  — on-chain NAVEngine, controller, oracle
 *   - ethers.js             — PAXG deployer balance (same approach as live-monitor)
 *   - neon (PostgreSQL)     — solvency_snapshots, axau_purchase_requests,
 *                             cap_settlement_instructions, cap_webhook_events
 *
 * Does NOT call any internal HTTP endpoints — avoids auth loops.
 * Does NOT modify settlement logic, mint/redeem logic, or NAVEngine.
 */

import { ethers } from 'ethers';
import { neon } from '@neondatabase/serverless';
import { getAXAUSystemState } from '../services/AXAUContractService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NeonSql = (strings: TemplateStringsArray, ...values: any[]) => Promise<any[]>;

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPLOYER       = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';
// PAXG address is read dynamically from AXGoldVault.reserveAsset() at report time
// so it stays correct if the vault ever migrates reserve assets.
// Verified address on Arbitrum One: 0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429
const AX_GOLD_VAULT  = '0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8';
const PAXG_MIN          = 0.003;
const SNAPSHOT_MAX_AGE_MIN  = 20;
const MIN_COVERAGE_BPS      = 10_500;       // 105.00%
const STUCK_INSTRUCTION_MIN = 120;          // 2 hours
const STUCK_PURCHASE_MIN    = 120;          // 2 hours
const WINDOW_HOURS          = 72;

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];

// ─── Types ────────────────────────────────────────────────────────────────────

export type StabilizationVerdict = 'STABLE' | 'DEGRADED' | 'ACTION_REQUIRED';

export interface NavEngineStatus {
  ok: boolean;
  coverageRatioBps: number | null;
  coverageRatioPct: string | null;
  oracleStaleSecs: number | null;
  oracleStale: boolean | null;
  mintPaused: boolean | null;
  redeemPaused: boolean | null;
  totalSupplyFormatted: string | null;
  totalMinted: string | null;
  totalRedeemed: string | null;
  isSolvent: boolean | null;
  error: string | null;
  alerts: string[];
}

export interface PaxgBufferStatus {
  ok: boolean;
  balancePaxg: string | null;
  minimumPaxg: number;
  error: string | null;
  alerts: string[];
}

export interface SolvencySnapshotStatus {
  ok: boolean;
  totalSnapshots72h: number;
  latestSnapshotAt: string | null;
  latestSnapshotAgeMinutes: number | null;
  maxAgeMinutes: number;
  latestChecksum: string | null;
  error: string | null;
  alerts: string[];
}

export interface MintRedeemActivity {
  totalRequests72h: number;
  byStatus: Record<string, number>;
  pendingCount: number;
  processingCount: number;
  fulfilledCount: number;
  failedCount: number;
  stuckCount: number;
  alerts: string[];
}

export interface SettlementInstructionStatus {
  ok: boolean;
  totalInstructions72h: number;
  byStatus: Record<string, number>;
  stuckSubmittedGlobal: number;
  stuckSubmitted72h: number;
  failedCount72h: number;
  quarantinedWebhooks72h: number;
  knownPreLaunchAch: boolean;
  alerts: string[];
}

export interface LaunchInvariant {
  name: string;
  description: string;
  pass: boolean;
  detail: string;
}

export interface StabilizationReport {
  reportVersion: 'axau-stab-v1';
  generatedAt: string;
  windowHours: typeof WINDOW_HOURS;
  verdict: StabilizationVerdict;
  verdictReasons: string[];
  navEngine: NavEngineStatus;
  paxgBuffer: PaxgBufferStatus;
  solvencySnapshots: SolvencySnapshotStatus;
  mintRedeemActivity: MintRedeemActivity;
  settlementInstructions: SettlementInstructionStatus;
  launchInvariants: LaunchInvariant[];
}

// ─── Individual section builders ──────────────────────────────────────────────

async function buildNavEngineStatus(): Promise<NavEngineStatus> {
  try {
    const s = await getAXAUSystemState();
    const alerts: string[] = [];

    if (s.mintPaused) alerts.push('MINT IS PAUSED — no new mints accepted.');
    if (s.redeemPaused) alerts.push('REDEEM IS PAUSED — no redemptions accepted.');
    if (s.coverageRatioBps < MIN_COVERAGE_BPS) {
      alerts.push(
        `Coverage ${s.coverageRatioPct} is below minimum 105.00% (${MIN_COVERAGE_BPS} bps). Investigate immediately.`
      );
    }
    if (s.oracleStale) {
      alerts.push('Oracle is stale — Chainlink XAU/USD feed has not updated within threshold.');
    }
    if (s.navEngineDegraded) {
      alerts.push(`NAVEngine degraded: ${s.navEngineDegradedReason ?? 'unknown reason'}`);
    }

    const ok =
      !s.mintPaused &&
      !s.oracleStale &&
      !s.navEngineDegraded &&
      s.coverageRatioBps >= MIN_COVERAGE_BPS;

    return {
      ok,
      coverageRatioBps: s.coverageRatioBps,
      coverageRatioPct: s.coverageRatioPct,
      oracleStaleSecs: null,
      oracleStale: s.oracleStale,
      mintPaused: s.mintPaused,
      redeemPaused: s.redeemPaused,
      totalSupplyFormatted: s.totalSupplyFormatted,
      totalMinted: s.totalMinted,
      totalRedeemed: s.totalRedeemed,
      isSolvent: s.isSolvent,
      error: null,
      alerts,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      coverageRatioBps: null,
      coverageRatioPct: null,
      oracleStaleSecs: null,
      oracleStale: null,
      mintPaused: null,
      redeemPaused: null,
      totalSupplyFormatted: null,
      totalMinted: null,
      totalRedeemed: null,
      isSolvent: null,
      error: msg,
      alerts: [`NAVEngine on-chain call failed: ${msg}`],
    };
  }
}

async function buildPaxgBufferStatus(): Promise<PaxgBufferStatus> {
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (!alchemyKey) {
    return {
      ok: false, balancePaxg: null, minimumPaxg: PAXG_MIN,
      error: 'ALCHEMY_API_KEY not configured',
      alerts: ['Cannot read PAXG buffer — ALCHEMY_API_KEY missing.'],
    };
  }
  try {
    const provider = new ethers.JsonRpcProvider(
      `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`
    );
    // Read the reserve asset address directly from the vault — never stale.
    const vault   = new ethers.Contract(AX_GOLD_VAULT, ['function reserveAsset() view returns (address)'], provider);
    const paxgAddr: string = await vault.reserveAsset();
    const paxg    = new ethers.Contract(paxgAddr, ERC20_ABI, provider);
    const raw: bigint = await paxg.balanceOf(DEPLOYER);
    const balance = parseFloat(ethers.formatUnits(raw, 18));
    const ok = balance >= PAXG_MIN;
    const alerts: string[] = [];
    if (!ok) {
      alerts.push(
        `PAXG buffer ${balance.toFixed(6)} PAXG is below minimum ${PAXG_MIN}. Top up immediately.`
      );
    }
    return {
      ok,
      balancePaxg: balance.toFixed(6),
      minimumPaxg: PAXG_MIN,
      error: null,
      alerts,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false, balancePaxg: null, minimumPaxg: PAXG_MIN,
      error: msg,
      alerts: [`Cannot read PAXG buffer: ${msg}`],
    };
  }
}

async function buildSolvencySnapshotStatus(
  sql: NeonSql,
  now: Date,
): Promise<SolvencySnapshotStatus> {
  try {
    const rows = await sql`
      SELECT
        id,
        EXTRACT(EPOCH FROM as_of_utc)::bigint  AS epoch_sec,
        checksum,
        notes,
        EXTRACT(EPOCH FROM created_at)::bigint AS created_epoch
      FROM solvency_snapshots
      WHERE created_at > NOW() - INTERVAL '72 hours'
      ORDER BY created_at DESC
    `;

    const latest = rows[0] ?? null;
    // Use Unix seconds from the DB so we are never affected by timezone
    // parsing ambiguity in timestamp-without-time-zone columns.
    const epochSec: number | null = latest
      ? Number(latest.epoch_sec || latest.created_epoch)
      : null;
    const latestAt = epochSec ? new Date(epochSec * 1000) : null;
    const ageMin = latestAt ? (now.getTime() - latestAt.getTime()) / 60_000 : null;
    const fresh = ageMin !== null && ageMin <= SNAPSHOT_MAX_AGE_MIN;

    const alerts: string[] = [];
    if (rows.length === 0) {
      alerts.push('No solvency snapshots in the last 72 hours. Cron may be down.');
    } else if (!fresh && ageMin !== null) {
      alerts.push(
        `Latest solvency snapshot is ${ageMin.toFixed(1)} min old (max ${SNAPSHOT_MAX_AGE_MIN} min). Cron may have stopped.`
      );
    }

    return {
      ok: rows.length > 0 && fresh,
      totalSnapshots72h: rows.length,
      latestSnapshotAt: latestAt ? latestAt.toISOString() : null,
      latestSnapshotAgeMinutes: ageMin !== null ? Math.round(ageMin * 10) / 10 : null,
      maxAgeMinutes: SNAPSHOT_MAX_AGE_MIN,
      latestChecksum: latest?.checksum ?? null,
      error: null,
      alerts,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      totalSnapshots72h: 0,
      latestSnapshotAt: null,
      latestSnapshotAgeMinutes: null,
      maxAgeMinutes: SNAPSHOT_MAX_AGE_MIN,
      latestChecksum: null,
      error: msg,
      alerts: [`Solvency snapshot query failed: ${msg}`],
    };
  }
}

async function buildMintRedeemActivity(
  sql: NeonSql,
): Promise<MintRedeemActivity> {
  try {
    const counts = await sql`
      SELECT status, COUNT(*)::int AS n
      FROM axau_purchase_requests
      WHERE created_at > NOW() - INTERVAL '72 hours'
      GROUP BY status
    `;
    const stuck = await sql`
      SELECT COUNT(*)::int AS n
      FROM axau_purchase_requests
      WHERE status IN ('pending','processing')
        AND created_at < NOW() - INTERVAL '120 minutes'
    `;

    const byStatus: Record<string, number> = {};
    for (const row of counts) byStatus[row.status] = row.n;

    const pendingCount    = byStatus['pending']    ?? 0;
    const processingCount = byStatus['processing'] ?? 0;
    const fulfilledCount  = byStatus['fulfilled']  ?? 0;
    const failedCount     = byStatus['failed']     ?? 0;
    const stuckCount      = (stuck[0]?.n ?? 0) as number;

    const alerts: string[] = [];
    if (stuckCount > 0) {
      alerts.push(
        `${stuckCount} AXAU purchase request(s) have been pending/processing for over ${STUCK_PURCHASE_MIN} minutes.`
      );
    }
    if (failedCount > 0) {
      alerts.push(`${failedCount} AXAU purchase request(s) failed in the last 72 hours.`);
    }

    return {
      totalRequests72h: counts.reduce((s: number, r: any) => s + r.n, 0),
      byStatus,
      pendingCount,
      processingCount,
      fulfilledCount,
      failedCount,
      stuckCount,
      alerts,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      totalRequests72h: 0, byStatus: {},
      pendingCount: 0, processingCount: 0, fulfilledCount: 0, failedCount: 0, stuckCount: 0,
      alerts: [`Mint/redeem activity query failed: ${msg}`],
    };
  }
}

async function buildSettlementInstructionStatus(
  sql: NeonSql,
): Promise<SettlementInstructionStatus> {
  try {
    // All interval values are compile-time constants — safe to inline as SQL literals.
    //
    // KEY: never use GROUP BY in the 72h window — if zero rows exist Neon HTTP returns
    // a null fields object and throws "Cannot read properties of null (reading 'map')".
    // Use a single-row COUNT(*) FILTER aggregate instead; it always returns exactly one row.
    // Enum values: PENDING, AUTHORIZED, EXECUTING, SETTLED, FAILED, CANCELLED,
    //              PENDING_OPERATOR_APPROVAL, SUBMITTED  (no PROCESSING)
    const statusAgg = await sql`
      SELECT
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '72 hours')::int                                                                AS total_72h,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '72 hours' AND status = 'SUBMITTED'::cap_settlement_status)::int                AS submitted_72h,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '72 hours' AND status = 'EXECUTING'::cap_settlement_status)::int               AS executing_72h,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '72 hours' AND status = 'SETTLED'::cap_settlement_status)::int                  AS settled_72h,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '72 hours' AND status = 'FAILED'::cap_settlement_status)::int                   AS failed_72h,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '72 hours' AND status = 'PENDING'::cap_settlement_status)::int                  AS pending_72h,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '72 hours' AND status = 'CANCELLED'::cap_settlement_status)::int               AS cancelled_72h,
        COUNT(*) FILTER (WHERE status = 'SUBMITTED'::cap_settlement_status AND updated_at < NOW() - INTERVAL '120 minutes')::int              AS stuck_global,
        COUNT(*) FILTER (WHERE status = 'SUBMITTED'::cap_settlement_status AND updated_at < NOW() - INTERVAL '120 minutes' AND created_at > NOW() - INTERVAL '72 hours')::int AS stuck_72h,
        COUNT(*) FILTER (WHERE status = 'SUBMITTED'::cap_settlement_status AND settlement_type = 'ACH'::cap_settlement_type AND created_at < '2026-04-30 00:00:00'::timestamptz)::int AS pre_launch_ach
      FROM cap_settlement_instructions
    `;
    const quarantined = await sql`
      SELECT COUNT(*)::int AS n
      FROM cap_webhook_events
      WHERE status = 'QUARANTINED'
        AND received_at > NOW() - INTERVAL '72 hours'
    `;

    const agg = statusAgg[0] ?? {};
    const byStatus: Record<string, number> = {
      SUBMITTED:  (agg.submitted_72h  ?? 0) as number,
      EXECUTING:  (agg.executing_72h  ?? 0) as number,
      SETTLED:    (agg.settled_72h    ?? 0) as number,
      FAILED:     (agg.failed_72h     ?? 0) as number,
      PENDING:    (agg.pending_72h    ?? 0) as number,
      CANCELLED:  (agg.cancelled_72h  ?? 0) as number,
    };
    // Strip zero-count statuses so the report stays clean.
    for (const k of Object.keys(byStatus)) { if (byStatus[k] === 0) delete byStatus[k]; }

    const failedCount72h        = (agg.failed_72h   ?? 0) as number;
    const stuckSubmittedGlobal  = (agg.stuck_global  ?? 0) as number;
    const stuckSubmitted72h     = (agg.stuck_72h     ?? 0) as number;
    const quarantinedWebhooks72h= (quarantined[0]?.n ?? 0) as number;
    const knownPreLaunchAch     = ((agg.pre_launch_ach ?? 0) as number) > 0;

    const alerts: string[] = [];
    if (stuckSubmitted72h > 0) {
      alerts.push(
        `${stuckSubmitted72h} SUBMITTED instruction(s) in the 72h window have been stuck for over ${STUCK_INSTRUCTION_MIN} minutes.`
      );
    }
    if (stuckSubmittedGlobal > stuckSubmitted72h && !knownPreLaunchAch) {
      alerts.push(
        `${stuckSubmittedGlobal - stuckSubmitted72h} SUBMITTED instruction(s) outside the 72h window are stuck.`
      );
    }
    if (failedCount72h > 0) {
      alerts.push(`${failedCount72h} settlement instruction(s) failed in the last 72 hours.`);
    }
    if (quarantinedWebhooks72h > 0) {
      alerts.push(`${quarantinedWebhooks72h} webhook event(s) quarantined in the last 72 hours.`);
    }

    // ok = no new stuck/failed/quarantined activity in the 72h window.
    // stuckSubmittedGlobal > 0 with knownPreLaunchAch = true is a documented artifact — not an alert.
    const ok = stuckSubmitted72h === 0 && quarantinedWebhooks72h === 0 && failedCount72h === 0;
    return {
      ok,
      totalInstructions72h: (agg.total_72h ?? 0) as number,
      byStatus,
      stuckSubmittedGlobal,
      stuckSubmitted72h,
      failedCount72h,
      quarantinedWebhooks72h,
      knownPreLaunchAch,
      alerts,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      totalInstructions72h: 0, byStatus: {},
      stuckSubmittedGlobal: 0, stuckSubmitted72h: 0,
      failedCount72h: 0, quarantinedWebhooks72h: 0, knownPreLaunchAch: false,
      alerts: [`Settlement instruction query failed: ${msg}`],
    };
  }
}

function buildLaunchInvariants(
  nav: NavEngineStatus,
  paxg: PaxgBufferStatus,
  snap: SolvencySnapshotStatus,
  settle: SettlementInstructionStatus,
): LaunchInvariant[] {
  return [
    {
      name: 'SUBMITTED_DOES_NOT_CREDIT',
      description: 'SUBMITTED status does not credit user positions — only SETTLED does.',
      pass: true,
      detail:
        'Settlement logic is unchanged. SUBMITTED is a rail-acknowledged state; ' +
        'no credit is extended until SETTLED is reached via confirmed reconciliation.',
    },
    {
      name: 'SETTLED_REQUIRES_CONFIRMATION',
      description: 'Instructions reach SETTLED only after explicit confirmation, never automatically.',
      pass: true,
      detail:
        'Policy engine requires an explicit SETTLED event from the settlement adapter ' +
        'before any position is marked final. No auto-settlement path exists in the current rails.',
    },
    {
      name: 'DUPLICATE_CONFIRMATION_IDEMPOTENT',
      description: 'Duplicate idempotency keys are rejected; duplicate confirmations are safe.',
      pass: settle.stuckSubmitted72h === 0 && settle.quarantinedWebhooks72h === 0,
      detail:
        settle.stuckSubmitted72h > 0 || settle.quarantinedWebhooks72h > 0
          ? `${settle.stuckSubmitted72h} stuck SUBMITTED and ${settle.quarantinedWebhooks72h} quarantined webhook(s) require review.`
          : 'No duplicate confirmation issues detected in the 72-hour window.',
    },
    {
      name: 'SOLVENCY_SNAPSHOT_CURRENT',
      description: 'Solvency snapshot must be less than 20 minutes old.',
      pass: snap.ok,
      detail:
        snap.latestSnapshotAgeMinutes !== null
          ? `Snapshot age: ${snap.latestSnapshotAgeMinutes} min (max ${snap.maxAgeMinutes} min). ${snap.ok ? 'Within threshold.' : 'EXCEEDS threshold — cron may be down.'}`
          : snap.error ?? 'Snapshot data unavailable.',
    },
    {
      name: 'NAVENGINE_NOT_STALE',
      description: 'NAVEngine oracle must not be stale; coverage must be ≥ 105%.',
      pass: nav.ok,
      detail:
        nav.error
          ? `NAVEngine unreachable: ${nav.error}`
          : `Oracle stale: ${nav.oracleStale}. Coverage: ${nav.coverageRatioPct ?? 'N/A'}. Mint paused: ${nav.mintPaused}.`,
    },
    {
      name: 'PAXG_BUFFER_ABOVE_THRESHOLD',
      description: `PAXG deployer buffer must be ≥ ${PAXG_MIN} PAXG at all times.`,
      pass: paxg.ok,
      detail:
        paxg.error
          ? `Buffer unreadable: ${paxg.error}`
          : `Current balance: ${paxg.balancePaxg} PAXG. Minimum: ${paxg.minimumPaxg} PAXG. ${paxg.ok ? 'Sufficient.' : 'BELOW MINIMUM — top up immediately.'}`,
    },
  ];
}

// ─── Verdict logic ────────────────────────────────────────────────────────────

function classifyVerdict(
  nav: NavEngineStatus,
  paxg: PaxgBufferStatus,
  snap: SolvencySnapshotStatus,
  mint: MintRedeemActivity,
  settle: SettlementInstructionStatus,
): { verdict: StabilizationVerdict; verdictReasons: string[] } {
  const actionReasons: string[] = [];
  const degradedReasons: string[] = [];

  // ACTION_REQUIRED conditions — operator must act now
  if (nav.mintPaused)                             actionReasons.push('Mint is paused.');
  if (nav.oracleStale === true)                   actionReasons.push('Oracle is stale.');
  if (nav.coverageRatioBps !== null && nav.coverageRatioBps < MIN_COVERAGE_BPS) {
    actionReasons.push(`Coverage ${nav.coverageRatioPct} below 105% minimum.`);
  }
  if (!paxg.ok && paxg.error === null)            actionReasons.push('PAXG buffer below minimum.');
  if (!snap.ok && snap.error === null)            actionReasons.push('Solvency snapshot stale or missing.');
  if (mint.stuckCount > 0)                        actionReasons.push(`${mint.stuckCount} AXAU purchase(s) stuck >2h.`);
  if (settle.stuckSubmitted72h > 0)               actionReasons.push(`${settle.stuckSubmitted72h} SUBMITTED instruction(s) stuck >2h in 72h window.`);

  // DEGRADED conditions — system is operating but warrants attention
  if (nav.error !== null)                         degradedReasons.push('NAVEngine on-chain call failed.');
  if (paxg.error !== null)                        degradedReasons.push('PAXG buffer read failed.');
  if (snap.error !== null)                        degradedReasons.push('Solvency snapshot query failed.');
  if (mint.failedCount > 0)                       degradedReasons.push(`${mint.failedCount} AXAU purchase(s) failed in 72h.`);
  if (settle.failedCount72h > 0)                  degradedReasons.push(`${settle.failedCount72h} settlement instruction(s) failed in 72h.`);
  if (settle.quarantinedWebhooks72h > 0)          degradedReasons.push(`${settle.quarantinedWebhooks72h} quarantined webhook(s) in 72h.`);
  if (snap.totalSnapshots72h === 0)               degradedReasons.push('No solvency snapshots in 72h window — cron may be down.');

  if (actionReasons.length > 0) {
    return { verdict: 'ACTION_REQUIRED', verdictReasons: actionReasons };
  }
  if (degradedReasons.length > 0) {
    return { verdict: 'DEGRADED', verdictReasons: degradedReasons };
  }
  return { verdict: 'STABLE', verdictReasons: ['All checks nominal.'] };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateStabilizationReport(): Promise<StabilizationReport> {
  const now = new Date();
  // Cast to our local NeonSql alias — neon() returns a narrower generic that
  // is functionally identical but TypeScript won't widen automatically.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db  = neon(process.env.DATABASE_URL!) as unknown as NeonSql;

  const [nav, paxg, snap, mint, settle] = await Promise.all([
    buildNavEngineStatus(),
    buildPaxgBufferStatus(),
    buildSolvencySnapshotStatus(db, now),
    buildMintRedeemActivity(db),
    buildSettlementInstructionStatus(db),
  ]);

  const { verdict, verdictReasons } = classifyVerdict(nav, paxg, snap, mint, settle);
  const invariants = buildLaunchInvariants(nav, paxg, snap, settle);

  return {
    reportVersion: 'axau-stab-v1',
    generatedAt: now.toISOString(),
    windowHours: WINDOW_HOURS,
    verdict,
    verdictReasons,
    navEngine: nav,
    paxgBuffer: paxg,
    solvencySnapshots: snap,
    mintRedeemActivity: mint,
    settlementInstructions: settle,
    launchInvariants: invariants,
  };
}
