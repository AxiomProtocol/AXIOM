import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, wallet } = req.query;
    const groupId = parseInt(id as string);

    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const walletLower = (wallet as string).toLowerCase();

    const result = await pool.query(
      `SELECT g.id, g.created_by, g.member_count, u.wallet_address as creator_wallet
       FROM susu_purpose_groups g
       LEFT JOIN users u ON u.id = g.created_by
       WHERE g.id = $1`,
      [groupId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = result.rows[0];
    const creatorWallet = group.creator_wallet?.toLowerCase();
    let isOwner = creatorWallet === walletLower;

    const membersResult = await pool.query(
      `SELECT gm.*, u.wallet_address
       FROM susu_group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1`,
      [groupId]
    );
    const members = membersResult.rows;
    const memberCount = members.length;

    if (!isOwner && memberCount === 1) {
      const onlyMember = members[0];
      if (onlyMember.wallet_address?.toLowerCase() === walletLower) {
        isOwner = true;
      }
    }

    if (!isOwner && memberCount === 0 && !group.created_by) {
      const userCheck = await pool.query(
        `SELECT id FROM users WHERE LOWER(wallet_address) = $1`,
        [walletLower]
      );
      if (userCheck.rows.length > 0) {
        isOwner = true;
      }
    }

    res.status(200).json({ 
      success: true, 
      isOwner,
      memberCount,
      canDelete: isOwner && memberCount <= 1
    });
  } catch (error: any) {
    console.error('Error checking group owner:', error);
    res.status(500).json({ error: error.message || 'Failed to check owner' });
  }
}
