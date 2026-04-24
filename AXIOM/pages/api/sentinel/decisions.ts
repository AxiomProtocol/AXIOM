import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const decision = req.query.decision as string | undefined;
    const scope = req.query.scope as string | undefined;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (decision) {
      conditions.push(`decision = $${paramIdx++}`);
      params.push(decision);
    }

    if (scope) {
      conditions.push(`scope = $${paramIdx++}`);
      params.push(scope);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM sentinel_decisions ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    const dataResult = await pool.query(
      `SELECT * FROM sentinel_decisions ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    return res.status(200).json({
      decisions: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('[sentinel/decisions] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
