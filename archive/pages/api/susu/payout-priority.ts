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
      
      const config = await db.execute(sql`
        SELECT * FROM susu_payout_priority_configs
        WHERE (${groupId}::int IS NOT NULL AND group_id = ${groupId})
           OR (${poolId}::text IS NOT NULL AND pool_id = ${poolId})
        LIMIT 1
      `);
      
      const payoutOrder = await db.execute(sql`
        SELECT 
          po.*,
          u.email as user_email,
          u.wallet_address as user_wallet,
          srp.reliability_score
        FROM susu_payout_order po
        LEFT JOIN users u ON po.user_id = u.id
        LEFT JOIN susu_reliability_profiles srp ON po.user_id = srp.user_id
        WHERE (${groupId}::int IS NOT NULL AND po.group_id = ${groupId})
           OR (${poolId}::text IS NOT NULL AND po.pool_id = ${poolId})
        ORDER BY po.payout_position ASC
      `);
      
      return res.json({
        config: config.rows[0] || null,
        payoutOrder: payoutOrder.rows
      });
    }
    
    if (req.method === 'POST') {
      const action = req.body.action;
      
      if (action === 'configure') {
        const groupId = req.body.groupId ? parseInt(req.body.groupId) : null;
        const poolId = req.body.poolId || null;
        const priorityMethod = req.body.priorityMethod || 'reliability';
        const reliabilityWeight = parseFloat(req.body.reliabilityWeight) || 0.70;
        const tenureWeight = parseFloat(req.body.tenureWeight) || 0.20;
        const collateralWeight = parseFloat(req.body.collateralWeight) || 0.10;
        const minReliabilityForEarlyPayout = parseInt(req.body.minReliabilityForEarlyPayout) || 80;
        
        const validMethods = ['reliability', 'hybrid', 'random'];
        if (!validMethods.includes(priorityMethod)) {
          return res.status(400).json({ error: 'Invalid priority method' });
        }
        
        if (reliabilityWeight + tenureWeight + collateralWeight > 1.01) {
          return res.status(400).json({ error: 'Weights must sum to 1.0 or less' });
        }
        
        const existing = await db.execute(sql`
          SELECT id FROM susu_payout_priority_configs
          WHERE (${groupId}::int IS NOT NULL AND group_id = ${groupId})
             OR (${poolId}::text IS NOT NULL AND pool_id = ${poolId})
        `);
        
        if (existing.rows.length > 0) {
          const result = await db.execute(sql`
            UPDATE susu_payout_priority_configs SET
              priority_method = ${priorityMethod},
              reliability_weight = ${reliabilityWeight},
              tenure_weight = ${tenureWeight},
              collateral_weight = ${collateralWeight},
              min_reliability_for_early_payout = ${minReliabilityForEarlyPayout},
              updated_at = NOW()
            WHERE id = ${existing.rows[0].id}
            RETURNING *
          `);
          return res.json({ config: result.rows[0] });
        } else {
          const result = await db.execute(sql`
            INSERT INTO susu_payout_priority_configs 
            (group_id, pool_id, priority_method, reliability_weight, tenure_weight, 
             collateral_weight, min_reliability_for_early_payout)
            VALUES (${groupId}, ${poolId}, ${priorityMethod}, ${reliabilityWeight},
                    ${tenureWeight}, ${collateralWeight}, ${minReliabilityForEarlyPayout})
            RETURNING *
          `);
          return res.status(201).json({ config: result.rows[0] });
        }
      }
      
      if (action === 'calculate') {
        const groupId = req.body.groupId ? parseInt(req.body.groupId) : null;
        const poolId = req.body.poolId || null;
        const members = req.body.members;
        
        if (!members || !Array.isArray(members)) {
          return res.status(400).json({ error: 'members array is required' });
        }
        
        const config = await db.execute(sql`
          SELECT * FROM susu_payout_priority_configs
          WHERE ((${groupId}::int IS NOT NULL AND group_id = ${groupId})
             OR (${poolId}::text IS NOT NULL AND pool_id = ${poolId}))
          AND is_active = true
          LIMIT 1
        `);
        
        const weights = config.rows[0] || {
          reliability_weight: 0.70,
          tenure_weight: 0.20,
          collateral_weight: 0.10
        };
        
        const memberScores = [];
        for (const member of members) {
          const memberId = parseInt(member.userId);
          if (isNaN(memberId)) continue;
          
          const reliability = await db.execute(sql`
            SELECT reliability_score FROM susu_reliability_profiles
            WHERE user_id = ${memberId}
            LIMIT 1
          `);
          
          const collateral = await db.execute(sql`
            SELECT stake_amount FROM susu_collateral_stakes
            WHERE user_id = ${memberId} 
            AND ((${groupId}::int IS NOT NULL AND group_id = ${groupId})
               OR (${poolId}::text IS NOT NULL AND pool_id = ${poolId}))
            AND status = 'staked'
            LIMIT 1
          `);
          
          const reliabilityScore = reliability.rows[0]?.reliability_score || 50;
          const collateralAmount = parseFloat(collateral.rows[0]?.stake_amount || '0');
          const tenureDays = parseInt(member.tenureDays) || 0;
          
          const reliabilityComponent = (reliabilityScore / 100) * parseFloat(weights.reliability_weight);
          const tenureComponent = Math.min(tenureDays / 365, 1) * parseFloat(weights.tenure_weight);
          const collateralComponent = Math.min(collateralAmount / 1000, 1) * parseFloat(weights.collateral_weight);
          
          const priorityScore = reliabilityComponent + tenureComponent + collateralComponent;
          
          memberScores.push({
            userId: memberId,
            priorityScore,
            reliabilityComponent,
            tenureComponent,
            collateralComponent
          });
        }
        
        memberScores.sort((a, b) => b.priorityScore - a.priorityScore);
        
        await db.execute(sql`
          DELETE FROM susu_payout_order
          WHERE (${groupId}::int IS NOT NULL AND group_id = ${groupId})
             OR (${poolId}::text IS NOT NULL AND pool_id = ${poolId})
        `);
        
        for (let i = 0; i < memberScores.length; i++) {
          const m = memberScores[i];
          await db.execute(sql`
            INSERT INTO susu_payout_order 
            (group_id, pool_id, user_id, payout_position, priority_score,
             reliability_component, tenure_component, collateral_component)
            VALUES (${groupId}, ${poolId}, ${m.userId}, ${i + 1}, ${m.priorityScore}, 
                    ${m.reliabilityComponent}, ${m.tenureComponent}, ${m.collateralComponent})
          `);
        }
        
        return res.json({
          message: 'Payout order calculated',
          order: memberScores.map((m, i) => ({ ...m, position: i + 1 }))
        });
      }
      
      return res.status(400).json({ error: 'Invalid action. Use: configure or calculate' });
    }
    
    if (req.method === 'PATCH') {
      const orderId = parseInt(req.body.orderId);
      const isPaid = !!req.body.isPaid;
      const payoutTxHash = req.body.payoutTxHash || null;
      
      if (!orderId || isNaN(orderId)) {
        return res.status(400).json({ error: 'Valid orderId is required' });
      }
      
      if (payoutTxHash && !/^0x[a-fA-F0-9]{64}$/.test(payoutTxHash)) {
        return res.status(400).json({ error: 'Invalid transaction hash format' });
      }
      
      const result = await db.execute(sql`
        UPDATE susu_payout_order SET
          is_paid = ${isPaid},
          paid_at = ${isPaid ? sql`NOW()` : null},
          payout_tx_hash = ${payoutTxHash}
        WHERE id = ${orderId}
        RETURNING *
      `);
      
      return res.json({ payoutOrder: result.rows[0] });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Payout priority API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
