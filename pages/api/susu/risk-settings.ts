import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { groupId, poolId } = req.query;
      
      if (!groupId && !poolId) {
        return res.status(400).json({ error: 'groupId or poolId is required' });
      }
      
      const settings = await db.execute(sql.raw(`
        SELECT 
          srs.*,
          sip.name as insurance_pool_name,
          sip.total_balance as insurance_pool_balance
        FROM susu_risk_settings srs
        LEFT JOIN susu_insurance_pools sip ON srs.insurance_pool_id = sip.id
        WHERE ${groupId ? `srs.group_id = ${groupId}` : `srs.pool_id = '${poolId}'`}
        LIMIT 1
      `));
      
      if (settings.rows.length === 0) {
        return res.json({
          settings: {
            collateral_required: false,
            min_collateral_amount: null,
            collateral_multiplier: '1.00',
            vetting_required: false,
            vetting_votes_required: 3,
            vetting_approval_threshold: '0.66',
            vetting_period_days: 3,
            priority_enabled: true,
            priority_method: 'reliability',
            insurance_enabled: true
          },
          isDefault: true
        });
      }
      
      return res.json({ settings: settings.rows[0], isDefault: false });
    }
    
    if (req.method === 'POST') {
      const {
        groupId, poolId,
        collateralRequired, minCollateralAmount, collateralMultiplier,
        vettingRequired, vettingVotesRequired, vettingApprovalThreshold, vettingPeriodDays,
        priorityEnabled, priorityMethod,
        insuranceEnabled, insurancePoolId
      } = req.body;
      
      if (!groupId && !poolId) {
        return res.status(400).json({ error: 'groupId or poolId is required' });
      }
      
      const existing = await db.execute(sql.raw(`
        SELECT id FROM susu_risk_settings
        WHERE ${groupId ? `group_id = ${groupId}` : `pool_id = '${poolId}'`}
      `));
      
      const defaultInsurancePool = await db.execute(sql.raw(`
        SELECT id FROM susu_insurance_pools WHERE is_active = true LIMIT 1
      `));
      
      const finalInsurancePoolId = insurancePoolId || defaultInsurancePool.rows[0]?.id || 'NULL';
      
      if (existing.rows.length > 0) {
        const result = await db.execute(sql.raw(`
          UPDATE susu_risk_settings SET
            collateral_required = ${collateralRequired ?? false},
            min_collateral_amount = ${minCollateralAmount || 'NULL'},
            collateral_multiplier = ${collateralMultiplier || 1.00},
            vetting_required = ${vettingRequired ?? false},
            vetting_votes_required = ${vettingVotesRequired || 3},
            vetting_approval_threshold = ${vettingApprovalThreshold || 0.66},
            vetting_period_days = ${vettingPeriodDays || 3},
            priority_enabled = ${priorityEnabled ?? true},
            priority_method = '${priorityMethod || 'reliability'}',
            insurance_enabled = ${insuranceEnabled ?? true},
            insurance_pool_id = ${finalInsurancePoolId},
            updated_at = NOW()
          WHERE id = ${existing.rows[0].id}
          RETURNING *
        `));
        
        return res.json({ 
          message: 'Risk settings updated',
          settings: result.rows[0] 
        });
      } else {
        const result = await db.execute(sql.raw(`
          INSERT INTO susu_risk_settings 
          (group_id, pool_id, collateral_required, min_collateral_amount, collateral_multiplier,
           vetting_required, vetting_votes_required, vetting_approval_threshold, vetting_period_days,
           priority_enabled, priority_method, insurance_enabled, insurance_pool_id)
          VALUES (${groupId || 'NULL'}, ${poolId ? `'${poolId}'` : 'NULL'},
                  ${collateralRequired ?? false}, ${minCollateralAmount || 'NULL'}, ${collateralMultiplier || 1.00},
                  ${vettingRequired ?? false}, ${vettingVotesRequired || 3}, ${vettingApprovalThreshold || 0.66}, ${vettingPeriodDays || 3},
                  ${priorityEnabled ?? true}, '${priorityMethod || 'reliability'}',
                  ${insuranceEnabled ?? true}, ${finalInsurancePoolId})
          RETURNING *
        `));
        
        return res.status(201).json({ 
          message: 'Risk settings created',
          settings: result.rows[0] 
        });
      }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Risk settings API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
