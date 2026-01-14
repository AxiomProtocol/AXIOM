import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../../../server/db';
import { authenticateAdmin, sendAuthError, requireRole } from '../../../../lib/server/adminAuth';

interface ReverseRequest {
  transactionId: string;
  reason: string;
  uniqueKey: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await authenticateAdmin(req);
  if (!authResult.success) {
    return sendAuthError(res, authResult);
  }

  const actor = authResult.actor;

  const roleCheck = requireRole(actor, ['admin', 'finance', 'superadmin']);
  if (!roleCheck.allowed) {
    return res.status(403).json({
      error: roleCheck.message,
      requestId: actor.requestId,
    });
  }

  try {
    const body = req.body as ReverseRequest;

    if (!body.transactionId || !body.reason || !body.uniqueKey) {
      return res.status(400).json({
        error: 'Missing required fields: transactionId, reason, uniqueKey',
        requestId: actor.requestId,
      });
    }

    const txResult = await pool.query(
      `SELECT id, account_id, amount, transaction_type, status FROM checking_transactions WHERE id = $1`,
      [body.transactionId]
    );

    if (txResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Transaction not found',
        requestId: actor.requestId,
      });
    }

    const transaction = txResult.rows[0];

    if (transaction.transaction_type === 'REVERSAL') {
      return res.status(400).json({
        error: 'Cannot reverse a reversal transaction',
        requestId: actor.requestId,
      });
    }

    const proposalId = uuidv4();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const amount = Math.abs(parseFloat(transaction.amount));

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingResult = await client.query(
        'SELECT id, status FROM admin_proposals WHERE unique_key = $1',
        [body.uniqueKey]
      );

      if (existingResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Proposal with this unique_key already exists',
          existingProposalId: existingResult.rows[0].id,
          existingStatus: existingResult.rows[0].status,
          requestId: actor.requestId,
        });
      }

      await client.query(
        `INSERT INTO admin_proposals 
         (id, action_type, target_type, target_id, amount, payload, status, reason, 
          created_by, expires_at, request_id, unique_key)
         VALUES ($1, 'transaction_reverse', 'transaction', $2, $3, $4, 'pending', $5, $6, $7, $8, $9)`,
        [
          proposalId,
          body.transactionId,
          amount,
          JSON.stringify({
            originalTransactionId: body.transactionId,
            amount: parseFloat(transaction.amount),
            accountId: transaction.account_id,
            originalType: transaction.transaction_type,
          }),
          body.reason,
          actor.userId,
          expiresAt,
          actor.requestId,
          body.uniqueKey,
        ]
      );

      await client.query(
        `INSERT INTO admin_proposal_events 
         (proposal_id, event_type, actor_user_id, actor_role, request_id, ip_address, user_agent)
         VALUES ($1, 'created', $2, $3, $4, $5, $6)`,
        [proposalId, actor.userId, actor.role, actor.requestId, actor.ipAddress, actor.userAgent]
      );

      await client.query('COMMIT');

      return res.status(202).json({
        message: 'Transaction reversal requires two-step approval',
        proposalId,
        status: 'pending_approval',
        amount,
        requestId: actor.requestId,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`[${actor.requestId}] Error creating reversal proposal:`, error);
    return res.status(500).json({
      error: 'Failed to create reversal proposal',
      requestId: actor.requestId,
    });
  }
}
