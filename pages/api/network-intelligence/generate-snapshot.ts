import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const signalsResult = await pool.query(`
      SELECT
        strategy_type,
        market,
        ROUND(AVG(capex_per_unit)::numeric, 2)  AS avg_capex_per_unit,
        ROUND(AVG(confidence)::numeric, 4)       AS avg_confidence,
        SUM(sample_size)::int                    AS total_sample_size,
        COUNT(*)::int                            AS signal_count
      FROM market_cost_signals
      WHERE capex_per_unit IS NOT NULL
      GROUP BY strategy_type, market
      ORDER BY strategy_type, market
    `);

    const rows = signalsResult.rows;

    if (rows.length === 0) {
      const emptySnapshot = {
        snapshot_date: new Date().toISOString().split('T')[0],
        scope: 'global',
        aggregated_signals: [],
        confidence_score: 0,
      };

      const insertResult = await pool.query(
        `INSERT INTO network_intelligence_snapshots
           (snapshot_date, scope, aggregated_signals, confidence_score)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          emptySnapshot.snapshot_date,
          emptySnapshot.scope,
          JSON.stringify(emptySnapshot.aggregated_signals),
          emptySnapshot.confidence_score,
        ]
      );

      return res.status(200).json({
        success: true,
        snapshot: insertResult.rows[0],
        signalCount: 0,
        message: 'No market cost signals found — empty snapshot created',
      });
    }

    const totalSamples = rows.reduce((sum: number, r: any) => sum + (parseInt(r.total_sample_size) || 0), 0);
    const overallConfidence = totalSamples > 0
      ? rows.reduce((sum: number, r: any) => {
          const weight = (parseInt(r.total_sample_size) || 0) / totalSamples;
          return sum + weight * parseFloat(r.avg_confidence || '0');
        }, 0)
      : 0;

    const aggregatedSignals = rows.map((r: any) => ({
      strategy_type: r.strategy_type,
      market: r.market || 'global',
      avg_capex_per_unit: parseFloat(r.avg_capex_per_unit) || null,
      avg_confidence: parseFloat(r.avg_confidence) || 0,
      total_sample_size: parseInt(r.total_sample_size) || 0,
      signal_count: parseInt(r.signal_count) || 0,
    }));

    const snapshotDate = new Date().toISOString().split('T')[0];

    const insertResult = await pool.query(
      `INSERT INTO network_intelligence_snapshots
         (snapshot_date, scope, aggregated_signals, confidence_score)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        snapshotDate,
        'global',
        JSON.stringify(aggregatedSignals),
        overallConfidence.toFixed(4),
      ]
    );

    return res.status(200).json({
      success: true,
      snapshot: insertResult.rows[0],
      signalCount: rows.length,
      totalSampleSize: totalSamples,
    });
  } catch (error: any) {
    console.error('[network-intelligence/generate-snapshot] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
