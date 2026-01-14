import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const groupId = req.query.groupId ? parseInt(req.query.groupId as string) : null;
      const poolId = req.query.poolId as string || null;
      
      if (!groupId && !poolId) {
        return res.status(400).json({ error: 'groupId or poolId is required' });
      }
      
      const settings = await db.execute(sql`
        SELECT 
          srs.*,
          sip.name as insurance_pool_name,
          sip.total_balance as insurance_pool_balance
        FROM susu_risk_settings srs
        LEFT JOIN susu_insurance_pools sip ON srs.insurance_pool_id = sip.id
        WHERE (${groupId}::int IS NOT NULL AND srs.group_id = ${groupId})
           OR (${poolId}::text IS NOT NULL AND srs.pool_id = ${poolId})
        LIMIT 1
      `);
      
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
      const groupId = req.body.groupId ? parseInt(req.body.groupId) : null;
      const poolId = req.body.poolId || null;
      const collateralRequired = !!req.body.collateralRequired;
      const minCollateralAmount = req.body.minCollateralAmount ? parseFloat(req.body.minCollateralAmount) : null;
      const collateralMultiplier = parseFloat(req.body.collateralMultiplier) || 1.00;
      const vettingRequired = !!req.body.vettingRequired;
      const vettingVotesRequired = parseInt(req.body.vettingVotesRequired) || 3;
      const vettingApprovalThreshold = parseFloat(req.body.vettingApprovalThreshold) || 0.66;
      const vettingPeriodDays = parseInt(req.body.vettingPeriodDays) || 3;
      const priorityEnabled = req.body.priorityEnabled !== false;
      const priorityMethod = req.body.priorityMethod || 'reliability';
      const insuranceEnabled = req.body.insuranceEnabled !== false;
      const insurancePoolId = req.body.insurancePoolId ? parseInt(req.body.insurancePoolId) : null;
      
      if (!groupId && !poolId) {
        return res.status(400).json({ error: 'groupId or poolId is required' });
      }
      
      const validMethods = ['reliability', 'hybrid', 'random'];
      if (!validMethods.includes(priorityMethod)) {
        return res.status(400).json({ error: 'Invalid priority method' });
      }
      
      if (vettingApprovalThreshold < 0 || vettingApprovalThreshold > 1) {
        return res.status(400).json({ error: 'vettingApprovalThreshold must be between 0 and 1' });
      }
      
      const existing = await db.execute(sql`
        SELECT id FROM susu_risk_settings
        WHERE (${groupId}::int IS NOT NULL AND group_id = ${groupId})
           OR (${poolId}::text IS NOT NULL AND pool_id = ${poolId})
      `);
      
      const defaultInsurancePool = await db.execute(sql`
        SELECT id FROM susu_insurance_pools WHERE is_active = true LIMIT 1
      `);
      
      const finalInsurancePoolId = insurancePoolId || defaultInsurancePool.rows[0]?.id || null;
      
      if (existing.rows.length > 0) {
        const result = await db.execute(sql`
          UPDATE susu_risk_settings SET
            collateral_required = ${collateralRequired},
            min_collateral_amount = ${minCollateralAmount},
            collateral_multiplier = ${collateralMultiplier},
            vetting_required = ${vettingRequired},
            vetting_votes_required = ${vettingVotesRequired},
            vetting_approval_threshold = ${vettingApprovalThreshold},
            vetting_period_days = ${vettingPeriodDays},
            priority_enabled = ${priorityEnabled},
            priority_method = ${priorityMethod},
            insurance_enabled = ${insuranceEnabled},
            insurance_pool_id = ${finalInsurancePoolId},
            updated_at = NOW()
          WHERE id = ${existing.rows[0].id}
          RETURNING *
        `);
        
        return res.json({ 
          message: 'Risk settings updated',
          settings: result.rows[0] 
        });
      } else {
        const result = await db.execute(sql`
          INSERT INTO susu_risk_settings 
          (group_id, pool_id, collateral_required, min_collateral_amount, collateral_multiplier,
           vetting_required, vetting_votes_required, vetting_approval_threshold, vetting_period_days,
           priority_enabled, priority_method, insurance_enabled, insurance_pool_id)
          VALUES (${groupId}, ${poolId}, ${collateralRequired}, ${minCollateralAmount}, ${collateralMultiplier},
                  ${vettingRequired}, ${vettingVotesRequired}, ${vettingApprovalThreshold}, ${vettingPeriodDays},
                  ${priorityEnabled}, ${priorityMethod}, ${insuranceEnabled}, ${finalInsurancePoolId})
          RETURNING *
        `);
        
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
