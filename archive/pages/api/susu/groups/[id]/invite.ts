import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const groupId = parseInt(id as string);

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT i.*, u.first_name, u.last_name, u.username as inviter_name
         FROM susu_invitations i
         LEFT JOIN users u ON u.id = i.invited_by
         WHERE i.group_id = $1 AND i.status != 'expired'
         ORDER BY i.created_at DESC`,
        [groupId]
      );

      res.status(200).json({ success: true, invitations: result.rows });
    } catch (error: any) {
      console.error('Error fetching invitations:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { walletAddress, inviteeName } = req.body;
      
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
        return res.status(403).json({ error: 'You must be a group member to create invites' });
      }

      const token = crypto.randomBytes(16).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const result = await pool.query(
        `INSERT INTO susu_invitations (group_id, invited_by, invitee_name, token, status, expires_at)
         VALUES ($1, $2, $3, $4, 'pending', $5)
         RETURNING *`,
        [groupId, userResult.rows[0].id, inviteeName || 'Someone', token, expiresAt]
      );

      const inviteLink = `${process.env.REPLIT_DEV_DOMAIN || 'https://axiom.city'}/susu/join/${token}`;

      res.status(201).json({ 
        success: true, 
        invitation: result.rows[0],
        inviteLink
      });
    } catch (error: any) {
      console.error('Error creating invitation:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
