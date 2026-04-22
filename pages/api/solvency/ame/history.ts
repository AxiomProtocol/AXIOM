import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM ame_metric_snapshot`
    );
    const total = Number(countResult.rows[0].total);

    const result = await pool.query(
      `SELECT
        id, created_at, environment, version,
        treasury_total_usd, treasury_liquid_usd,
        designated_reserves_usd, loss_buffer_usd,
        net_external_exposure_usd, circulating_exposure_usd,
        coverage_ratio, reserve_ratio,
        liquidity_stability_ratio, redemption_stress_ratio,
        volatility_pressure_index, stability_score,
        policy_mode
      FROM ame_metric_snapshot
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const snapshots = result.rows.map((row: any) => ({
      id: row.id,
      createdAt: row.created_at,
      environment: row.environment,
      version: row.version,
      treasuryTotalUsd: Number(row.treasury_total_usd),
      treasuryLiquidUsd: Number(row.treasury_liquid_usd),
      designatedReservesUsd: Number(row.designated_reserves_usd),
      lossBufferUsd: Number(row.loss_buffer_usd),
      netExternalExposureUsd: Number(row.net_external_exposure_usd),
      circulatingExposureUsd: Number(row.circulating_exposure_usd),
      coverageRatio: Number(row.coverage_ratio),
      reserveRatio: Number(row.reserve_ratio),
      liquidityStabilityRatio: Number(row.liquidity_stability_ratio),
      redemptionStressRatio: Number(row.redemption_stress_ratio),
      volatilityPressureIndex: Number(row.volatility_pressure_index),
      stabilityScore: Number(row.stability_score),
      policyMode: row.policy_mode,
    }));

    return res.status(200).json({
      schemaVersion: 'ame-history-v2',
      dataStatus: snapshots.length > 0 ? 'ok' : 'empty',
      snapshots,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    console.error('[solvency/ame/history] Error:', error);
    return res.status(500).json({
      schemaVersion: 'ame-history-v2',
      dataStatus: 'error',
      error: 'Failed to fetch AME history',
      snapshots: [],
      pagination: { total: 0, limit: 50, offset: 0, hasMore: false },
    });
  }
}
