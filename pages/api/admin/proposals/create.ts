import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../../../server/db';
import { authenticateAdmin, sendAuthError, requireRole, ActorContext } from '../../../../lib/server/adminAuth';
import {
  allowedProposerRoles,
  isValidActionType,
  ActionType,
  requiresTwoStep,
} from '../../../../lib/server/adminPolicy';

interface CreateProposalRequest {
  actionType: string;
  targetType: string;
  targetId: string;
  amount?: number;
  payload: Record<string, unknown>;
  reason: string;
  uniqueKey: string;
  expiresInHours?: number;
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

  try {
    const body = req.body as CreateProposalRequest;

    if (!body.actionType || !body.targetType || !body.targetId || !body.payload || !body.reason || !body.uniqueKey) {
      return res.status(400).json({
        error: 'Missing required fields: actionType, targetType, targetId, payload, reason, uniqueKey',
        requestId: actor.requestId,
      });
    }

    if (!isValidActionType(body.actionType)) {
      return res.status(400).json({
        error: `Invalid action type: ${body.actionType}`,
        requestId: actor.requestId,
      });
    }

    const actionType = body.actionType as ActionType;

    if (!requiresTwoStep(actionType)) {
      return res.status(400).json({
        error: `Action type '${actionType}' does not require two-step approval`,
        requestId: actor.requestId,
      });
    }

    const allowedRoles = allowedProposerRoles(actionType);
    const roleCheck = requireRole(actor, allowedRoles);
    if (!roleCheck.allowed) {
      return res.status(403).json({
        error: roleCheck.message,
        requestId: actor.requestId,
      });
    }

    const proposalId = uuidv4();
    const expiresAt = body.expiresInHours
      ? new Date(Date.now() + body.expiresInHours * 60 * 60 * 1000)
      : new Date(Date.now() + 72 * 60 * 60 * 1000);

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
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10, $11)`,
        [
          proposalId,
          body.actionType,
          body.targetType,
          body.targetId,
          body.amount ?? null,
          JSON.stringify(body.payload),
          body.reason,
          actor.userId,
          expiresAt,
          actor.requestId,
          body.uniqueKey,
        ]
      );

      await client.query(
        `INSERT INTO admin_proposal_events 
         (proposal_id, event_type, actor_user_id, actor_role, request_id, ip_address, user_agent, event_payload)
         VALUES ($1, 'created', $2, $3, $4, $5, $6, $7)`,
        [
          proposalId,
          actor.userId,
          actor.role,
          actor.requestId,
          actor.ipAddress,
          actor.userAgent,
          JSON.stringify({ action_type: body.actionType, target_type: body.targetType }),
        ]
      );

      await client.query(
        `INSERT INTO admin_audit_log 
         (actor_user_id, actor_role, action, target_type, target_id, request_id, 
          ip_address, user_agent, reason)
         VALUES ($1, $2, 'proposal_created', $3, $4, $5, $6, $7, $8)`,
        [
          actor.userId,
          actor.role,
          body.targetType,
          body.targetId,
          actor.requestId,
          actor.ipAddress,
          actor.userAgent,
          body.reason,
        ]
      );

      await client.query('COMMIT');

      return res.status(201).json({
        proposalId,
        requestId: actor.requestId,
        status: 'pending',
        expiresAt: expiresAt.toISOString(),
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`[${actor.requestId}] Error creating proposal:`, error);
    return res.status(500).json({
      error: 'Failed to create proposal',
      requestId: actor.requestId,
    });
  }
}
