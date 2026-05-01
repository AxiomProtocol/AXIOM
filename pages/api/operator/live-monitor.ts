import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { neon } from '@neondatabase/serverless';
import { isValidOperatorKey, readOperatorCookie, OPERATOR_HEADER_KEY } from '../../../lib/capinfra/operatorAuth';

/**
 * GET /api/operator/live-monitor
 *
 * Continuous monitoring endpoint — polled by the operator dashboard every
 * 30 seconds. Returns live on-chain NAVEngine state, solvency snapshot
 * freshness, and PAXG buffer balance.
 *
 * Auth: x-admin-key header (ADMIN_SOLVENCY_KEY). Public callers receive
 * a 401 — this is an operator-only surface.
 *
 * Design: all three data sources are fetched in parallel (Promise.allSettled)
 * so a failure in one does not block the others. Each check returns either
 * data or an error field — callers should alert on any error field.
 */

const NAV_ENGINE      = '0x80F8634a43B26a2bd403396A42465F138aeCC519';
const DEPLOYER        = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';
const PAXG_ARBITRUM   = '0x7AfB39837Fd244A651e4F0C5660B4037214D4576';
const PAXG_MIN        = 0.003;        // day-one minimum — alert if below
const SNAPSHOT_MAX_AGE_MIN = 20;      // alert if solvency snapshot older than this

const NAV_ENGINE_ABI = [
  'function coverageRatioBps() view returns (uint256)',
  'function oracleStaleSecs() view returns (uint256)',
  'function revertOnStaleOracle() view returns (bool)',
];
const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];

function formatBps(bps: bigint): string {
  return (Number(bps) / 100).toFixed(2) + '%';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');

  // Auth — operator only. Accepts the cap_operator_key cookie (set after
  // login) or the x-admin-key header. Both carry the same ADMIN_SOLVENCY_KEY
  // value and are validated via constant-time compare in isValidOperatorKey.
  const provided = readOperatorCookie(req) || (req.headers[OPERATOR_HEADER_KEY] || '').toString();
  if (!isValidOperatorKey(provided)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (!alchemyKey) {
    return res.status(503).json({ error: 'ALCHEMY_API_KEY not configured' });
  }

  const now = new Date();

  const provider = new ethers.JsonRpcProvider(
    `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`
  );
  const navEngine = new ethers.Contract(NAV_ENGINE, NAV_ENGINE_ABI, provider);
  const paxg      = new ethers.Contract(PAXG_ARBITRUM, ERC20_ABI, provider);

  // ── Parallel fetch all three sources ─────────────────────────────────────
  const [navResult, paxgResult, snapshotResult] = await Promise.allSettled([
    // 1. NAVEngine on-chain
    Promise.all([
      navEngine.coverageRatioBps(),
      navEngine.oracleStaleSecs(),
      navEngine.revertOnStaleOracle(),
    ]),
    // 2. PAXG deployer balance
    paxg.balanceOf(DEPLOYER),
    // 3. Latest solvency snapshot timestamp
    (async () => {
      const db = neon(process.env.DATABASE_URL!);
      const rows = await db`
        SELECT notes, checksum
        FROM solvency_snapshots
        ORDER BY id DESC
        LIMIT 1
      `;
      if (rows.length === 0) throw new Error('No solvency snapshots found');
      // Extract timestamp from notes field
      const notes: string = rows[0].notes || '';
      const match = notes.match(/(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/);
      const ts = match ? new Date(match[1]) : null;
      return { ts, checksum: rows[0].checksum as string, notes };
    })(),
  ]);

  // ── NAVEngine ─────────────────────────────────────────────────────────────
  let navEngine_ok = false;
  let navEngineData: Record<string, unknown> = {};
  if (navResult.status === 'fulfilled') {
    const [coverageBps, staleSecs, revertOnStale] = navResult.value;
    const coverageNum = Number(coverageBps);
    const coveragePct = formatBps(coverageBps);
    const MIN_COVERAGE_BPS = 10_500;
    navEngine_ok = coverageNum >= MIN_COVERAGE_BPS;
    navEngineData = {
      ok: navEngine_ok,
      coverageRatioBps: coverageNum,
      coverageRatioPct: coveragePct,
      oracleStaleSecs: Number(staleSecs),
      revertOnStaleOracle: revertOnStale,
      alert: navEngine_ok ? null : `Coverage ${coveragePct} is below minimum 105.00%`,
    };
  } else {
    navEngineData = {
      ok: false,
      error: navResult.reason?.shortMessage || navResult.reason?.message || 'On-chain call failed',
      alert: 'NAVEngine call failed — possible stale oracle. Investigate immediately.',
    };
  }

  // ── PAXG buffer ───────────────────────────────────────────────────────────
  let paxgData: Record<string, unknown> = {};
  if (paxgResult.status === 'fulfilled') {
    const balanceFormatted = parseFloat(ethers.formatUnits(paxgResult.value, 18));
    const paxg_ok = balanceFormatted >= PAXG_MIN;
    paxgData = {
      ok: paxg_ok,
      balancePaxg: balanceFormatted.toFixed(6),
      minimumPaxg: PAXG_MIN,
      deployerAddress: DEPLOYER,
      alert: paxg_ok ? null : `PAXG buffer ${balanceFormatted.toFixed(6)} is below minimum ${PAXG_MIN}. Top up immediately.`,
    };
  } else {
    paxgData = {
      ok: false,
      error: paxgResult.reason?.message || 'PAXG balance call failed',
      alert: 'Cannot read PAXG buffer. Verify RPC connectivity.',
    };
  }

  // ── Solvency snapshot freshness ───────────────────────────────────────────
  let snapshotData: Record<string, unknown> = {};
  if (snapshotResult.status === 'fulfilled') {
    const { ts, checksum, notes } = snapshotResult.value;
    if (ts) {
      const ageMs = now.getTime() - ts.getTime();
      const ageMin = ageMs / 60_000;
      const fresh = ageMin <= SNAPSHOT_MAX_AGE_MIN;
      snapshotData = {
        ok: fresh,
        snapshotTimestamp: ts.toISOString(),
        ageMinutes: Math.round(ageMin * 10) / 10,
        maxAgeMinutes: SNAPSHOT_MAX_AGE_MIN,
        checksum,
        alert: fresh ? null : `Solvency snapshot is ${ageMin.toFixed(1)} min old (max ${SNAPSHOT_MAX_AGE_MIN} min). Cron may not be running.`,
      };
    } else {
      snapshotData = {
        ok: false,
        error: 'Could not parse snapshot timestamp from notes',
        notes,
        alert: 'Cannot determine snapshot freshness. Check solvency_snapshots table.',
      };
    }
  } else {
    snapshotData = {
      ok: false,
      error: snapshotResult.reason?.message || 'Snapshot DB query failed',
      alert: 'Solvency snapshot DB query failed. Check DATABASE_URL.',
    };
  }

  // ── Aggregate status ──────────────────────────────────────────────────────
  const allOk =
    (navEngineData.ok as boolean) &&
    (paxgData.ok as boolean) &&
    (snapshotData.ok as boolean);

  const alerts: string[] = [];
  if (navEngineData.alert)      alerts.push(navEngineData.alert as string);
  if (paxgData.alert)           alerts.push(paxgData.alert as string);
  if (snapshotData.alert)       alerts.push(snapshotData.alert as string);

  return res.status(200).json({
    status: allOk ? 'nominal' : 'degraded',
    polledAt: now.toISOString(),
    alerts,
    checks: {
      navEngine: navEngineData,
      paxgBuffer: paxgData,
      solvencySnapshot: snapshotData,
    },
  });
}
