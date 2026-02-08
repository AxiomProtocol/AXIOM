import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid setup ID is required' });
    }

    const setupResult = await pool.query(
      `SELECT * FROM mirdt_setups WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (setupResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Setup not found' });
    }

    const tradesResult = await pool.query(
      `SELECT * FROM mirdt_paper_trades WHERE setup_id = $1 ORDER BY opened_at DESC`,
      [id]
    );

    return res.status(200).json({
      setup: setupResult.rows[0],
      paperTrades: tradesResult.rows,
    });
  } catch (error: any) {
    console.error('[setup detail] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
