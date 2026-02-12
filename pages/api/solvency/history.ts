import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import type { HistoryPoint } from '../../../lib/solvency';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  try {
    const rawLimit = Math.min(Math.max(parseInt(String(req.query.limit || '30'), 10) || 30, 1), 365);
    const rawOffset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);

    const [countResult, dataResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM solvency_snapshots`),
      pool.query(
        `SELECT id, as_of_utc, payload_json FROM solvency_snapshots ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [rawLimit, rawOffset]
      ),
    ]);

    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    const points: HistoryPoint[] = dataResult.rows.map((row: any) => {
      const payload = typeof row.payload_json === 'string'
        ? JSON.parse(row.payload_json)
        : row.payload_json;

      const treasuryTotalUsd = Math.round(Number(payload.treasuryTotalUsd || 0) * 100) / 100;
      const reservesTotalUsd = Math.round(Number(payload.reservesTotalUsd || 0) * 100) / 100;
      const liabilitiesTotalUsd = Math.round(Number(payload.liabilitiesTotalUsd || 0) * 100) / 100;

      const coverageRatio = liabilitiesTotalUsd > 0
        ? Math.round(((treasuryTotalUsd + reservesTotalUsd) / liabilitiesTotalUsd) * 10000) / 10000
        : 0;

      const reserveRatio = liabilitiesTotalUsd > 0
        ? Math.round((reservesTotalUsd / liabilitiesTotalUsd) * 10000) / 10000
        : 0;

      return {
        asOfUtc: new Date(row.as_of_utc).toISOString(),
        treasuryTotalUsd,
        reservesTotalUsd,
        liabilitiesTotalUsd,
        coverageRatio,
        reserveRatio,
        policyMode: String(payload.policyMode || 'NORMAL'),
      };
    });

    return res.status(200).json({
      schemaVersion: 'solvency-history-v1',
      count: points.length,
      total,
      points,
    });
  } catch (error: any) {
    console.error('[solvency/history] Error:', error);
    return res.status(200).json({
      schemaVersion: 'solvency-history-v1',
      count: 0,
      total: 0,
      points: [],
    });
  }
}
