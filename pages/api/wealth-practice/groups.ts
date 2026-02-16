import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { hubId, status, q } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (hubId) {
      conditions.push(`spg.hub_id = $${paramIndex++}`);
      params.push(Number(hubId));
    }

    if (q) {
      conditions.push(`(spg.display_name ILIKE $${paramIndex} OR spg.description ILIKE $${paramIndex})`);
      params.push(`%${q}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT
        spg.*,
        sih.region_display,
        sih.region_type
      FROM susu_purpose_groups spg
      LEFT JOIN susu_interest_hubs sih ON spg.hub_id = sih.id
      ${whereClause}
      ORDER BY spg.member_count DESC, spg.created_at DESC`,
      params
    );

    let groups = result.rows.map((g) => {
      const memberCount = parseInt(g.member_count) || 0;
      const minToActivate = parseInt(g.min_members_to_activate) || 3;

      let computedStatus: 'forming' | 'active' | 'graduated' = 'forming';
      if (g.graduated_at) {
        computedStatus = 'graduated';
      } else if (memberCount >= minToActivate) {
        computedStatus = 'active';
      }

      const trustScore = Math.min(
        100,
        40 + (memberCount * 8) + (g.is_active ? 15 : 0) + (g.graduated_at ? 25 : 0)
      );

      return {
        ...g,
        status: computedStatus,
        trust_score: trustScore,
      };
    });

    if (status) {
      groups = groups.filter((g) => g.status === status);
    }

    return res.status(200).json({
      success: true,
      groups,
      total: groups.length,
    });
  } catch (error: any) {
    console.error('Wealth Practice groups GET error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch groups',
    });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      hubId,
      contributionAmount,
      cycleLengthDays,
      purposeCategoryId,
      displayName,
      description,
      minMembersToActivate,
      maxMembers,
    } = req.body;

    if (!hubId || contributionAmount === undefined || !cycleLengthDays) {
      return res.status(400).json({
        success: false,
        error: 'hubId, contributionAmount, and cycleLengthDays are required',
      });
    }

    const groupIdStr = `grp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const result = await pool.query(
      `INSERT INTO susu_purpose_groups (
        group_id, hub_id, purpose_category_id, contribution_amount, cycle_length_days,
        display_name, description, member_count, min_members_to_activate,
        max_members, is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9, true, NOW())
      RETURNING *`,
      [
        groupIdStr,
        Number(hubId),
        purposeCategoryId ? Number(purposeCategoryId) : 1,
        contributionAmount,
        Number(cycleLengthDays),
        displayName || null,
        description || null,
        minMembersToActivate ? Number(minMembersToActivate) : 3,
        maxMembers ? Number(maxMembers) : 12,
      ]
    );

    return res.status(201).json({
      success: true,
      group: result.rows[0],
    });
  } catch (error: any) {
    console.error('Wealth Practice groups POST error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create group',
    });
  }
}
