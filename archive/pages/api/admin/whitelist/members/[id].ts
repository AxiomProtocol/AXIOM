import type { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../../../lib/adminAuth';
import { pool } from '../../../../../lib/db';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'DELETE') {
    try {
      const client = await pool.connect();
      try {
        await client.query(
          'UPDATE tge_notifications SET unsubscribed = true, unsubscribed_at = NOW() WHERE id = $1',
          [id]
        );

        res.status(200).json({ success: true, message: 'Member removed' });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error removing member:', error);
      res.status(500).json({ error: 'Failed to remove member' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default withAdminAuth(handler);
