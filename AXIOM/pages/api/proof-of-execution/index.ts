import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [
      opsLog,
      solvencySnaps,
      hashChain,
      outcomes,
      reDeals,
      inspections,
      offerings,
      capSnaps,
    ] = await Promise.all([
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
      pool.query(`
        SELECT id, deal_name, strategy, status, target_purchase_price, notes, created_at, updated_at
        FROM re_deals
        ORDER BY created_at DESC
        LIMIT 50
      `),
      pool.query(`
        SELECT id, session_name, status, property_type, sampling_confidence_score,
               total_units, units_walked, submitted_at, reviewed_at, created_at
        FROM field_inspection_sessions
        ORDER BY created_at DESC
        LIMIT 20
      `),
      pool.query(`
        SELECT id, name, status, offering_type, target_raise, minimum_investment,
               projected_irr, projected_cap_rate, hold_period_years,
               open_date, close_date, created_at
        FROM syn_offerings
        ORDER BY created_at DESC
        LIMIT 20
      `),
      pool.query(`
        SELECT id, as_of, checksum, regime_band, policy_state, confidence, created_at
        FROM cap_snapshots
        ORDER BY created_at DESC
        LIMIT 5
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
      latestTreasury = payload?.treasury ?? payload?.totalTreasury ?? payload?.treasuryTotalUsd ?? null;
      latestCR = payload?.coverageRatio ?? payload?.cr ?? null;
      latestPolicyMode = payload?.policyMode ?? null;
    }

    const categoryMap: Record<string, number> = {};
    for (const row of opsLog.rows) {
      const cat = row.category ?? 'General';
      categoryMap[cat] = (categoryMap[cat] ?? 0) + 1;
    }

    const dealsByStrategy: Record<string, number> = {};
    const dealsByStatus: Record<string, number> = {};
    for (const row of reDeals.rows) {
      const strat = row.strategy ?? 'unknown';
      const stat = row.status ?? 'unknown';
      dealsByStrategy[strat] = (dealsByStrategy[strat] ?? 0) + 1;
      dealsByStatus[stat] = (dealsByStatus[stat] ?? 0) + 1;
    }

    const latestCapSnap = capSnaps.rows[0] ?? null;

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
        realAssets: reDeals.rows,
        fieldInspections: inspections.rows,
        syndication: offerings.rows,
        capitalSnapshots: capSnaps.rows,
      },
      summary: {
        totalOpsEntries: opsLog.rows.length,
        totalSolvencySnapshots: solvencySnaps.rows.length,
        totalHashChainEntries: hashChain.rows.length,
        totalVerifiedOutcomes: outcomes.rows.length,
        totalDeals: reDeals.rows.length,
        totalInspections: inspections.rows.length,
        totalOfferings: offerings.rows.length,
        totalCapSnapshots: capSnaps.rows.length,
        latestSnapshotId: latestSnap?.id ?? null,
        latestSnapshotTime: latestSnap?.as_of_utc ?? null,
        latestTreasury,
        latestCR,
        latestPolicyMode,
        categoryBreakdown: categoryMap,
        dealsByStrategy,
        dealsByStatus,
        latestCapSnapshot: latestCapSnap
          ? {
              id: latestCapSnap.id,
              asOf: latestCapSnap.as_of,
              checksum: latestCapSnap.checksum,
              regimeBand: latestCapSnap.regime_band,
              policyState: latestCapSnap.policy_state,
              confidence: latestCapSnap.confidence,
            }
          : null,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[proof-of-execution] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
