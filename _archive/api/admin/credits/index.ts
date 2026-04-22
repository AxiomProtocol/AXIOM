import { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { isAdminWallet } from '../../../../lib/admin/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminWallet = req.headers['x-admin-wallet'] as string;
  
  if (!adminWallet || !isAdminWallet(adminWallet)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  if (req.method === 'GET') {
    return getCreditsLedgers(req, res);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function getCreditsLedgers(req: NextApiRequest, res: NextApiResponse) {
  const client = await pool.connect();
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const operatorId = req.query.operatorId as string;

    let query = `
      SELECT 
        cl.*, 
        no.operator_id as op_id,
        no.wallet_address,
        no.display_name,
        no.status as operator_status
      FROM credits_ledger cl
      INNER JOIN node_operators no ON cl.operator_id = no.operator_id
    `;
    const params: any[] = [];

    if (operatorId) {
      query += ' WHERE cl.operator_id = $1';
      params.push(operatorId);
    }

    query += ' ORDER BY cl.updated_at DESC NULLS LAST';
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const ledgersResult = await client.query(query, params);

    const totalsResult = await client.query(`
      SELECT 
        COALESCE(SUM(available_balance::numeric), 0) as total_available,
        COALESCE(SUM(pending_balance::numeric), 0) as total_pending,
        COALESCE(SUM(total_earned::numeric), 0) as total_earned,
        COALESCE(SUM(total_redeemed::numeric), 0) as total_redeemed,
        COALESCE(SUM(total_slashed::numeric), 0) as total_slashed,
        COUNT(*) as count
      FROM credits_ledger
    `);

    const totals = totalsResult.rows[0];

    return res.status(200).json({
      success: true,
      ledgers: ledgersResult.rows.map(l => ({
        operatorId: l.operator_id,
        walletAddress: l.wallet_address,
        displayName: l.display_name,
        operatorStatus: l.operator_status,
        availableBalance: l.available_balance,
        pendingBalance: l.pending_balance,
        totalEarned: l.total_earned,
        totalRedeemed: l.total_redeemed,
        totalSlashed: l.total_slashed,
        lastSyncedAt: l.last_synced_at,
        updatedAt: l.updated_at,
      })),
      summary: {
        totalAvailable: totals.total_available?.toString() || '0',
        totalPending: totals.total_pending?.toString() || '0',
        totalEarned: totals.total_earned?.toString() || '0',
        totalRedeemed: totals.total_redeemed?.toString() || '0',
        totalSlashed: totals.total_slashed?.toString() || '0',
        operatorCount: parseInt(totals.count) || 0,
      },
      pagination: {
        limit,
        offset,
        hasMore: ledgersResult.rows.length === limit,
      },
    });
  } catch (error) {
    console.error('Error fetching credits ledgers:', error);
    return res.status(500).json({ error: 'Failed to fetch credits ledgers' });
  } finally {
    client.release();
  }
}
