import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { walletAddress, poolId, txHash } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Missing required field: walletAddress' });
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    if (!poolId || typeof poolId !== 'number') {
      return res.status(400).json({ error: 'Missing or invalid poolId (on-chain pool ID)' });
    }

    const groupId = parseInt(id as string);

    const groupResult = await pool.query(
      `SELECT g.id, g.hub_id as "hubId", g.member_count as "memberCount", 
              g.min_members_to_activate as "minMembersToActivate",
              g.graduated_to_pool_id as "graduatedToPoolId",
              g.created_by as "createdBy"
       FROM susu_purpose_groups g
       WHERE g.id = $1 AND g.is_active = true
       LIMIT 1`,
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = groupResult.rows[0];

    if (group.graduatedToPoolId) {
      return res.status(400).json({ 
        error: 'Group has already graduated to an on-chain circle',
        existingPoolId: group.graduatedToPoolId
      });
    }

    const organizerCheck = await pool.query(
      `SELECT role FROM susu_group_members 
       WHERE group_id = $1 AND user_id = $2 AND role = 'organizer'`,
      [groupId, walletAddress.toLowerCase()]
    );
    
    if (organizerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only the group organizer can graduate this group' });
    }

    const minMembers = group.minMembersToActivate || 3;
    if ((group.memberCount || 0) < minMembers) {
      return res.status(400).json({ 
        error: `Group needs at least ${minMembers} members to graduate. Current: ${group.memberCount || 0}` 
      });
    }

    await pool.query(
      `UPDATE susu_purpose_groups 
       SET graduated_to_pool_id = $1, 
           graduation_tx_hash = $2,
           graduated_at = NOW(),
           updated_at = NOW() 
       WHERE id = $3`,
      [poolId, txHash || null, groupId]
    );

    await pool.query(
      `INSERT INTO susu_analytics_events (event_type, group_id, hub_id, user_id, metadata, created_at)
       VALUES ('graduation', $1, $2, $3, $4, NOW())`,
      [groupId, group.hubId, walletAddress.toLowerCase(), JSON.stringify({ poolId, txHash })]
    );

    res.status(200).json({ 
      success: true, 
      message: 'Group successfully graduated to on-chain circle',
      poolId,
      groupId
    });
  } catch (error: any) {
    console.error('Error graduating group:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to graduate group' });
  }
}
