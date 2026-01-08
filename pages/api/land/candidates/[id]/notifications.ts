import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const candidateId = parseInt(id as string);

  if (isNaN(candidateId)) {
    return res.status(400).json({ success: false, error: 'Invalid candidate ID' });
  }

  if (req.method === 'GET') {
    const { userAddress } = req.query;

    if (!userAddress) {
      return res.status(400).json({ success: false, error: 'User address required' });
    }

    try {
      const result = await pool.query(
        `SELECT * FROM land_notification_preferences 
         WHERE user_address = $1 AND (land_candidate_id = $2 OR land_candidate_id IS NULL)`,
        [userAddress, candidateId]
      );

      const preferences = result.rows.reduce((acc, row) => {
        acc[row.notification_type] = row.is_enabled;
        return acc;
      }, {} as Record<string, boolean>);

      const isSubscribed = result.rows.some(r => r.land_candidate_id === candidateId && r.is_enabled);

      return res.status(200).json({
        success: true,
        data: {
          isSubscribed,
          preferences
        }
      });
    } catch (error) {
      console.error('Notifications fetch error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch preferences' });
    }
  }

  if (req.method === 'POST') {
    const { userAddress, notificationType, isEnabled = true } = req.body;

    if (!userAddress) {
      return res.status(400).json({ success: false, error: 'User address required' });
    }

    const type = notificationType || 'property_updates';

    try {
      const existing = await pool.query(
        `SELECT id FROM land_notification_preferences 
         WHERE user_address = $1 AND land_candidate_id = $2 AND notification_type = $3`,
        [userAddress, candidateId, type]
      );

      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE land_notification_preferences SET is_enabled = $1 WHERE id = $2`,
          [isEnabled, existing.rows[0].id]
        );
      } else {
        await pool.query(
          `INSERT INTO land_notification_preferences (user_address, land_candidate_id, notification_type, is_enabled)
           VALUES ($1, $2, $3, $4)`,
          [userAddress, candidateId, type, isEnabled]
        );
      }

      await pool.query(
        `INSERT INTO land_history (land_candidate_id, event_type, event_title, event_description, actor_address)
         VALUES ($1, 'notification_preference', $2, $3, $4)`,
        [
          candidateId,
          isEnabled ? 'Notification Subscription' : 'Notification Unsubscription',
          isEnabled ? 'Member subscribed to property updates' : 'Member unsubscribed from property updates',
          userAddress
        ]
      );

      return res.status(200).json({
        success: true,
        message: isEnabled ? 'Subscribed to updates' : 'Unsubscribed from updates'
      });
    } catch (error) {
      console.error('Notification preference error:', error);
      return res.status(500).json({ success: false, error: 'Failed to update preferences' });
    }
  }

  if (req.method === 'DELETE') {
    const { userAddress } = req.body;

    if (!userAddress) {
      return res.status(400).json({ success: false, error: 'User address required' });
    }

    try {
      await pool.query(
        `DELETE FROM land_notification_preferences WHERE user_address = $1 AND land_candidate_id = $2`,
        [userAddress, candidateId]
      );

      return res.status(200).json({ success: true, message: 'Unsubscribed from all property notifications' });
    } catch (error) {
      console.error('Notification delete error:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete preferences' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
