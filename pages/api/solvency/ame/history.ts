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
    const metricKey = String(req.query.metricKey || 'RS');
    const rawLimit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);

    const result = await pool.query(
      `SELECT id, evaluation_id, metric_key, value, ts
       FROM ame_metrics_timeseries
       WHERE metric_key = $1
       ORDER BY ts DESC
       LIMIT $2`,
      [metricKey, rawLimit]
    );

    const points = result.rows.map((row: any) => ({
      ts: row.ts,
      metricKey: row.metric_key,
      value: Number(row.value),
      evaluationId: row.evaluation_id,
    }));

    return res.status(200).json({
      schemaVersion: 'ame-history-v1',
      dataStatus: 'ok',
      points,
      metricKey,
      count: points.length,
    });
  } catch (error: any) {
    console.error('[solvency/ame/history] Error:', error);
    return res.status(200).json({
      schemaVersion: 'ame-history-v1',
      dataStatus: 'empty',
      points: [],
      metricKey: String(req.query.metricKey || 'RS'),
      count: 0,
    });
  }
}
