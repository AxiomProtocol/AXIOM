import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { region, limit = '50', offset = '0' } = req.query;
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);

    let query = `
      SELECT id, region_id as "regionId", region_display as "regionDisplay", 
             region_type as "regionType", description, cover_image_url as "coverImageUrl",
             member_count as "memberCount", created_by as "createdBy", is_active as "isActive",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM susu_interest_hubs 
      WHERE is_active = true
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (region) {
      query += ` AND region_id = $${paramIndex}`;
      params.push(region);
      paramIndex++;
    }

    query += ` ORDER BY member_count DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offsetNum);

    const result = await pool.query(query, params);

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM susu_interest_hubs WHERE is_active = true`
    );

    res.status(200).json({
      success: true,
      hubs: result.rows,
      total: parseInt(countResult.rows[0]?.count || '0'),
      limit: limitNum,
      offset: offsetNum
    });
  } catch (error: any) {
    console.error('Error fetching hubs:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch hubs' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { regionId, regionDisplay, regionType, description, userId } = req.body;

    if (!regionId || !regionDisplay) {
      return res.status(400).json({ error: 'Missing required fields: regionId, regionDisplay' });
    }

    const existingHub = await pool.query(
      `SELECT id FROM susu_interest_hubs WHERE region_id = $1 LIMIT 1`,
      [regionId]
    );

    if (existingHub.rows.length > 0) {
      return res.status(400).json({ error: 'A hub already exists for this region' });
    }

    const insertResult = await pool.query(
      `INSERT INTO susu_interest_hubs 
       (region_id, region_display, region_type, description, created_by, member_count, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
       RETURNING id, region_id as "regionId", region_display as "regionDisplay", 
                 region_type as "regionType", description, member_count as "memberCount",
                 created_by as "createdBy", is_active as "isActive", created_at as "createdAt"`,
      [regionId, regionDisplay, regionType || 'city', description, userId || null, userId ? 1 : 0]
    );

    const newHub = insertResult.rows[0];

    if (userId) {
      await pool.query(
        `INSERT INTO susu_hub_members (hub_id, user_id, role, joined_at)
         VALUES ($1, $2, 'regional_owner', NOW())`,
        [newHub.id, userId]
      );
    }

    res.status(201).json({ success: true, hub: newHub });
  } catch (error: any) {
    console.error('Error creating hub:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create hub' });
  }
}
