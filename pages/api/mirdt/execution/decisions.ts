import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = (page - 1) * limit;
  const grade = req.query.grade as string;
  const eligibility = req.query.eligibility as string;

  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 1;

    if (grade) {
      whereClause += ` AND grade = $${paramIdx++}`;
      params.push(grade);
    }
    if (eligibility) {
      whereClause += ` AND eligibility_status = $${paramIdx++}`;
      params.push(eligibility);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM mirdt_execution_decisions ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT * FROM mirdt_execution_decisions ${whereClause} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    return res.status(200).json({
      decisions: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err: any) {
    console.error('[execution/decisions] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
