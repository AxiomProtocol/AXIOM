import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await pool.connect();
    try {
      const [totalResult, todayResult, weekResult] = await Promise.all([
        client.query('SELECT COUNT(*) as count FROM tge_notifications WHERE unsubscribed = false'),
        client.query(`SELECT COUNT(*) as count FROM tge_notifications WHERE unsubscribed = false AND created_at >= NOW() - INTERVAL '24 hours'`),
        client.query(`SELECT COUNT(*) as count FROM tge_notifications WHERE unsubscribed = false AND created_at >= NOW() - INTERVAL '7 days'`)
      ]);

      res.json({
        total: parseInt(totalResult.rows[0].count) || 0,
        today: parseInt(todayResult.rows[0].count) || 0,
        thisWeek: parseInt(weekResult.rows[0].count) || 0
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching TGE stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
