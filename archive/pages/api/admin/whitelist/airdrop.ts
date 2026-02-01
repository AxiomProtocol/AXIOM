import type { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../../lib/adminAuth';
import { pool } from '../../../../lib/db';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { memberIds, status, amount, txHash } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'No members selected' });
    }

    if (!status || !['pending', 'completed', 'none'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const client = await pool.connect();
    try {
      const placeholders = memberIds.map((_, i) => `$${i + 4}`).join(',');
      
      await client.query(`
        UPDATE tge_notifications 
        SET 
          airdrop_status = $1,
          airdrop_amount = $2,
          airdrop_tx_hash = $3
        WHERE id IN (${placeholders})
      `, [
        status === 'none' ? null : status,
        amount || null,
        txHash || null,
        ...memberIds
      ]);

      res.status(200).json({ 
        success: true, 
        message: `Updated ${memberIds.length} members` 
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating airdrop status:', error);
    res.status(500).json({ error: 'Failed to update airdrop status' });
  }
}

export default withAdminAuth(handler);
