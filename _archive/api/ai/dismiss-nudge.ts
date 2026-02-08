import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { nudgeId, walletAddress } = req.body;
  if (!nudgeId || !walletAddress) {
    return res.status(400).json({ error: 'Nudge ID and wallet address required' });
  }

  try {
    const userResult = await pool.query(
      `SELECT id FROM users WHERE LOWER(wallet_address) = LOWER($1)`,
      [walletAddress]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResult.rows[0].id;

    await pool.query(
      `INSERT INTO dismissed_nudges (user_id, nudge_id, dismissed_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, nudge_id) DO NOTHING`,
      [userId, nudgeId]
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Dismiss nudge error:', error);
    return res.status(500).json({ error: 'Failed to dismiss nudge' });
  }
}
