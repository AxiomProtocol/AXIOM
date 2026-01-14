import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../../../server/db';
import { authenticateAdmin, sendAuthError, requireRole, AdminRole } from '../../../../lib/server/adminAuth';
import { disableAuthUser } from '../../../../lib/server/supabaseAdmin';
import { isPrivilegedRole } from '../../../../lib/server/adminPolicy';

interface BanUserRequest {
  userId: string;
  banReason: string;
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

  const roleCheck = requireRole(actor, ['admin', 'superadmin']);
  if (!roleCheck.allowed) {
    return res.status(403).json({
      error: roleCheck.message,
      requestId: actor.requestId,
    });
  }

  try {
    const body = req.body as BanUserRequest;

    if (!body.userId || !body.banReason) {
      return res.status(400).json({
        error: 'Missing required fields: userId, banReason',
        requestId: actor.requestId,
      });
    }

    const roleResult = await pool.query(
      `SELECT role FROM user_roles WHERE user_id = $1`,
      [body.userId]
    );

    const targetRole = roleResult.rows[0]?.role as AdminRole | undefined;

    if (targetRole && isPrivilegedRole(targetRole)) {
      if (!body.uniqueKey) {
        return res.status(400).json({
          error: 'Banning privileged users requires a proposal. Use POST /api/admin/proposals/create with action_type=moderation_ban_privileged',
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
           (id, action_type, target_type, target_id, payload, status, reason, 
            created_by, expires_at, request_id, unique_key)
           VALUES ($1, 'moderation_ban_privileged', 'user', $2, $3, 'pending', $4, $5, $6, $7, $8)`,
          [
            proposalId,
            body.userId,
            JSON.stringify({ targetUserId: body.userId, currentRole: targetRole, banReason: body.banReason }),
            body.banReason,
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
          message: 'Banning privileged user requires superadmin approval',
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

    await disableAuthUser(body.userId);

    await pool.query(
      `INSERT INTO admin_audit_log 
       (actor_user_id, actor_role, action, target_type, target_id, request_id, 
        ip_address, user_agent, reason)
       VALUES ($1, $2, 'user_banned', 'user', $3, $4, $5, $6, $7)`,
      [
        actor.userId,
        actor.role,
        body.userId,
        actor.requestId,
        actor.ipAddress,
        actor.userAgent,
        body.banReason,
      ]
    );

    return res.status(200).json({
      success: true,
      userId: body.userId,
      banned: true,
      requestId: actor.requestId,
    });
  } catch (error) {
    console.error(`[${actor.requestId}] Error banning user:`, error);
    return res.status(500).json({
      error: 'Failed to ban user',
      requestId: actor.requestId,
    });
  }
}
