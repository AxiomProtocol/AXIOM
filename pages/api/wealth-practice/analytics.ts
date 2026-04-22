import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    let hubsResult, groupsResult, eventsResult;

    try {
      hubsResult = await pool.query(`SELECT COUNT(*) as total FROM susu_interest_hubs WHERE is_active = true`);
    } catch {
      hubsResult = await pool.query(`SELECT COUNT(*) as total FROM susu_interest_hubs`).catch(() => ({ rows: [{ total: 0 }] }));
    }

    try {
      groupsResult = await pool.query(`
        SELECT
          COUNT(*) as total_groups,
          COUNT(*) FILTER (WHERE member_count >= min_members_to_activate AND graduated_at IS NULL) as active_groups,
          COUNT(*) FILTER (WHERE graduated_at IS NOT NULL) as graduated_groups,
          COALESCE(SUM(member_count), 0) as total_members
        FROM susu_purpose_groups
      `);
    } catch {
      try {
        groupsResult = await pool.query(`
          SELECT
            COUNT(*) as total_groups,
            0 as active_groups,
            COUNT(*) FILTER (WHERE graduated_at IS NOT NULL) as graduated_groups,
            COALESCE(SUM(COALESCE(member_count, 0)), 0) as total_members
          FROM susu_purpose_groups
        `);
      } catch {
        groupsResult = { rows: [{ total_groups: 0, active_groups: 0, graduated_groups: 0, total_members: 0 }] };
      }
    }

    try {
      eventsResult = await pool.query(`
        SELECT * FROM susu_analytics_events
        ORDER BY created_at DESC
        LIMIT 20
      `);
    } catch {
      eventsResult = { rows: [] };
    }

    const groupStats = groupsResult.rows[0];

    return res.status(200).json({
      success: true,
      stats: {
        totalHubs: parseInt(hubsResult.rows[0].total) || 0,
        totalGroups: parseInt(groupStats.total_groups) || 0,
        activeGroups: parseInt(groupStats.active_groups) || 0,
        graduatedGroups: parseInt(groupStats.graduated_groups) || 0,
        totalMembers: parseInt(groupStats.total_members) || 0,
      },
      recentEvents: eventsResult.rows,
    });
  } catch (error: any) {
    console.error('Wealth Practice analytics error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch analytics',
    });
  }
}
