import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const assetType = req.query.assetType as string | undefined;
    const direction = req.query.direction as string | undefined;
    const qualified = req.query.qualified as string | undefined;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (assetType) {
      conditions.push(`asset_type = $${paramIdx++}`);
      params.push(assetType);
    }

    if (direction) {
      conditions.push(`direction = $${paramIdx++}`);
      params.push(direction);
    }

    if (qualified !== undefined) {
      conditions.push(`qualified = $${paramIdx++}`);
      params.push(qualified === 'true');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM sentinel_signals ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    const dataResult = await pool.query(
      `SELECT * FROM sentinel_signals ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    return res.status(200).json({
      signals: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('[sentinel/signals] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
