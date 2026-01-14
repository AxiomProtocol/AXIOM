import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const groupId = parseInt(id as string);

  if (req.method === 'GET') {
    return handleGet(groupId, res);
  } else if (req.method === 'DELETE') {
    return handleDelete(groupId, req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleDelete(groupId: number, req: NextApiRequest, res: NextApiResponse) {
  try {
    const { wallet } = req.body;

    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const walletLower = wallet.toLowerCase();

    const groupResult = await pool.query(
      `SELECT g.id, g.created_by, g.member_count, g.display_name
       FROM susu_purpose_groups g
       WHERE g.id = $1`,
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = groupResult.rows[0];

    const creatorCheck = await pool.query(
      `SELECT g.created_by, u.wallet_address as creator_wallet
       FROM susu_purpose_groups g
       LEFT JOIN users u ON u.id = g.created_by
       WHERE g.id = $1`,
      [groupId]
    );

    const creatorWallet = creatorCheck.rows[0]?.creator_wallet?.toLowerCase();
    let canDelete = creatorWallet === walletLower;

    const membersResult = await pool.query(
      `SELECT gm.*, u.wallet_address
       FROM susu_group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1`,
      [groupId]
    );
    const members = membersResult.rows;

    if (!canDelete && members.length === 1) {
      if (members[0].wallet_address?.toLowerCase() === walletLower) {
        canDelete = true;
      }
    }

    if (!canDelete && members.length === 0 && !creatorCheck.rows[0]?.created_by) {
      const userCheck = await pool.query(
        `SELECT id FROM users WHERE LOWER(wallet_address) = $1`,
        [walletLower]
      );
      if (userCheck.rows.length > 0) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return res.status(403).json({ error: 'Only the group creator can delete this group' });
    }

    const memberCount = await pool.query(
      `SELECT COUNT(*) as count FROM susu_group_members WHERE group_id = $1`,
      [groupId]
    );

    const totalMembers = parseInt(memberCount.rows[0]?.count || '0');
    if (totalMembers > 1) {
      return res.status(403).json({ 
        error: 'Cannot delete group with other members. Only groups with just the creator can be deleted.',
        memberCount: totalMembers
      });
    }

    await pool.query('BEGIN');
    
    try {
      await pool.query(`DELETE FROM susu_group_members WHERE group_id = $1`, [groupId]);
      await pool.query(`DELETE FROM susu_invitations WHERE group_id = $1`, [groupId]);
      await pool.query(`DELETE FROM susu_messages WHERE group_id = $1`, [groupId]);
      await pool.query(`DELETE FROM susu_contributions WHERE group_id = $1`, [groupId]);
      await pool.query(`DELETE FROM susu_analytics_events WHERE group_id = $1`, [groupId]);
      await pool.query(`DELETE FROM susu_purpose_groups WHERE id = $1`, [groupId]);
      
      await pool.query('COMMIT');
      
      res.status(200).json({ 
        success: true, 
        message: `Group "${group.display_name}" has been deleted`
      });
    } catch (deleteError) {
      await pool.query('ROLLBACK');
      throw deleteError;
    }
  } catch (error: any) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: error.message || 'Failed to delete group' });
  }
}

async function handleGet(groupId: number, res: NextApiResponse) {
  try {

    const result = await pool.query(
      `SELECT 
        g.id,
        g.display_name as name,
        g.description,
        g.purpose_category_id,
        g.hub_id,
        h.region_display as hub_name,
        h.region_id as hub_region,
        pc.name as category_name,
        pc.icon as category_icon,
        g.contribution_amount,
        g.contribution_currency as currency,
        g.cycle_length_days as cycle_duration,
        g.member_count,
        g.max_members,
        g.min_members_to_activate,
        g.is_active,
        g.graduated_to_pool_id,
        g.created_at,
        g.updated_at
      FROM susu_purpose_groups g
      LEFT JOIN susu_interest_hubs h ON h.id = g.hub_id
      LEFT JOIN susu_purpose_categories pc ON pc.id = g.purpose_category_id
      WHERE g.id = $1
      LIMIT 1`,
      [groupId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.status(200).json({ 
      success: true, 
      group: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch group' });
  }
}
