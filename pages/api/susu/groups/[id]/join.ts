import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { walletAddress, commitmentConfirmed = false } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Missing required field: walletAddress' });
    }
    
    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    const groupId = parseInt(id as string);

    const groupResult = await pool.query(
      `SELECT id, member_count as "memberCount", max_members as "maxMembers", 
              min_members_to_activate as "minMembersToActivate"
       FROM susu_purpose_groups 
       WHERE id = $1 AND is_active = true AND graduated_to_pool_id IS NULL 
       LIMIT 1`,
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found or already graduated to a circle' });
    }

    const group = groupResult.rows[0];

    if ((group.memberCount || 0) >= (group.maxMembers || 50)) {
      return res.status(400).json({ error: 'Group is full' });
    }

    const existingResult = await pool.query(
      `SELECT id FROM susu_group_members WHERE group_id = $1 AND user_id = $2 LIMIT 1`,
      [groupId, walletAddress.toLowerCase()]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }

    await pool.query(
      `INSERT INTO susu_group_members (group_id, user_id, role, commitment_confirmed, joined_at) 
       VALUES ($1, $2, 'member', $3, NOW())`,
      [groupId, walletAddress.toLowerCase(), commitmentConfirmed]
    );

    const updatedResult = await pool.query(
      `UPDATE susu_purpose_groups 
       SET member_count = member_count + 1, updated_at = NOW() 
       WHERE id = $1 
       RETURNING member_count as "memberCount", min_members_to_activate as "minMembersToActivate"`,
      [groupId]
    );

    const updatedGroup = updatedResult.rows[0];
    const isReadyToActivate = (updatedGroup.memberCount || 0) >= (updatedGroup.minMembersToActivate || 3);

    res.status(200).json({ 
      success: true, 
      message: 'Successfully joined group',
      memberCount: updatedGroup.memberCount,
      isReadyToActivate
    });
  } catch (error: any) {
    console.error('Error joining group:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to join group' });
  }
}
