import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';
import { successResponse, errorResponse, buildMeta, parseNumeric } from '../../../../../server/services/real-estate/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return errorResponse(res, 400, 'INVALID_ID', 'Deal ID is required');
  }

  if (req.method === 'GET') {
    try {
      const pageNum = Math.max(1, parseNumeric(req.query.page, 1));
      const limitNum = Math.min(100, Math.max(1, parseNumeric(req.query.limit, 20)));
      const offset = (pageNum - 1) * limitNum;

      const [countResult, entries] = await Promise.all([
        pool.query(`SELECT count(*) as total FROM re_decision_log WHERE deal_id = $1`, [id]),
        pool.query(
          `SELECT * FROM re_decision_log WHERE deal_id = $1 ORDER BY decided_at DESC LIMIT $2 OFFSET $3`,
          [id, limitNum, offset]
        ),
      ]);

      const total = Number(countResult.rows[0]?.total ?? 0);

      return successResponse(res, {
        entries: entries.rows,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      }, buildMeta(['internal_db'], 0.7));
    } catch (err: any) {
      console.error('Decision log fetch error:', err.message);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch decision log');
    }
  }

  if (req.method === 'POST') {
    try {
      const { decision, decidedBy, rationale, snapshotMetrics } = req.body;

      if (!decision || typeof decision !== 'string') {
        return errorResponse(res, 400, 'INVALID_PARAMS', 'decision is required');
      }

      const dealCheck = await pool.query(`SELECT id FROM re_deals WHERE id = $1`, [id]);
      if (dealCheck.rows.length === 0) {
        return errorResponse(res, 404, 'DEAL_NOT_FOUND', 'Deal does not exist');
      }

      const idResult = await pool.query(`SELECT gen_random_uuid() as new_id`);
      const newId = idResult.rows[0].new_id;

      await pool.query(
        `INSERT INTO re_decision_log (id, deal_id, decision, decided_by, rationale, snapshot_metrics, decided_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())`,
        [newId, id, decision, decidedBy || 'system', rationale || null, snapshotMetrics ? JSON.stringify(snapshotMetrics) : null]
      );
      const result = await pool.query(
        `SELECT id, deal_id, decision, decided_by, rationale, snapshot_metrics, decided_at
         FROM re_decision_log WHERE id = $1`,
        [newId]
      );

      return successResponse(res, { entry: result.rows[0] }, buildMeta(['internal_db', 'user_input'], 0.7));
    } catch (err: any) {
      console.error('Decision append error:', err.message);
      return errorResponse(res, 500, 'INTERNAL_ERROR', `Failed to append decision: ${err.message}`);
    }
  }

  return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET and POST are accepted');
}
