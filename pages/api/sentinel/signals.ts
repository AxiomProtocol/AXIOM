import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { requireActiveSubscription } from '../../../lib/sentinel/walletAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const authCheck = await requireActiveSubscription(req);
  if (!authCheck.ok) {
    return res.status(authCheck.status).json({ success: false, error: authCheck.error });
  }

  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const assetType = req.query.assetType as string | undefined;
    const direction = req.query.direction as string | undefined;
    const qualified = req.query.qualified as string | undefined;

    const conditions: string[] = [];
    const params: unknown[] = [];
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
      params,
    );
    const total = parseInt(countResult.rows[0].total as string);
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    const dataResult = await pool.query(
      `SELECT * FROM sentinel_signals ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset],
    );

    return res.status(200).json({
      signals: dataResult.rows,
      pagination: { page, limit, total, totalPages },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[sentinel/signals] Error:', err);
    return res.status(500).json({ success: false, error: message });
  }
}
