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
      
      const whereClause = groupId 
        ? `WHERE po.group_id = ${parseInt(groupId as string)}`
        : `WHERE po.pool_id = '${poolId}'`;
      
      const config = await db.execute(sql.raw(`
        SELECT * FROM susu_payout_priority_configs
        ${groupId ? `WHERE group_id = ${groupId}` : `WHERE pool_id = '${poolId}'`}
        LIMIT 1
      `));
      
      const payoutOrder = await db.execute(sql.raw(`
        SELECT 
          po.*,
          u.email as user_email,
          u.wallet_address as user_wallet,
          srp.reliability_score
        FROM susu_payout_order po
        LEFT JOIN users u ON po.user_id = u.id
        LEFT JOIN susu_reliability_profiles srp ON po.user_id = srp.user_id
        ${whereClause}
        ORDER BY po.payout_position ASC
      `));
      
      return res.json({
        config: config.rows[0] || null,
        payoutOrder: payoutOrder.rows
      });
    }
    
    if (req.method === 'POST') {
      const { action } = req.body;
      
      if (action === 'configure') {
        const { 
          groupId, poolId, priorityMethod, reliabilityWeight, 
          tenureWeight, collateralWeight, minReliabilityForEarlyPayout 
        } = req.body;
        
        const existing = await db.execute(sql.raw(`
          SELECT id FROM susu_payout_priority_configs
          WHERE ${groupId ? `group_id = ${groupId}` : `pool_id = '${poolId}'`}
        `));
        
        if (existing.rows.length > 0) {
          const result = await db.execute(sql.raw(`
            UPDATE susu_payout_priority_configs SET
              priority_method = '${priorityMethod || 'reliability'}',
              reliability_weight = ${reliabilityWeight || 0.70},
              tenure_weight = ${tenureWeight || 0.20},
              collateral_weight = ${collateralWeight || 0.10},
              min_reliability_for_early_payout = ${minReliabilityForEarlyPayout || 80},
              updated_at = NOW()
            WHERE id = ${existing.rows[0].id}
            RETURNING *
          `));
          return res.json({ config: result.rows[0] });
        } else {
          const result = await db.execute(sql.raw(`
            INSERT INTO susu_payout_priority_configs 
            (group_id, pool_id, priority_method, reliability_weight, tenure_weight, 
             collateral_weight, min_reliability_for_early_payout)
            VALUES (${groupId || 'NULL'}, ${poolId ? `'${poolId}'` : 'NULL'}, 
                    '${priorityMethod || 'reliability'}', ${reliabilityWeight || 0.70},
                    ${tenureWeight || 0.20}, ${collateralWeight || 0.10},
                    ${minReliabilityForEarlyPayout || 80})
            RETURNING *
          `));
          return res.status(201).json({ config: result.rows[0] });
        }
      }
      
      if (action === 'calculate') {
        const { groupId, poolId, members } = req.body;
        
        if (!members || !Array.isArray(members)) {
          return res.status(400).json({ error: 'members array is required' });
        }
        
        const config = await db.execute(sql.raw(`
          SELECT * FROM susu_payout_priority_configs
          WHERE ${groupId ? `group_id = ${groupId}` : `pool_id = '${poolId}'`}
          AND is_active = true
          LIMIT 1
        `));
        
        const weights = config.rows[0] || {
          reliability_weight: 0.70,
          tenure_weight: 0.20,
          collateral_weight: 0.10
        };
        
        const memberScores = [];
        for (const member of members) {
          const reliability = await db.execute(sql.raw(`
            SELECT reliability_score FROM susu_reliability_profiles
            WHERE user_id = ${member.userId}
            LIMIT 1
          `));
          
          const collateral = await db.execute(sql.raw(`
            SELECT stake_amount FROM susu_collateral_stakes
            WHERE user_id = ${member.userId} 
            AND ${groupId ? `group_id = ${groupId}` : `pool_id = '${poolId}'`}
            AND status = 'staked'
            LIMIT 1
          `));
          
          const reliabilityScore = reliability.rows[0]?.reliability_score || 50;
          const collateralAmount = parseFloat(collateral.rows[0]?.stake_amount || '0');
          const tenureDays = member.tenureDays || 0;
          
          const reliabilityComponent = (reliabilityScore / 100) * parseFloat(weights.reliability_weight);
          const tenureComponent = Math.min(tenureDays / 365, 1) * parseFloat(weights.tenure_weight);
          const collateralComponent = Math.min(collateralAmount / 1000, 1) * parseFloat(weights.collateral_weight);
          
          const priorityScore = reliabilityComponent + tenureComponent + collateralComponent;
          
          memberScores.push({
            userId: member.userId,
            priorityScore,
            reliabilityComponent,
            tenureComponent,
            collateralComponent
          });
        }
        
        memberScores.sort((a, b) => b.priorityScore - a.priorityScore);
        
        await db.execute(sql.raw(`
          DELETE FROM susu_payout_order
          WHERE ${groupId ? `group_id = ${groupId}` : `pool_id = '${poolId}'`}
        `));
        
        for (let i = 0; i < memberScores.length; i++) {
          const m = memberScores[i];
          await db.execute(sql.raw(`
            INSERT INTO susu_payout_order 
            (group_id, pool_id, user_id, payout_position, priority_score,
             reliability_component, tenure_component, collateral_component)
            VALUES (${groupId || 'NULL'}, ${poolId ? `'${poolId}'` : 'NULL'}, ${m.userId},
                    ${i + 1}, ${m.priorityScore}, ${m.reliabilityComponent},
                    ${m.tenureComponent}, ${m.collateralComponent})
          `));
        }
        
        return res.json({
          message: 'Payout order calculated',
          order: memberScores.map((m, i) => ({ ...m, position: i + 1 }))
        });
      }
      
      return res.status(400).json({ error: 'Invalid action. Use: configure or calculate' });
    }
    
    if (req.method === 'PATCH') {
      const { orderId, isPaid, payoutTxHash } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ error: 'orderId is required' });
      }
      
      const result = await db.execute(sql.raw(`
        UPDATE susu_payout_order SET
          is_paid = ${isPaid ? 'true' : 'false'},
          paid_at = ${isPaid ? 'NOW()' : 'NULL'},
          payout_tx_hash = ${payoutTxHash ? `'${payoutTxHash}'` : 'NULL'}
        WHERE id = ${orderId}
        RETURNING *
      `));
      
      return res.json({ payoutOrder: result.rows[0] });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Payout priority API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
