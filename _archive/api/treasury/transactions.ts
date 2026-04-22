import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { treasuryId, limit = '50' } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit as string) || 50, 1), 100);
    const parsedTreasuryId = treasuryId ? parseInt(treasuryId as string) : null;

    let result;
    
    if (parsedTreasuryId && !isNaN(parsedTreasuryId)) {
      result = await db.execute(sql`
        SELECT 
          tt.id,
          tt.treasury_id,
          t.name as treasury_name,
          tt.transaction_type,
          tt.amount_axusd,
          tt.memo,
          tt.tx_hash,
          tt.created_at
        FROM treasury_transactions tt
        LEFT JOIN treasuries t ON tt.treasury_id = t.id
        WHERE tt.treasury_id = ${parsedTreasuryId}
        ORDER BY tt.created_at DESC
        LIMIT ${parsedLimit}
      `);
    } else {
      result = await db.execute(sql`
        SELECT 
          tt.id,
          tt.treasury_id,
          t.name as treasury_name,
          tt.transaction_type,
          tt.amount_axusd,
          tt.memo,
          tt.tx_hash,
          tt.created_at
        FROM treasury_transactions tt
        LEFT JOIN treasuries t ON tt.treasury_id = t.id
        ORDER BY tt.created_at DESC
        LIMIT ${parsedLimit}
      `);
    }

    return res.status(200).json({
      success: true,
      data: result.rows.map((tx: any) => ({
        id: tx.id,
        treasuryId: tx.treasury_id,
        treasuryName: tx.treasury_name,
        transactionType: tx.transaction_type,
        amountAxusd: tx.amount_axusd,
        memo: tx.memo,
        txHash: tx.tx_hash,
        createdAt: tx.created_at
      }))
    });
  } catch (error) {
    console.error('Treasury transactions fetch error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
}
