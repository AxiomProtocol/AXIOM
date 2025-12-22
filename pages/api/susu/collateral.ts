import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { userId, groupId, poolId, status } = req.query;
      
      let whereConditions: string[] = [];
      if (userId) whereConditions.push(`cs.user_id = ${parseInt(userId as string)}`);
      if (groupId) whereConditions.push(`cs.group_id = ${parseInt(groupId as string)}`);
      if (poolId) whereConditions.push(`cs.pool_id = '${poolId}'`);
      if (status) whereConditions.push(`cs.status = '${status}'`);
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';
      
      const stakes = await db.execute(sql.raw(`
        SELECT 
          cs.*,
          u.email as user_email,
          u.wallet_address as user_wallet,
          spg.name as group_name
        FROM susu_collateral_stakes cs
        LEFT JOIN users u ON cs.user_id = u.id
        LEFT JOIN susu_purpose_groups spg ON cs.group_id = spg.id
        ${whereClause}
        ORDER BY cs.created_at DESC
      `));
      
      const totalStaked = await db.execute(sql.raw(`
        SELECT COALESCE(SUM(stake_amount), 0) as total
        FROM susu_collateral_stakes
        WHERE status = 'staked'
      `));
      
      return res.json({
        stakes: stakes.rows,
        totalActivelyStaked: totalStaked.rows[0]?.total || '0'
      });
    }
    
    if (req.method === 'POST') {
      const { userId, groupId, poolId, stakeAmount, tokenType, stakeTxHash } = req.body;
      
      if (!userId || !stakeAmount) {
        return res.status(400).json({ error: 'userId and stakeAmount are required' });
      }
      
      const result = await db.execute(sql.raw(`
        INSERT INTO susu_collateral_stakes 
        (user_id, group_id, pool_id, stake_amount, token_type, stake_tx_hash, status, created_at)
        VALUES (${userId}, ${groupId || 'NULL'}, ${poolId ? `'${poolId}'` : 'NULL'}, 
                ${stakeAmount}, '${tokenType || 'AXM'}', ${stakeTxHash ? `'${stakeTxHash}'` : 'NULL'}, 
                'staked', NOW())
        RETURNING *
      `));
      
      return res.status(201).json({ 
        message: 'Collateral staked successfully',
        stake: result.rows[0]
      });
    }
    
    if (req.method === 'PATCH') {
      const { stakeId, action, txHash, forfeitAmount, forfeitReason } = req.body;
      
      if (!stakeId || !action) {
        return res.status(400).json({ error: 'stakeId and action are required' });
      }
      
      let updateQuery = '';
      
      if (action === 'release') {
        updateQuery = `
          UPDATE susu_collateral_stakes 
          SET status = 'released', 
              release_tx_hash = ${txHash ? `'${txHash}'` : 'NULL'},
              released_at = NOW()
          WHERE id = ${stakeId}
          RETURNING *
        `;
      } else if (action === 'forfeit') {
        updateQuery = `
          UPDATE susu_collateral_stakes 
          SET status = 'forfeited', 
              forfeit_tx_hash = ${txHash ? `'${txHash}'` : 'NULL'},
              forfeit_amount = ${forfeitAmount || 'stake_amount'},
              forfeit_reason = ${forfeitReason ? `'${forfeitReason}'` : 'NULL'},
              forfeited_at = NOW()
          WHERE id = ${stakeId}
          RETURNING *
        `;
      } else if (action === 'partial_forfeit') {
        updateQuery = `
          UPDATE susu_collateral_stakes 
          SET status = 'partial_forfeit', 
              forfeit_tx_hash = ${txHash ? `'${txHash}'` : 'NULL'},
              forfeit_amount = ${forfeitAmount || 0},
              forfeit_reason = ${forfeitReason ? `'${forfeitReason}'` : 'NULL'},
              forfeited_at = NOW()
          WHERE id = ${stakeId}
          RETURNING *
        `;
      } else {
        return res.status(400).json({ error: 'Invalid action. Use: release, forfeit, or partial_forfeit' });
      }
      
      const result = await db.execute(sql.raw(updateQuery));
      
      return res.json({ 
        message: `Collateral ${action} successful`,
        stake: result.rows[0]
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Collateral API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
