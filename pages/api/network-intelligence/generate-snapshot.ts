import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';
import { getSIWESession } from '../../../lib/middleware/siweAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = await getSIWESession(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Wallet authentication required.', code: 'SIWE_AUTH_REQUIRED' });
  }

  try {
    const signalsResult = await pool.query(`
      SELECT
        strategy_type,
        market,
        capex_per_unit,
        confidence,
        sample_size
      FROM market_cost_signals
      WHERE capex_per_unit IS NOT NULL
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

    interface GroupKey { strategy_type: string; market: string }
    interface GroupAccum {
      capexWeightedSum: number;
      confidenceWeightedSum: number;
      totalSamples: number;
      signalCount: number;
    }

    const groupMap = new Map<string, GroupAccum>();

    for (const row of rows) {
      const key = `${row.strategy_type || ''}||${row.market || 'global'}`;
      const sample = parseInt(row.sample_size) || 1;
      const capex = parseFloat(row.capex_per_unit) || 0;
      const conf = parseFloat(row.confidence) || 0;

      if (!groupMap.has(key)) {
        groupMap.set(key, { capexWeightedSum: 0, confidenceWeightedSum: 0, totalSamples: 0, signalCount: 0 });
      }
      const g = groupMap.get(key)!;
      g.capexWeightedSum += capex * sample;
      g.confidenceWeightedSum += conf * sample;
      g.totalSamples += sample;
      g.signalCount += 1;
    }

    const aggregatedSignals: Array<{
      strategy_type: string;
      market: string;
      avg_capex_per_unit: number | null;
      avg_confidence: number;
      total_sample_size: number;
      signal_count: number;
    }> = [];

    let networkWeightedConfidenceSum = 0;
    let networkTotalSamples = 0;

    for (const [key, g] of groupMap.entries()) {
      const [strategyType, market] = key.split('||');
      const avgCapex = g.totalSamples > 0 ? Math.round((g.capexWeightedSum / g.totalSamples) * 100) / 100 : null;
      const avgConf = g.totalSamples > 0 ? Math.round((g.confidenceWeightedSum / g.totalSamples) * 10000) / 10000 : 0;

      aggregatedSignals.push({
        strategy_type: strategyType,
        market: market || 'global',
        avg_capex_per_unit: avgCapex,
        avg_confidence: avgConf,
        total_sample_size: g.totalSamples,
        signal_count: g.signalCount,
      });

      networkWeightedConfidenceSum += avgConf * g.totalSamples;
      networkTotalSamples += g.totalSamples;
    }

    const overallConfidence = networkTotalSamples > 0
      ? Math.round((networkWeightedConfidenceSum / networkTotalSamples) * 10000) / 10000
      : 0;

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
      groupCount: aggregatedSignals.length,
      totalSampleSize: networkTotalSamples,
      overallConfidence,
    });
  } catch (error: any) {
    console.error('[network-intelligence/generate-snapshot] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
