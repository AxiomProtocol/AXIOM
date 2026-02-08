import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.method === 'GET') {
    try {
      const { unread } = req.query;
      let query = `
        SELECT 
          n.id,
          n.type,
          n.title,
          n.message,
          n.action_url,
          n.read,
          n.priority,
          n.created_at,
          cc.title as campaign_title,
          lap.name as pool_name
        FROM investor_notifications n
        LEFT JOIN crowdfunding_campaigns cc ON n.campaign_id = cc.id
        LEFT JOIN land_acquisition_pools lap ON n.pool_id = lap.id
        WHERE n.user_id = $1
      `;
      
      if (unread === 'true') {
        query += ` AND n.read = false`;
      }
      
      query += ` ORDER BY n.created_at DESC LIMIT 50`;

      const result = await pool.query(query, [userId]);

      res.status(200).json({
        success: true,
        data: {
          notifications: result.rows.map((n: any) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            actionUrl: n.action_url,
            read: n.read,
            priority: n.priority,
            campaignTitle: n.campaign_title,
            poolName: n.pool_name,
            createdAt: n.created_at,
          })),
        },
      });
    } catch (error) {
      console.error('Notifications fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  } else if (req.method === 'PUT') {
    const { notificationIds, markAllRead } = req.body;

    try {
      if (markAllRead) {
        await pool.query(`
          UPDATE investor_notifications 
          SET read = true, read_at = NOW() 
          WHERE user_id = $1 AND read = false
        `, [userId]);
      } else if (notificationIds && notificationIds.length > 0) {
        await pool.query(`
          UPDATE investor_notifications 
          SET read = true, read_at = NOW() 
          WHERE id = ANY($1) AND user_id = $2
        `, [notificationIds, userId]);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Notification update error:', error);
      res.status(500).json({ error: 'Failed to update notifications' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
