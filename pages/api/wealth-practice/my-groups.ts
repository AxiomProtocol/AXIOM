import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { memberAddress } = req.query;

  if (!memberAddress || typeof memberAddress !== 'string') {
    return res.status(400).json({ success: false, error: 'memberAddress query parameter is required' });
  }

  try {
    const normalizedAddress = memberAddress.toLowerCase();

    const result = await pool.query(
      `SELECT
        COALESCE(sgm.id, -spg.id) as id,
        spg.id                    as group_id,
        COALESCE(sgm.position, 1) as position,
        COALESCE(sgm.status, 'active') as status,
        COALESCE(sgm.joined_at, spg.created_at) as joined_at,
        spg.display_name,
        spg.description,
        spg.contribution_amount,
        spg.cycle_length_days,
        COALESCE(spg.contribution_frequency, 'monthly') as contribution_frequency,
        COALESCE(spg.rotation_method, 'round-robin') as rotation_method,
        spg.member_count,
        spg.max_members,
        spg.min_members_to_activate,
        spg.graduated_at,
        spg.is_active,
        sih.region_display,
        sih.hub_name
      FROM susu_purpose_groups spg
      LEFT JOIN susu_interest_hubs sih ON spg.hub_id = sih.id
      LEFT JOIN susu_group_members sgm
        ON sgm.group_id = spg.id AND LOWER(sgm.member_address) = $1 AND sgm.status = 'active'
      WHERE
        (sgm.id IS NOT NULL)
        OR (LOWER(spg.creator_wallet) = $1)
      ORDER BY joined_at DESC`,
      [normalizedAddress]
    );

    const groups = result.rows.map((g) => {
      const memberCount = parseInt(g.member_count) || 0;
      const minToActivate = parseInt(g.min_members_to_activate) || 3;
      let groupStatus = 'forming';
      if (g.graduated_at) {
        groupStatus = 'graduated';
      } else if (memberCount >= minToActivate) {
        groupStatus = 'active';
      }

      return {
        ...g,
        group_status: groupStatus,
      };
    });

    return res.status(200).json({
      success: true,
      groups,
      total: groups.length,
    });
  } catch (error: any) {
    console.error('My groups error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch your groups',
    });
  }
}
