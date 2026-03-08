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
    const result = await pool.query(
      `SELECT
        sgm.id,
        sgm.group_id,
        sgm.position,
        sgm.status,
        sgm.joined_at,
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
      FROM susu_group_members sgm
      JOIN susu_purpose_groups spg ON sgm.group_id = spg.id
      LEFT JOIN susu_interest_hubs sih ON spg.hub_id = sih.id
      WHERE sgm.member_address = $1 AND sgm.status = 'active'
      ORDER BY sgm.joined_at DESC`,
      [memberAddress]
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
