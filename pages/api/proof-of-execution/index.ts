import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [opsLog, solvencySnaps, hashChain, outcomes] = await Promise.all([
      pool.query(`
        SELECT week, phase, category, title, description, status, tx_hash, amount, created_at, protocol_change
        FROM founder_ops_log
        ORDER BY created_at DESC
        LIMIT 50
      `),
      pool.query(`
        SELECT id, as_of_utc, checksum, payload_json
        FROM solvency_snapshots
        ORDER BY created_at DESC
        LIMIT 10
      `),
      pool.query(`
        SELECT event_id, event_type, entity_type, hash, prev_hash, created_at
        FROM gef_audit_hash_chain
        ORDER BY created_at DESC
        LIMIT 20
      `),
      pool.query(`
        SELECT status, verification_timestamp, arbitrum_outcome_hash,
               arbitrum_proof_ref, interpretation, submitted_at, reviewed_at
        FROM verified_project_outcomes
        ORDER BY created_at DESC
        LIMIT 10
      `),
    ]);

    const latestSnap = solvencySnaps.rows[0] ?? null;
    let latestTreasury: number | null = null;
    let latestCR: number | null = null;
    let latestPolicyMode: string | null = null;

    if (latestSnap) {
      const payload = typeof latestSnap.payload_json === 'string'
        ? JSON.parse(latestSnap.payload_json)
        : latestSnap.payload_json;
      latestTreasury = payload?.treasury ?? payload?.totalTreasury ?? null;
      latestCR = payload?.coverageRatio ?? payload?.cr ?? null;
      latestPolicyMode = payload?.policyMode ?? null;
    }

    const categoryMap: Record<string, typeof opsLog.rows> = {};
    for (const row of opsLog.rows) {
      const cat = row.category ?? 'General';
      if (!categoryMap[cat]) categoryMap[cat] = [];
      categoryMap[cat].push(row);
    }

    return res.status(200).json({
      rails: {
        opsLog: opsLog.rows,
        solvencySnapshots: solvencySnaps.rows.map(r => ({
          id: r.id,
          asOfUtc: r.as_of_utc,
          checksum: r.checksum,
        })),
        hashChain: hashChain.rows,
        verifiedOutcomes: outcomes.rows,
      },
      summary: {
        totalOpsEntries: opsLog.rows.length,
        totalSolvencySnapshots: solvencySnaps.rows.length,
        totalHashChainEntries: hashChain.rows.length,
        totalVerifiedOutcomes: outcomes.rows.length,
        latestSnapshotId: latestSnap?.id ?? null,
        latestSnapshotTime: latestSnap?.as_of_utc ?? null,
        latestTreasury,
        latestCR,
        latestPolicyMode,
        categoryBreakdown: Object.fromEntries(
          Object.entries(categoryMap).map(([k, v]) => [k, v.length])
        ),
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[proof-of-execution] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
