import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../../../server/db';
import { authenticateAdmin, sendAuthError, requireRole, AdminRole } from '../../../../lib/server/adminAuth';
import { isPrivilegedRole } from '../../../../lib/server/adminPolicy';

interface SetRoleRequest {
  userId: string;
  newRole: AdminRole;
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

  try {
    const body = req.body as SetRoleRequest;

    if (!body.userId || !body.newRole || !body.reason) {
      return res.status(400).json({
        error: 'Missing required fields: userId, newRole, reason',
        requestId: actor.requestId,
      });
    }

    const validRoles: AdminRole[] = ['superadmin', 'admin', 'finance', 'moderator'];
    if (!validRoles.includes(body.newRole)) {
      return res.status(400).json({
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        requestId: actor.requestId,
      });
    }

    const currentRoleResult = await pool.query(
      `SELECT role FROM user_roles WHERE user_id = $1`,
      [body.userId]
    );

    const currentRole = currentRoleResult.rows[0]?.role as AdminRole | null;

    const isEscalation = isPrivilegedRole(body.newRole) && 
      (body.newRole === 'superadmin' || body.newRole === 'admin');

    if (isEscalation) {
      const proposerRoleCheck = requireRole(actor, ['superadmin']);
      if (!proposerRoleCheck.allowed) {
        return res.status(403).json({
          error: 'Only superadmins can propose role escalation to admin/superadmin',
          requestId: actor.requestId,
        });
      }

      if (!body.uniqueKey) {
        return res.status(400).json({
          error: 'Role escalation requires a proposal. Use POST /api/admin/proposals/create with action_type=role_escalation',
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
           VALUES ($1, 'role_escalation', 'user', $2, $3, 'pending', $4, $5, $6, $7, $8)`,
          [
            proposalId,
            body.userId,
            JSON.stringify({ targetUserId: body.userId, currentRole, newRole: body.newRole }),
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
          message: 'Role escalation requires two-step approval by two superadmins',
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

    const directRoleCheck = requireRole(actor, ['admin', 'superadmin']);
    if (!directRoleCheck.allowed) {
      return res.status(403).json({
        error: directRoleCheck.message,
        requestId: actor.requestId,
      });
    }

    if (currentRole) {
      await pool.query(
        `UPDATE user_roles SET role = $1 WHERE user_id = $2`,
        [body.newRole, body.userId]
      );
    } else {
      await pool.query(
        `INSERT INTO user_roles (user_id, role, created_by_admin_id) VALUES ($1, $2, $3)`,
        [body.userId, body.newRole, actor.userId]
      );
    }

    await pool.query(
      `INSERT INTO admin_audit_log 
       (actor_user_id, actor_role, action, target_type, target_id, request_id, 
        ip_address, user_agent, before_state, after_state, reason)
       VALUES ($1, $2, 'role_changed', 'user', $3, $4, $5, $6, $7, $8, $9)`,
      [
        actor.userId,
        actor.role,
        body.userId,
        actor.requestId,
        actor.ipAddress,
        actor.userAgent,
        JSON.stringify({ role: currentRole }),
        JSON.stringify({ role: body.newRole }),
        body.reason,
      ]
    );

    return res.status(200).json({
      success: true,
      userId: body.userId,
      previousRole: currentRole,
      newRole: body.newRole,
      requestId: actor.requestId,
    });
  } catch (error) {
    console.error(`[${actor.requestId}] Error setting role:`, error);
    return res.status(500).json({
      error: 'Failed to set role',
      requestId: actor.requestId,
    });
  }
}
