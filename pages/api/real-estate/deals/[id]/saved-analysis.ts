import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: { code: 'INVALID_ID', message: 'Deal ID is required' } });
  }

  if (req.method === 'GET') {
    try {
      const scenarioId = req.query.scenarioId as string;
      let result;
      if (scenarioId) {
        result = await pool.query(
          `SELECT analysis_data, saved_at FROM re_saved_analysis
           WHERE deal_id = $1 AND scenario_id = $2
           ORDER BY saved_at DESC LIMIT 1`,
          [id, scenarioId]
        );
      } else {
        result = await pool.query(
          `SELECT analysis_data, saved_at FROM re_saved_analysis
           WHERE deal_id = $1
           ORDER BY saved_at DESC LIMIT 1`,
          [id]
        );
      }

      if (result.rows.length === 0) {
        return res.status(200).json({ data: null });
      }

      return res.status(200).json({
        data: {
          analysis: result.rows[0].analysis_data,
          savedAt: result.rows[0].saved_at,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }

  if (req.method === 'POST') {
    try {
      const { scenarioId, analysis } = req.body;
      if (!scenarioId || !analysis) {
        return res.status(400).json({ error: { code: 'INVALID_PARAMS', message: 'scenarioId and analysis are required' } });
      }

      await pool.query(
        `DELETE FROM re_saved_analysis WHERE deal_id = $1 AND scenario_id = $2`,
        [id, scenarioId]
      );

      await pool.query(
        `INSERT INTO re_saved_analysis (deal_id, scenario_id, analysis_data)
         VALUES ($1, $2, $3)`,
        [id, scenarioId, JSON.stringify(analysis)]
      );

      return res.status(200).json({ data: { saved: true, savedAt: new Date().toISOString() } });
    } catch (err: any) {
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }

  return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'GET or POST only' } });
}
