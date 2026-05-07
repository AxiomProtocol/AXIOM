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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized — x-admin-key required' });
  }
  try {
    if (req.method === 'GET') {
      const r = await pool().query<PolicyRow>(`SELECT scope, share_pct::float AS share_pct, weights, updated_at, updated_by FROM pilot_allocation_policies ORDER BY scope`);
      return res.status(200).json({ success: true, data: r.rows, assets: ALLOCATION_ASSETS });
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
      await pool().query('BEGIN');
      try {
        await pool().query(
          `UPDATE pilot_allocation_policies SET share_pct=$1, weights=$2::jsonb, updated_at=NOW(), updated_by=$3 WHERE scope='driver'`,
          [driverShare, JSON.stringify(driverWeights), 'admin'],
        );
        await pool().query(
          `UPDATE pilot_allocation_policies SET share_pct=$1, weights=$2::jsonb, updated_at=NOW(), updated_by=$3 WHERE scope='treasury'`,
          [treasuryShare, JSON.stringify(treasuryWeights), 'admin'],
        );
        await pool().query('COMMIT');
      } catch (e) {
        await pool().query('ROLLBACK');
        throw e;
      }
      const r = await pool().query<PolicyRow>(`SELECT scope, share_pct::float AS share_pct, weights, updated_at, updated_by FROM pilot_allocation_policies ORDER BY scope`);
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
