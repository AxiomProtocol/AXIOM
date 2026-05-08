import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { validateAdminKey } from '@/src/config/adminRoles';
import { ALLOCATION_ASSETS, normalizeWeights, weightsSum, type AllocationWeights } from '@/lib/allocation/assets';

let _pool: Pool | null = null;
const pool = () => (_pool ??= new Pool({ connectionString: process.env.DATABASE_URL }));

interface PolicyRow {
  scope: 'driver' | 'treasury';
  share_pct: number;
  weights: AllocationWeights;
  updated_at: string;
  updated_by: string | null;
}

const DEFAULT_POLICIES: PolicyRow[] = [
  {
    scope: 'driver',
    share_pct: 80,
    weights: { kag: 0, axau: 10, paxg: 0, usdc: 10, wbtc: 0, axusd: 15, cbeth: 0, cash_reserve: 25, operating_spend: 40 },
    updated_at: new Date().toISOString(),
    updated_by: 'system_default',
  },
  {
    scope: 'treasury',
    share_pct: 20,
    weights: { kag: 15, axau: 30, paxg: 20, usdc: 0, wbtc: 5, axusd: 20, cbeth: 10, cash_reserve: 0, operating_spend: 0 },
    updated_at: new Date().toISOString(),
    updated_by: 'system_default',
  },
];

async function ensureTableAndDefaults(): Promise<PolicyRow[]> {
  const db = pool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS pilot_allocation_policies (
      scope        TEXT PRIMARY KEY,
      share_pct    NUMERIC(6,2) NOT NULL DEFAULT 50,
      weights      JSONB        NOT NULL DEFAULT '{}',
      updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_by   TEXT
    )
  `);
  await db.query(`
    INSERT INTO pilot_allocation_policies (scope, share_pct, weights, updated_at, updated_by)
    VALUES
      ('driver',   80, $1::jsonb, NOW(), 'system_default'),
      ('treasury', 20, $2::jsonb, NOW(), 'system_default')
    ON CONFLICT (scope) DO NOTHING
  `, [
    JSON.stringify(DEFAULT_POLICIES[0].weights),
    JSON.stringify(DEFAULT_POLICIES[1].weights),
  ]);
  const r = await db.query<PolicyRow>(
    `SELECT scope, share_pct::float AS share_pct, weights, updated_at, updated_by
     FROM pilot_allocation_policies ORDER BY scope`,
  );
  return r.rows;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized — x-admin-key required' });
  }
  try {
    if (req.method === 'GET') {
      let rows: PolicyRow[];
      try {
        const r = await pool().query<PolicyRow>(
          `SELECT scope, share_pct::float AS share_pct, weights, updated_at, updated_by
           FROM pilot_allocation_policies ORDER BY scope`,
        );
        rows = r.rows.length > 0 ? r.rows : await ensureTableAndDefaults();
      } catch {
        rows = await ensureTableAndDefaults();
      }
      return res.status(200).json({ success: true, data: rows, assets: ALLOCATION_ASSETS });
    }

    if (req.method === 'PUT') {
      const body = (req.body ?? {}) as { driver?: { share_pct?: unknown; weights?: unknown }; treasury?: { share_pct?: unknown; weights?: unknown } };
      const driverShare   = Number(body.driver?.share_pct);
      const treasuryShare = Number(body.treasury?.share_pct);
      if (!Number.isFinite(driverShare) || !Number.isFinite(treasuryShare)) {
        return res.status(400).json({ success: false, error: 'driver.share_pct and treasury.share_pct are required numbers' });
      }
      if (Math.abs((driverShare + treasuryShare) - 100) > 0.5) {
        return res.status(400).json({ success: false, error: `Driver + Treasury shares must sum to 100 (got ${driverShare + treasuryShare})` });
      }
      const driverWeights   = normalizeWeights(body.driver?.weights);
      const treasuryWeights = normalizeWeights(body.treasury?.weights);
      for (const [scope, w] of [['driver', driverWeights], ['treasury', treasuryWeights]] as const) {
        const sum = weightsSum(w);
        if (Math.abs(sum - 100) > 0.5 && sum !== 0) {
          return res.status(400).json({ success: false, error: `${scope} weights must sum to 100 (got ${sum})` });
        }
      }
      await ensureTableAndDefaults();
      const db = pool();
      await db.query('BEGIN');
      try {
        await db.query(
          `UPDATE pilot_allocation_policies SET share_pct=$1, weights=$2::jsonb, updated_at=NOW(), updated_by=$3 WHERE scope='driver'`,
          [driverShare, JSON.stringify(driverWeights), 'admin'],
        );
        await db.query(
          `UPDATE pilot_allocation_policies SET share_pct=$1, weights=$2::jsonb, updated_at=NOW(), updated_by=$3 WHERE scope='treasury'`,
          [treasuryShare, JSON.stringify(treasuryWeights), 'admin'],
        );
        await db.query('COMMIT');
      } catch (e) {
        await db.query('ROLLBACK');
        throw e;
      }
      const r = await db.query<PolicyRow>(
        `SELECT scope, share_pct::float AS share_pct, weights, updated_at, updated_by
         FROM pilot_allocation_policies ORDER BY scope`,
      );
      return res.status(200).json({ success: true, data: r.rows });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Policy lookup failed';
    console.error('[allocation-policy]', msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
