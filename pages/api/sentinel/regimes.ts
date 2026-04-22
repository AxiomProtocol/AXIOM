import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const dataResult = await pool.query(
      `SELECT * FROM sentinel_regime_snapshots
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    return res.status(200).json({
      regimes: dataResult.rows,
      current: dataResult.rows[0] || null,
    });
  } catch (error: any) {
    console.error('[sentinel/regimes] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
