import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { groupId, memberAddress } = req.body;

  if (!groupId || !memberAddress) {
    return res.status(400).json({
      success: false,
      error: 'groupId and memberAddress are required',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const groupResult = await client.query(
      `SELECT id, member_count, max_members, is_active, hub_id
       FROM susu_purpose_groups WHERE id = $1`,
      [Number(groupId)]
    );

    if (groupResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    const group = groupResult.rows[0];

    if (!group.is_active) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Group is not active' });
    }

    const memberCount = parseInt(group.member_count) || 0;
    const maxMembers = parseInt(group.max_members) || 12;

    if (memberCount >= maxMembers) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Group is full' });
    }

    const existingMember = await client.query(
      `SELECT id FROM susu_group_members WHERE group_id = $1 AND member_address = $2`,
      [Number(groupId), memberAddress]
    );

    if (existingMember.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Already a member of this group' });
    }

    await client.query(
      `INSERT INTO susu_group_members (group_id, member_address, position, status, joined_at)
       VALUES ($1, $2, $3, 'active', NOW())`,
      [Number(groupId), memberAddress, memberCount + 1]
    );

    await client.query(
      `UPDATE susu_purpose_groups SET member_count = member_count + 1 WHERE id = $1`,
      [Number(groupId)]
    );

    await client.query(
      `INSERT INTO susu_analytics_events (event_type, hub_id, group_id, metadata, created_at)
       VALUES ('group_join', $1, $2, $3, NOW())`,
      [group.hub_id, Number(groupId), JSON.stringify({ member_address: memberAddress })]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Joined group successfully',
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Wealth Practice join error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to join group',
    });
  } finally {
    client.release();
  }
}
