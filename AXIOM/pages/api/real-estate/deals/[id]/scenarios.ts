import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';
import { successResponse, errorResponse, buildMeta } from '../../../../../server/services/real-estate/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return errorResponse(res, 400, 'INVALID_ID', 'Deal ID is required');
  }

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT id, deal_id, scenario_name, description, is_primary, created_at, updated_at
         FROM re_deal_scenarios WHERE deal_id = $1 ORDER BY created_at DESC`,
        [id]
      );
      return successResponse(res, { scenarios: result.rows }, buildMeta(['internal_db'], 0.7));
    } catch (err: any) {
      console.error('Scenarios list error:', err.message);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to list scenarios');
    }
  }

  if (req.method === 'POST') {
    try {
      const { scenarioName, description, isPrimary } = req.body;

      const dealCheck = await pool.query(`SELECT id FROM re_deals WHERE id = $1`, [id]);
      if (dealCheck.rows.length === 0) {
        return errorResponse(res, 404, 'DEAL_NOT_FOUND', 'Deal does not exist');
      }

      const idResult = await pool.query(`SELECT gen_random_uuid() as new_id`);
      const newId = idResult.rows[0].new_id;

      await pool.query(
        `INSERT INTO re_deal_scenarios (id, deal_id, scenario_name, description, is_primary, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, now(), now())`,
        [newId, id, scenarioName || 'Base Case', description || null, isPrimary === true]
      );
      const result = await pool.query(
        `SELECT id, deal_id, scenario_name, description, is_primary, created_at, updated_at
         FROM re_deal_scenarios WHERE id = $1`,
        [newId]
      );

      return successResponse(res, { scenario: result.rows[0] }, buildMeta(['internal_db', 'user_input'], 0.7));
    } catch (err: any) {
      console.error('Scenario create error:', err.message);
      return errorResponse(res, 500, 'INTERNAL_ERROR', `Failed to create scenario: ${err.message}`);
    }
  }

  return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET and POST are accepted');
}
