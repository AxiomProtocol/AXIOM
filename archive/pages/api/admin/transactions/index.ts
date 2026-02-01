import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { authenticateAdmin, sendAuthError, requireRole } from '../../../../lib/server/adminAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await authenticateAdmin(req);
  if (!authResult.success) {
    return sendAuthError(res, authResult);
  }

  const actor = authResult.actor;

  const roleCheck = requireRole(actor, ['finance', 'superadmin']);
  if (!roleCheck.allowed) {
    return res.status(403).json({
      error: roleCheck.message,
      requestId: actor.requestId,
    });
  }

  try {
    const { account_id, status, limit = '50', cursor } = req.query;

    const params: (string | number)[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    if (account_id && typeof account_id === 'string') {
      conditions.push(`account_id = $${paramIndex++}`);
      params.push(parseInt(account_id));
    }

    if (status && typeof status === 'string') {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (cursor && typeof cursor === 'string') {
      conditions.push(`created_at < $${paramIndex++}`);
      params.push(cursor);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    params.push(limitNum);

    const query = `
      SELECT 
        id, account_id, transaction_type, amount, currency, description,
        merchant_name, status, balance_after, created_at
      FROM checking_transactions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex}
    `;

    const result = await pool.query(query, params);

    const transactions = result.rows;
    const nextCursor = transactions.length === limitNum
      ? transactions[transactions.length - 1].created_at?.toISOString()
      : null;

    return res.status(200).json({
      transactions,
      nextCursor,
      requestId: actor.requestId,
    });
  } catch (error) {
    console.error(`[${actor.requestId}] Error listing transactions:`, error);
    return res.status(500).json({
      error: 'Failed to list transactions',
      requestId: actor.requestId,
    });
  }
}
