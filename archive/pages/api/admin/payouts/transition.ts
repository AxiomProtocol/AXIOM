import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../../../server/db';
import { authenticateAdmin, sendAuthError, requireRole } from '../../../../lib/server/adminAuth';
import { isValidPayoutTransition, isPayoutReversal } from '../../../../lib/server/adminPolicy';

interface TransitionRequest {
  payoutId: string;
  toStatus: string;
  reason: string;
  uniqueKey?: string;
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

  const roleCheck = requireRole(actor, ['finance', 'admin', 'superadmin']);
  if (!roleCheck.allowed) {
    return res.status(403).json({
      error: roleCheck.message,
      requestId: actor.requestId,
    });
  }

  try {
    const body = req.body as TransitionRequest;

    if (!body.payoutId || !body.toStatus || !body.reason) {
      return res.status(400).json({
        error: 'Missing required fields: payoutId, toStatus, reason',
        requestId: actor.requestId,
      });
    }

    const payoutResult = await pool.query(
      `SELECT payment_id, status, amount_usd FROM keygrow_payments WHERE payment_id = $1`,
      [body.payoutId]
    );

    if (payoutResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Payout not found',
        requestId: actor.requestId,
      });
    }

    const payout = payoutResult.rows[0];
    const fromStatus = payout.status;

    if (!isValidPayoutTransition(fromStatus, body.toStatus)) {
      return res.status(400).json({
        error: `Invalid transition from '${fromStatus}' to '${body.toStatus}'`,
        requestId: actor.requestId,
      });
    }

    if (isPayoutReversal(fromStatus, body.toStatus)) {
      if (!body.uniqueKey) {
        return res.status(400).json({
          error: 'Payout reversals require a proposal. Use POST /api/admin/proposals/create with action_type=payout_reverse',
          requestId: actor.requestId,
        });
      }

      const proposalId = uuidv4();
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

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
            requestId: actor.requestId,
          });
        }

        await client.query(
          `INSERT INTO admin_proposals 
           (id, action_type, target_type, target_id, amount, payload, status, reason, 
            created_by, expires_at, request_id, unique_key)
           VALUES ($1, 'payout_reverse', 'payout', $2, $3, $4, 'pending', $5, $6, $7, $8, $9)`,
          [
            proposalId,
            body.payoutId,
            payout.amount_usd,
            JSON.stringify({ payoutId: body.payoutId, currentStatus: fromStatus }),
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
          message: 'Payout reversal requires superadmin approval',
          proposalId,
          status: 'pending_approval',
          requestId: actor.requestId,
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE keygrow_payments SET status = $1 WHERE payment_id = $2`,
        [body.toStatus, body.payoutId]
      );

      await client.query(
        `INSERT INTO payout_state_history 
         (payout_id, from_status, to_status, changed_by, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [body.payoutId, fromStatus, body.toStatus, actor.userId, body.reason]
      );

      await client.query(
        `INSERT INTO admin_audit_log 
         (actor_user_id, actor_role, action, target_type, target_id, request_id, 
          ip_address, user_agent, before_state, after_state, reason)
         VALUES ($1, $2, 'payout_transition', 'payout', $3, $4, $5, $6, $7, $8, $9)`,
        [
          actor.userId,
          actor.role,
          body.payoutId,
          actor.requestId,
          actor.ipAddress,
          actor.userAgent,
          JSON.stringify({ status: fromStatus }),
          JSON.stringify({ status: body.toStatus }),
          body.reason,
        ]
      );

      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        payoutId: body.payoutId,
        fromStatus,
        toStatus: body.toStatus,
        requestId: actor.requestId,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`[${actor.requestId}] Error transitioning payout:`, error);
    return res.status(500).json({
      error: 'Failed to transition payout',
      requestId: actor.requestId,
    });
  }
}
