import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import crypto from 'crypto';

function hashCharter(charterData: any): string {
  const canonical = JSON.stringify(charterData, Object.keys(charterData).sort());
  return '0x' + crypto.createHash('sha256').update(canonical).digest('hex');
}

function generateCharterText(params: {
  purpose: string;
  category: string;
  contributionAmount: number;
  contributionFrequency: string;
  memberCount: number;
  rotationMethod: string;
  gracePeriodDays: number;
  exitPolicy?: string;
  disputePolicy?: string;
  custodyModel: string;
  mode: string;
}): string {
  const modeDisclosure = params.mode === 'capital' 
    ? `\n\nCAPITAL MODE ENHANCED DISCLOSURES:\n- This pool involves higher value amounts and is subject to enhanced governance requirements.\n- All members must acknowledge additional risk disclosures before participation.\n- Dispute escalation paths are mandatory and binding.\n- Transaction records are permanently logged for compliance purposes.`
    : '';

  return `AXIOM SUSU POOL CHARTER

PURPOSE: ${params.purpose}
CATEGORY: ${params.category}
MODE: ${params.mode.toUpperCase()} MODE

1. CONTRIBUTION TERMS
   - Amount: ${params.contributionAmount} per ${params.contributionFrequency}
   - Total Members: ${params.memberCount}
   - Total Pool Value: ${params.contributionAmount * params.memberCount}

2. ROTATION METHOD
   - Method: ${params.rotationMethod}
   - Payout order is ${params.rotationMethod === 'sequential' ? 'fixed and predetermined' : 'randomized at pool creation'}

3. GRACE PERIOD
   - Members have ${params.gracePeriodDays} days after the due date to make contributions
   - Late contributions may affect reliability score

4. EXIT POLICY
   ${params.exitPolicy || 'Members may exit the pool before receiving their payout. Exiting after receiving payout forfeits future participation in this pool.'}

5. DISPUTE RESOLUTION
   ${params.disputePolicy || 'Disputes are handled through the Axiom SUSU support system. All parties agree to abide by the resolution process.'}

6. CUSTODY MODEL
   - Model: ${params.custodyModel}
   ${params.custodyModel === 'non-custodial' 
     ? '- Funds are transferred directly between members through smart contract. Axiom does not hold or control member funds.'
     : '- Funds are held in smart contract escrow with rule-based release. Axiom cannot withdraw funds.'}

7. RISK ACKNOWLEDGEMENT
   - This is a peer-to-peer rotating savings arrangement
   - There is no guarantee of returns or profit
   - Members assume the risk of non-payment by other members
   - This is not a bank account, investment, or insured product
${modeDisclosure}

By participating in this SUSU pool, all members agree to these terms.

Charter Hash: [HASH_PLACEHOLDER]
Effective Date: [DATE_PLACEHOLDER]
Version: [VERSION_PLACEHOLDER]
`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { groupId, poolId } = req.query;

      let query = `
        SELECT 
          c.*,
          g.name as group_name,
          cat.name as category_name,
          (SELECT COUNT(*) FROM susu_charter_acceptances WHERE charter_id = c.id) as acceptance_count
        FROM susu_charters c
        LEFT JOIN susu_purpose_groups g ON c.group_id = g.id
        LEFT JOIN susu_purpose_categories cat ON cat.name = c.category
      `;

      const params: any[] = [];
      if (groupId) {
        query += ' WHERE c.group_id = $1';
        params.push(parseInt(groupId as string));
      } else if (poolId) {
        query += ' WHERE c.pool_id = $1';
        params.push(parseInt(poolId as string));
      }

      query += ' ORDER BY c.version DESC';

      const { rows } = await pool.query(query, params);

      res.status(200).json({
        success: true,
        charters: rows
      });
    } catch (error: any) {
      console.error('Error fetching charters:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch charters' });
    }
  } else if (req.method === 'POST') {
    try {
      const {
        groupId,
        poolId,
        purpose,
        category,
        contributionAmount,
        contributionFrequency,
        memberCount,
        startDate,
        rotationMethod,
        gracePeriodDays,
        latePenaltyBps,
        exitPolicy,
        disputePolicy,
        custodyModel,
        mode,
        createdBy
      } = req.body;

      if (!purpose || !category || !contributionAmount || !contributionFrequency) {
        return res.status(400).json({ 
          error: 'Missing required fields: purpose, category, contributionAmount, contributionFrequency' 
        });
      }

      const { rows: versionRows } = await pool.query(`
        SELECT COALESCE(MAX(version), 0) + 1 as next_version
        FROM susu_charters
        WHERE group_id = $1 OR pool_id = $2
      `, [groupId || null, poolId || null]);

      const version = versionRows[0].next_version;

      const charterText = generateCharterText({
        purpose,
        category,
        contributionAmount: parseFloat(contributionAmount),
        contributionFrequency,
        memberCount: memberCount || 10,
        rotationMethod: rotationMethod || 'sequential',
        gracePeriodDays: gracePeriodDays || 3,
        exitPolicy,
        disputePolicy,
        custodyModel: custodyModel || 'non-custodial',
        mode: mode || 'community'
      });

      const charterData = {
        purpose,
        category,
        contributionAmount,
        contributionFrequency,
        rotationMethod: rotationMethod || 'sequential',
        gracePeriodDays: gracePeriodDays || 3,
        custodyModel: custodyModel || 'non-custodial',
        mode: mode || 'community',
        version
      };

      const charterHash = hashCharter(charterData);
      const effectiveDate = new Date();

      const finalCharterText = charterText
        .replace('[HASH_PLACEHOLDER]', charterHash)
        .replace('[DATE_PLACEHOLDER]', effectiveDate.toISOString())
        .replace('[VERSION_PLACEHOLDER]', String(version));

      const { rows } = await pool.query(`
        INSERT INTO susu_charters (
          group_id, pool_id, version, purpose, category,
          contribution_amount, contribution_frequency, start_date,
          rotation_method, payout_order_locked, grace_period_days,
          late_penalty_bps, exit_policy, dispute_policy, custody_model,
          charter_text, charter_hash, effective_date, mode, created_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11,
          $12, $13, $14, $15,
          $16, $17, $18, $19, $20
        ) RETURNING *
      `, [
        groupId || null,
        poolId || null,
        version,
        purpose,
        category,
        parseFloat(contributionAmount),
        contributionFrequency,
        startDate ? new Date(startDate) : null,
        rotationMethod || 'sequential',
        rotationMethod === 'sequential',
        gracePeriodDays || 3,
        latePenaltyBps || 0,
        exitPolicy || null,
        disputePolicy || null,
        custodyModel || 'non-custodial',
        finalCharterText,
        charterHash,
        effectiveDate,
        mode || 'community',
        createdBy || null
      ]);

      res.status(201).json({
        success: true,
        charter: rows[0]
      });
    } catch (error: any) {
      console.error('Error creating charter:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to create charter' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
