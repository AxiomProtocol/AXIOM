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
      const sanitizedQ = String(q).replace(/[%_\\]/g, '\\$&');
      conditions.push(`(spg.display_name ILIKE $${paramIndex} OR spg.description ILIKE $${paramIndex})`);
      params.push(`%${sanitizedQ}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let result;
    try {
      result = await pool.query(
        `SELECT
          spg.*,
          spg.contribution_frequency,
          spg.rotation_method,
          sih.region_display,
          sih.region_type
        FROM susu_purpose_groups spg
        LEFT JOIN susu_interest_hubs sih ON spg.hub_id = sih.id
        ${whereClause}
        ORDER BY spg.member_count DESC, spg.created_at DESC`,
        params
      );
    } catch (colErr: any) {
      if (colErr.message?.includes('column') && colErr.message?.includes('does not exist')) {
        result = await pool.query(
          `SELECT
            spg.*,
            'monthly' as contribution_frequency,
            'round-robin' as rotation_method,
            sih.region_display,
            sih.region_type
          FROM susu_purpose_groups spg
          LEFT JOIN susu_interest_hubs sih ON spg.hub_id = sih.id
          ${whereClause}
          ORDER BY spg.created_at DESC`,
          params
        );
      } else {
        throw colErr;
      }
    }

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
      contributionFrequency,
      rotationMethod,
      creatorAddress,
    } = req.body;

    if (!hubId || contributionAmount === undefined || !cycleLengthDays) {
      return res.status(400).json({
        success: false,
        error: 'hubId, contributionAmount, and cycleLengthDays are required',
      });
    }

    const groupIdStr = `grp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const freq = contributionFrequency || 'monthly';
    const rotation = rotationMethod || 'round-robin';

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const initialMemberCount = creatorAddress ? 1 : 0;

      const creatorWallet = (creatorAddress && typeof creatorAddress === 'string' && creatorAddress.startsWith('0x'))
        ? creatorAddress.toLowerCase()
        : null;

      const result = await client.query(
        `INSERT INTO susu_purpose_groups (
          group_id, hub_id, purpose_category_id, contribution_amount, cycle_length_days,
          display_name, description, member_count, min_members_to_activate,
          max_members, contribution_frequency, rotation_method, is_active, creator_wallet, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13, NOW())
        RETURNING *`,
        [
          groupIdStr,
          Number(hubId),
          purposeCategoryId ? Number(purposeCategoryId) : 1,
          contributionAmount,
          Number(cycleLengthDays),
          displayName || null,
          description || null,
          initialMemberCount,
          minMembersToActivate ? Number(minMembersToActivate) : 3,
          maxMembers ? Number(maxMembers) : 12,
          freq,
          rotation,
          creatorWallet,
        ]
      );

      const newGroup = result.rows[0];

      if (creatorAddress && typeof creatorAddress === 'string' && creatorAddress.startsWith('0x')) {
        await client.query(
          `INSERT INTO susu_group_members (group_id, member_address, position, status, joined_at)
           VALUES ($1, $2, 1, 'active', NOW())`,
          [newGroup.id, creatorAddress.toLowerCase()]
        );
      }

      await client.query('COMMIT');

      return res.status(201).json({
        success: true,
        group: newGroup,
      });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Wealth Practice groups POST error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create group',
    });
  }
}
