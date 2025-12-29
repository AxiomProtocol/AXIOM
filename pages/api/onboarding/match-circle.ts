import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { sessionId, mode, walletAddress, hubId } = req.body;

    if (!mode || !['community', 'capital'].includes(mode)) {
      return res.status(400).json({ success: false, error: 'Invalid mode selected' });
    }

    if (hubId) {
      const groupsResult = await pool.query(`
        SELECT g.id, g.display_name, g.description, g.contribution_amount, 
               g.member_count, g.max_members, c.name as category_name, c.icon
        FROM susu_purpose_groups g
        LEFT JOIN susu_purpose_categories c ON g.purpose_category_id = c.id
        WHERE g.hub_id = $1 AND g.is_active = true 
          AND (g.member_count < g.max_members OR g.max_members IS NULL)
        ORDER BY g.member_count DESC
        LIMIT 5
      `, [hubId]);

      if (groupsResult.rows.length > 0) {
        const groups = groupsResult.rows.map(g => ({
          id: g.id,
          name: g.display_name || `${g.category_name} Circle`,
          description: g.description,
          contributionAmount: `$${g.contribution_amount}/month`,
          members: g.member_count || 0,
          maxMembers: g.max_members || 50,
          category: g.category_name,
          icon: g.icon,
        }));

        return res.json({
          success: true,
          groups,
          hubId,
        });
      }
    }

    const hubsResult = await pool.query(`
      SELECT id, region_id, region_display, description, cover_image_url, member_count
      FROM susu_interest_hubs
      WHERE is_active = true
      ORDER BY member_count DESC
      LIMIT 10
    `);

    if (hubsResult.rows.length > 0) {
      const hubs = hubsResult.rows.map(h => ({
        id: h.id,
        regionId: h.region_id,
        name: h.region_display,
        description: h.description,
        coverImage: h.cover_image_url,
        memberCount: h.member_count || 0,
      }));

      return res.json({
        success: true,
        hubs,
        step: 'select_hub',
      });
    }

    const defaultHubs = [
      { id: 'atlanta', name: 'Atlanta Metro', description: 'Building wealth together in the ATL', memberCount: 47 },
      { id: 'houston', name: 'Houston Area', description: 'Texas-sized savings goals', memberCount: 32 },
      { id: 'chicago', name: 'Chicago Region', description: 'Midwest wealth builders', memberCount: 28 },
      { id: 'national', name: 'National Community', description: 'Connect with members nationwide', memberCount: 156 },
    ];

    return res.json({
      success: true,
      hubs: defaultHubs,
      step: 'select_hub',
      isDefault: true,
    });
  } catch (error) {
    console.error('Circle matching error:', error);
    return res.status(500).json({ success: false, error: 'Failed to match circle' });
  }
}
