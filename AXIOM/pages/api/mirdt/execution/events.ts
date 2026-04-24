import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = (page - 1) * limit;
  const eventType = req.query.eventType as string;
  const setupId = req.query.setupId as string;

  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 1;

    if (eventType) {
      whereClause += ` AND event_type = $${paramIdx++}`;
      params.push(eventType);
    }
    if (setupId) {
      whereClause += ` AND setup_id = $${paramIdx++}`;
      params.push(setupId);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM mirdt_execution_events ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT * FROM mirdt_execution_events ${whereClause} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    return res.status(200).json({
      events: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    console.error('[execution/events] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
