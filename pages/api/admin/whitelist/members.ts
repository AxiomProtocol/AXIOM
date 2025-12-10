import type { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../../lib/adminAuth';
import { pool } from '../../../../lib/db';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          id, email, wallet_address, country, investment_interest,
          source, created_at, confirmed, unsubscribed,
          airdrop_status, airdrop_amount, airdrop_tx_hash
        FROM tge_notifications 
        WHERE unsubscribed = false OR unsubscribed IS NULL
        ORDER BY created_at DESC
      `);

      res.status(200).json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching whitelist members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
}

export default withAdminAuth(handler);
