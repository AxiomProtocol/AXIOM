import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const groupId = parseInt(id as string);

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT v.*, 
                voucher.first_name as voucher_first_name, voucher.username as voucher_username,
                vouchee.first_name as vouchee_first_name, vouchee.username as vouchee_username
         FROM susu_vouches v
         LEFT JOIN users voucher ON voucher.id = v.voucher_user_id
         LEFT JOIN users vouchee ON vouchee.id = v.vouchee_user_id
         WHERE v.group_id = $1 OR v.group_id IS NULL
         ORDER BY v.created_at DESC`,
        [groupId]
      );

      const vouchCounts = await pool.query(
        `SELECT vouchee_user_id, COUNT(*) as vouch_count
         FROM susu_vouches
         WHERE group_id = $1 OR group_id IS NULL
         GROUP BY vouchee_user_id`,
        [groupId]
      );

      res.status(200).json({ 
        success: true, 
        vouches: result.rows,
        vouchCounts: vouchCounts.rows
      });
    } catch (error: any) {
      console.error('Error fetching vouches:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { walletAddress, voucheeUserId, message } = req.body;
      
      const userResult = await pool.query(
        'SELECT id FROM users WHERE LOWER(wallet_address) = LOWER($1)',
        [walletAddress]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(400).json({ error: 'User not found' });
      }

      const voucherId = userResult.rows[0].id;

      if (voucherId === voucheeUserId) {
        return res.status(400).json({ error: 'You cannot vouch for yourself' });
      }

      const existingVouch = await pool.query(
        'SELECT id FROM susu_vouches WHERE voucher_user_id = $1 AND vouchee_user_id = $2 AND (group_id = $3 OR group_id IS NULL)',
        [voucherId, voucheeUserId, groupId]
      );

      if (existingVouch.rows.length > 0) {
        return res.status(400).json({ error: 'You have already vouched for this member' });
      }

      const result = await pool.query(
        `INSERT INTO susu_vouches (voucher_user_id, vouchee_user_id, group_id, message)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [voucherId, voucheeUserId, groupId, message]
      );

      res.status(201).json({ success: true, vouch: result.rows[0] });
    } catch (error: any) {
      console.error('Error creating vouch:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
