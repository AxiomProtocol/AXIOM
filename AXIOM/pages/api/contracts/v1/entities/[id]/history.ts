import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  }

  try {
    const rawId = req.query.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'id is required' });
    }
    const result = await pool.query(
      `SELECT * FROM contract_status_history WHERE contract_entity_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [id]
    );
    return res.status(200).json(result.rows);
  } catch (error: any) {
    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to load contract status history',
      details: error?.message || String(error),
    });
  }
}
