import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const groupId = parseInt(id as string);

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT m.*, u.username, u.first_name, u.last_name, u.profile_image_url
         FROM susu_messages m
         LEFT JOIN users u ON u.id = m.user_id
         WHERE m.group_id = $1
         ORDER BY m.is_pinned DESC, m.created_at DESC
         LIMIT 50`,
        [groupId]
      );

      res.status(200).json({ success: true, messages: result.rows });
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { walletAddress, content, messageType } = req.body;
      
      const userResult = await pool.query(
        'SELECT id FROM users WHERE LOWER(wallet_address) = LOWER($1)',
        [walletAddress]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(400).json({ error: 'User not found' });
      }

      const memberCheck = await pool.query(
        'SELECT role FROM susu_group_members WHERE group_id = $1 AND user_id = $2',
        [groupId, userResult.rows[0].id]
      );

      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: 'You must be a group member to post messages' });
      }

      const result = await pool.query(
        `INSERT INTO susu_messages (group_id, user_id, content, message_type)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [groupId, userResult.rows[0].id, content, messageType || 'message']
      );

      res.status(201).json({ success: true, message: result.rows[0] });
    } catch (error: any) {
      console.error('Error creating message:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
