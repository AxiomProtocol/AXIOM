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
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const dataResult = await pool.query(
      `SELECT * FROM sentinel_regime_snapshots
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );

    return res.status(200).json({
      regimes: dataResult.rows,
      current: dataResult.rows[0] || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[sentinel/regimes] Error:', err);
    return res.status(500).json({ success: false, error: message });
  }
}
