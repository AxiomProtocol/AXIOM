import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const groupId = req.query.groupId ? parseInt(req.query.groupId as string) : null;
      const poolId = req.query.poolId as string || null;
      const status = req.query.status as string || null;
      
      const validStatuses = ['staked', 'released', 'forfeited', 'partial_forfeit'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      
      const stakes = await db.execute(sql`
        SELECT 
          cs.*,
          u.email as user_email,
          u.wallet_address as user_wallet,
          spg.name as group_name
        FROM susu_collateral_stakes cs
        LEFT JOIN users u ON cs.user_id = u.id
        LEFT JOIN susu_purpose_groups spg ON cs.group_id = spg.id
        WHERE 
          (${userId}::int IS NULL OR cs.user_id = ${userId})
          AND (${groupId}::int IS NULL OR cs.group_id = ${groupId})
          AND (${poolId}::text IS NULL OR cs.pool_id = ${poolId})
          AND (${status}::text IS NULL OR cs.status = ${status}::susu_collateral_status)
        ORDER BY cs.created_at DESC
      `);
      
      const totalStaked = await db.execute(sql`
        SELECT COALESCE(SUM(stake_amount), 0) as total
        FROM susu_collateral_stakes
        WHERE status = 'staked'
      `);
      
      return res.json({
        stakes: stakes.rows,
        totalActivelyStaked: totalStaked.rows[0]?.total || '0'
      });
    }
    
    if (req.method === 'POST') {
      const userId = parseInt(req.body.userId);
      const groupId = req.body.groupId ? parseInt(req.body.groupId) : null;
      const poolId = req.body.poolId || null;
      const stakeAmount = parseFloat(req.body.stakeAmount);
      const tokenType = req.body.tokenType || 'AXM';
      const stakeTxHash = req.body.stakeTxHash || null;
      
      if (!userId || isNaN(userId) || !stakeAmount || isNaN(stakeAmount) || stakeAmount <= 0) {
        return res.status(400).json({ error: 'Valid userId and stakeAmount are required' });
      }
      
      const validTokenTypes = ['AXM', 'USDC', 'USDT', 'DAI'];
      if (!validTokenTypes.includes(tokenType)) {
        return res.status(400).json({ error: 'Invalid token type' });
      }
      
      if (stakeTxHash && !/^0x[a-fA-F0-9]{64}$/.test(stakeTxHash)) {
        return res.status(400).json({ error: 'Invalid transaction hash format' });
      }
      
      const result = await db.execute(sql`
        INSERT INTO susu_collateral_stakes 
        (user_id, group_id, pool_id, stake_amount, token_type, stake_tx_hash, status, created_at)
        VALUES (${userId}, ${groupId}, ${poolId}, ${stakeAmount}, ${tokenType}, ${stakeTxHash}, 'staked', NOW())
        RETURNING *
      `);
      
      return res.status(201).json({ 
        message: 'Collateral staked successfully',
        stake: result.rows[0]
      });
    }
    
    if (req.method === 'PATCH') {
      const stakeId = parseInt(req.body.stakeId);
      const action = req.body.action;
      const txHash = req.body.txHash || null;
      const forfeitAmount = req.body.forfeitAmount ? parseFloat(req.body.forfeitAmount) : null;
      const forfeitReason = req.body.forfeitReason || null;
      
      if (!stakeId || isNaN(stakeId)) {
        return res.status(400).json({ error: 'Valid stakeId is required' });
      }
      
      const validActions = ['release', 'forfeit', 'partial_forfeit'];
      if (!action || !validActions.includes(action)) {
        return res.status(400).json({ error: 'Invalid action. Use: release, forfeit, or partial_forfeit' });
      }
      
      if (txHash && !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        return res.status(400).json({ error: 'Invalid transaction hash format' });
      }
      
      const existing = await db.execute(sql`
        SELECT stake_amount FROM susu_collateral_stakes WHERE id = ${stakeId}
      `);
      
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Stake not found' });
      }
      
      const existingStakeAmount = parseFloat(existing.rows[0].stake_amount);
      
      let result;
      
      if (action === 'release') {
        result = await db.execute(sql`
          UPDATE susu_collateral_stakes 
          SET status = 'released', 
              release_tx_hash = ${txHash},
              released_at = NOW()
          WHERE id = ${stakeId}
          RETURNING *
        `);
      } else if (action === 'forfeit') {
        result = await db.execute(sql`
          UPDATE susu_collateral_stakes 
          SET status = 'forfeited', 
              forfeit_tx_hash = ${txHash},
              forfeit_amount = ${existingStakeAmount},
              forfeit_reason = ${forfeitReason},
              forfeited_at = NOW()
          WHERE id = ${stakeId}
          RETURNING *
        `);
      } else if (action === 'partial_forfeit') {
        const actualForfeitAmount = forfeitAmount && forfeitAmount > 0 ? forfeitAmount : 0;
        result = await db.execute(sql`
          UPDATE susu_collateral_stakes 
          SET status = 'partial_forfeit', 
              forfeit_tx_hash = ${txHash},
              forfeit_amount = ${actualForfeitAmount},
              forfeit_reason = ${forfeitReason},
              forfeited_at = NOW()
          WHERE id = ${stakeId}
          RETURNING *
        `);
      }
      
      return res.json({ 
        message: `Collateral ${action} successful`,
        stake: result?.rows[0]
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Collateral API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
