import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';
import crypto from 'crypto';

async function detectMode(params: { contributionAmount: number; memberCount: number; cycleLengthDays: number; purposeCategoryId?: number }) {
  const { rows: thresholds } = await pool.query(`
    SELECT threshold_key, threshold_value FROM susu_mode_thresholds
  `);
  
  const thresholdMap = thresholds.reduce((acc: any, row: any) => {
    acc[row.threshold_key] = parseFloat(row.threshold_value);
    return acc;
  }, {});

  const totalPotEstimate = params.contributionAmount * params.memberCount;
  
  const contributionBreached = params.contributionAmount > (thresholdMap.contribution_amount_usd || 1000);
  const potBreached = totalPotEstimate > (thresholdMap.total_pot_estimate_usd || 10000);
  const groupSizeBreached = params.memberCount > (thresholdMap.group_size || 20);
  const cycleLengthBreached = params.cycleLengthDays > (thresholdMap.cycle_length_days || 90);

  return contributionBreached || potBreached || groupSizeBreached || cycleLengthBreached ? 'capital' : 'community';
}

async function createGraduationCharter(groupId: number, poolId: number, mode: string, groupData: any) {
  const charterData = {
    purpose: groupData.purposeName || 'SUSU Savings Circle',
    category: groupData.categoryName || 'General Savings',
    contributionAmount: groupData.contributionAmount || 100,
    contributionFrequency: 'per_cycle',
    rotationMethod: 'sequential',
    gracePeriodDays: 3,
    custodyModel: 'non-custodial',
    mode,
    version: 1
  };
  
  const charterHash = '0x' + crypto.createHash('sha256').update(JSON.stringify(charterData)).digest('hex');
  
  await pool.query(`
    INSERT INTO susu_charters (
      group_id, pool_id, version, purpose, category,
      contribution_amount, contribution_frequency, rotation_method,
      grace_period_days, custody_model, charter_hash, effective_date, mode
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12)
  `, [
    groupId, poolId, 1, charterData.purpose, charterData.category,
    charterData.contributionAmount, charterData.contributionFrequency, charterData.rotationMethod,
    charterData.gracePeriodDays, charterData.custodyModel, charterHash, mode
  ]);
  
  return { charterHash, mode };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { walletAddress, poolId, txHash } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Missing required field: walletAddress' });
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    if (!poolId || typeof poolId !== 'number') {
      return res.status(400).json({ error: 'Missing or invalid poolId (on-chain pool ID)' });
    }

    const groupId = parseInt(id as string);

    const groupResult = await pool.query(
      `SELECT g.id, g.hub_id as "hubId", g.member_count as "memberCount", 
              g.min_members_to_activate as "minMembersToActivate",
              g.graduated_to_pool_id as "graduatedToPoolId",
              g.created_by as "createdBy"
       FROM susu_purpose_groups g
       WHERE g.id = $1 AND g.is_active = true
       LIMIT 1`,
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = groupResult.rows[0];

    if (group.graduatedToPoolId) {
      return res.status(400).json({ 
        error: 'Group has already graduated to an on-chain circle',
        existingPoolId: group.graduatedToPoolId
      });
    }

    const organizerCheck = await pool.query(
      `SELECT gm.role FROM susu_group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1 AND LOWER(u.wallet_address) = $2 AND gm.role = 'organizer'`,
      [groupId, walletAddress.toLowerCase()]
    );
    
    if (organizerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only the group organizer can graduate this group' });
    }

    const minMembers = group.minMembersToActivate || 3;
    if ((group.memberCount || 0) < minMembers) {
      return res.status(400).json({ 
        error: `Group needs at least ${minMembers} members to graduate. Current: ${group.memberCount || 0}` 
      });
    }

    const groupDetails = await pool.query(
      `SELECT g.*, c.name as "categoryName", c.id as "categoryId"
       FROM susu_purpose_groups g
       LEFT JOIN susu_purpose_categories c ON g.purpose_category_id = c.id
       WHERE g.id = $1`,
      [groupId]
    );
    
    const fullGroup = groupDetails.rows[0];
    
    const mode = await detectMode({
      contributionAmount: parseFloat(fullGroup.contribution_amount || 100),
      memberCount: fullGroup.memberCount || 10,
      cycleLengthDays: fullGroup.cycle_length_days || 30,
      purposeCategoryId: fullGroup.categoryId
    });
    
    const charter = await createGraduationCharter(groupId, poolId, mode, {
      purposeName: fullGroup.name,
      categoryName: fullGroup.categoryName,
      contributionAmount: fullGroup.contribution_amount
    });

    await pool.query(
      `UPDATE susu_purpose_groups 
       SET graduated_to_pool_id = $1, 
           graduation_tx_hash = $2,
           graduated_at = NOW(),
           updated_at = NOW() 
       WHERE id = $3`,
      [poolId, txHash || null, groupId]
    );

    await pool.query(
      `INSERT INTO susu_analytics_events (event_type, group_id, hub_id, user_id, metadata, created_at)
       VALUES ('graduation', $1, $2, $3, $4, NOW())`,
      [groupId, group.hubId, walletAddress.toLowerCase(), JSON.stringify({ 
        poolId, 
        txHash,
        mode,
        charterHash: charter.charterHash
      })]
    );

    res.status(200).json({ 
      success: true, 
      message: 'Group successfully graduated to on-chain circle',
      poolId,
      groupId,
      mode,
      charterHash: charter.charterHash
    });
  } catch (error: any) {
    console.error('Error graduating group:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to graduate group' });
  }
}
