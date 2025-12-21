import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';

function generateDisplayName(region: string, purpose: string, amount: number, currency: string, cycleDays: number): string {
  const cycleLabel = cycleDays <= 1 ? 'Daily' : 
                     cycleDays <= 7 ? 'Weekly' : 
                     cycleDays <= 14 ? 'Bi-Weekly' : 
                     cycleDays <= 30 ? 'Monthly' : `${cycleDays} Days`;
  return `${region} | ${purpose} | ${amount} ${currency} | ${cycleLabel}`;
}

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
    const { 
      hubId, 
      purposeId, 
      limit = '50', 
      offset = '0',
      includeGraduated = 'false'
    } = req.query;

    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);

    let query = `
      SELECT 
        g.id, g.hub_id as "hubId", g.purpose_category_id as "purposeCategoryId",
        g.custom_purpose_label as "customPurposeLabel", g.contribution_amount as "contributionAmount",
        g.contribution_currency as "contributionCurrency", g.cycle_length_days as "cycleLengthDays",
        g.display_name as "displayName", g.description, g.member_count as "memberCount",
        g.min_members_to_activate as "minMembersToActivate", g.max_members as "maxMembers",
        g.is_active as "isActive", g.created_by as "createdBy", g.graduated_to_pool_id as "graduatedToPoolId",
        g.created_at as "createdAt", g.updated_at as "updatedAt",
        h.region_display as "regionDisplay", h.region_id as "regionId",
        c.name as "purposeName", c.icon as "purposeIcon"
      FROM susu_purpose_groups g
      INNER JOIN susu_interest_hubs h ON g.hub_id = h.id
      INNER JOIN susu_purpose_categories c ON g.purpose_category_id = c.id
      WHERE g.is_active = true
    `;
    
    const params: any[] = [];
    let paramIndex = 1;

    if (includeGraduated !== 'true') {
      query += ` AND g.graduated_to_pool_id IS NULL`;
    }
    
    if (hubId) {
      query += ` AND g.hub_id = $${paramIndex}`;
      params.push(parseInt(hubId as string));
      paramIndex++;
    }
    
    if (purposeId) {
      query += ` AND g.purpose_category_id = $${paramIndex}`;
      params.push(parseInt(purposeId as string));
      paramIndex++;
    }

    query += ` ORDER BY g.member_count DESC, g.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offsetNum);

    const result = await pool.query(query, params);

    const formattedGroups = result.rows.map(g => ({
      ...g,
      availableSlots: (g.maxMembers || 50) - (g.memberCount || 0),
      isReadyToActivate: (g.memberCount || 0) >= (g.minMembersToActivate || 3)
    }));

    res.status(200).json({
      success: true,
      groups: formattedGroups,
      limit: limitNum,
      offset: offsetNum
    });
  } catch (error: any) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch groups' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { 
      hubId, 
      purposeCategoryId, 
      customPurposeLabel,
      contributionAmount, 
      contributionCurrency = 'AXM',
      cycleLengthDays,
      description,
      minMembersToActivate = 3,
      maxMembers = 50,
      walletAddress
    } = req.body;

    if (!hubId || !purposeCategoryId || !contributionAmount || !cycleLengthDays) {
      return res.status(400).json({ 
        error: 'Missing required fields: hubId, purposeCategoryId, contributionAmount, cycleLengthDays' 
      });
    }

    // Validate wallet address if provided
    if (walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    const hubResult = await pool.query(
      `SELECT id, region_display as "regionDisplay" FROM susu_interest_hubs WHERE id = $1 LIMIT 1`,
      [hubId]
    );

    if (hubResult.rows.length === 0) {
      return res.status(404).json({ error: 'Hub not found' });
    }

    const hub = hubResult.rows[0];

    const categoryResult = await pool.query(
      `SELECT id, name FROM susu_purpose_categories WHERE id = $1 LIMIT 1`,
      [purposeCategoryId]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Purpose category not found' });
    }

    const category = categoryResult.rows[0];

    const purposeLabel = customPurposeLabel || category.name;
    const displayName = generateDisplayName(
      hub.regionDisplay, 
      purposeLabel, 
      parseFloat(contributionAmount), 
      contributionCurrency,
      cycleLengthDays
    );

    const normalizedWallet = walletAddress ? walletAddress.toLowerCase() : null;
    
    const insertResult = await pool.query(
      `INSERT INTO susu_purpose_groups 
       (hub_id, purpose_category_id, custom_purpose_label, contribution_amount, contribution_currency,
        cycle_length_days, display_name, description, min_members_to_activate, max_members,
        member_count, created_by, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, NOW(), NOW())
       RETURNING id, hub_id as "hubId", purpose_category_id as "purposeCategoryId",
                 display_name as "displayName", contribution_amount as "contributionAmount",
                 contribution_currency as "contributionCurrency", cycle_length_days as "cycleLengthDays",
                 member_count as "memberCount", min_members_to_activate as "minMembersToActivate",
                 max_members as "maxMembers", created_at as "createdAt"`,
      [hubId, purposeCategoryId, customPurposeLabel, contributionAmount.toString(), contributionCurrency,
       cycleLengthDays, displayName, description, minMembersToActivate, maxMembers,
       normalizedWallet ? 1 : 0, normalizedWallet]
    );

    const newGroup = insertResult.rows[0];

    if (normalizedWallet) {
      await pool.query(
        `INSERT INTO susu_group_members (group_id, user_id, role, commitment_confirmed, joined_at)
         VALUES ($1, $2, 'organizer', true, NOW())`,
        [newGroup.id, normalizedWallet]
      );
    }

    await pool.query(
      `INSERT INTO susu_analytics_events (event_type, group_id, hub_id, user_id, metadata, created_at)
       VALUES ('group_create', $1, $2, $3, $4, NOW())`,
      [newGroup.id, hubId, normalizedWallet, JSON.stringify({ contributionAmount, cycleLengthDays })]
    );

    res.status(201).json({ success: true, group: newGroup });
  } catch (error: any) {
    console.error('Error creating group:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create group' });
  }
}
