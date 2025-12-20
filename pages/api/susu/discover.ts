import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      q,
      region,
      purposeId,
      minContribution,
      maxContribution,
      minCycle,
      maxCycle,
      hasSlots = 'true',
      sortBy = 'activity',
      limit = '20',
      offset = '0'
    } = req.query;

    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);

    let query = `
      SELECT 
        g.id, g.display_name as "displayName", g.description,
        g.contribution_amount as "contributionAmount", g.contribution_currency as "contributionCurrency",
        g.cycle_length_days as "cycleLengthDays", g.member_count as "memberCount",
        g.max_members as "maxMembers", g.min_members_to_activate as "minMembersToActivate",
        g.created_at as "createdAt",
        h.id as "hubId", h.region_display as "regionDisplay", h.region_id as "regionId", 
        h.region_type as "regionType",
        c.id as "purposeId", c.name as "purposeName", c.icon as "purposeIcon"
      FROM susu_purpose_groups g
      INNER JOIN susu_interest_hubs h ON g.hub_id = h.id AND h.is_active = true
      INNER JOIN susu_purpose_categories c ON g.purpose_category_id = c.id
      WHERE g.is_active = true AND g.graduated_to_pool_id IS NULL
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (hasSlots === 'true') {
      query += ` AND g.member_count < g.max_members`;
    }

    if (purposeId) {
      query += ` AND g.purpose_category_id = $${paramIndex}`;
      params.push(parseInt(purposeId as string));
      paramIndex++;
    }

    if (minContribution) {
      query += ` AND CAST(g.contribution_amount AS DECIMAL) >= $${paramIndex}`;
      params.push(parseFloat(minContribution as string));
      paramIndex++;
    }

    if (maxContribution) {
      query += ` AND CAST(g.contribution_amount AS DECIMAL) <= $${paramIndex}`;
      params.push(parseFloat(maxContribution as string));
      paramIndex++;
    }

    if (minCycle) {
      query += ` AND g.cycle_length_days >= $${paramIndex}`;
      params.push(parseInt(minCycle as string));
      paramIndex++;
    }

    if (maxCycle) {
      query += ` AND g.cycle_length_days <= $${paramIndex}`;
      params.push(parseInt(maxCycle as string));
      paramIndex++;
    }

    if (region) {
      query += ` AND (h.region_id ILIKE $${paramIndex} OR h.region_display ILIKE $${paramIndex})`;
      params.push(`%${region}%`);
      paramIndex++;
    }

    if (q) {
      query += ` AND (g.display_name ILIKE $${paramIndex} OR g.description ILIKE $${paramIndex})`;
      params.push(`%${q}%`);
      paramIndex++;
    }

    const orderByClause = sortBy === 'newest' 
      ? 'g.created_at DESC'
      : sortBy === 'slots'
        ? '(g.max_members - g.member_count) DESC'
        : 'g.member_count DESC';

    query += ` ORDER BY ${orderByClause} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offsetNum);

    const result = await pool.query(query, params);

    const formattedResults = result.rows.map(r => ({
      ...r,
      availableSlots: (r.maxMembers || 50) - (r.memberCount || 0),
      isReadyToActivate: (r.memberCount || 0) >= (r.minMembersToActivate || 3),
      activityScore: r.memberCount || 0
    }));

    const hubsResult = await pool.query(`
      SELECT id, region_id as "regionId", region_display as "regionDisplay", 
             region_type as "regionType", member_count as "memberCount"
      FROM susu_interest_hubs 
      WHERE is_active = true 
      ORDER BY member_count DESC 
      LIMIT 20
    `);

    const categoriesResult = await pool.query(`
      SELECT id, name, description, icon, sort_order as "sortOrder"
      FROM susu_purpose_categories 
      WHERE is_active = true 
      ORDER BY sort_order ASC
    `);

    res.status(200).json({
      success: true,
      groups: formattedResults,
      filters: {
        regions: hubsResult.rows,
        purposes: categoriesResult.rows
      },
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        hasMore: result.rows.length === limitNum
      }
    });
  } catch (error: any) {
    console.error('Error in discovery:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to search groups' });
  }
}
