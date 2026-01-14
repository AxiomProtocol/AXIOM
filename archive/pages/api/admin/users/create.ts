import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../../../server/db';
import { authenticateAdmin, sendAuthError, requireRole, AdminRole } from '../../../../lib/server/adminAuth';
import { createAuthUser } from '../../../../lib/server/supabaseAdmin';
import { isPrivilegedRole } from '../../../../lib/server/adminPolicy';

interface CreateUserRequest {
  email: string;
  password: string;
  role: AdminRole;
  metadata?: Record<string, unknown>;
  uniqueKey?: string;
  reason?: string;
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
    const body = req.body as CreateUserRequest;

    if (!body.email || !body.password || !body.role) {
      return res.status(400).json({
        error: 'Missing required fields: email, password, role',
        requestId: actor.requestId,
      });
    }

    const validRoles: AdminRole[] = ['superadmin', 'admin', 'finance', 'moderator'];
    if (!validRoles.includes(body.role)) {
      return res.status(400).json({
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        requestId: actor.requestId,
      });
    }

    if (isPrivilegedRole(body.role)) {
      if (!body.uniqueKey || !body.reason) {
        return res.status(400).json({
          error: 'Creating privileged users requires a proposal. Use POST /api/admin/proposals/create with action_type=user_create_privileged',
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
           VALUES ($1, 'user_create_privileged', 'user', $2, $3, 'pending', $4, $5, $6, $7, $8)`,
          [
            proposalId,
            body.email,
            JSON.stringify({ email: body.email, role: body.role, metadata: body.metadata }),
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
          message: 'Privileged user creation requires two-step approval',
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

    const user = await createAuthUser(body.email, body.password, body.metadata);

    await pool.query(
      `INSERT INTO user_roles (user_id, role, created_by_admin_id) VALUES ($1, $2, $3)`,
      [user.id, body.role, actor.userId]
    );

    await pool.query(
      `INSERT INTO admin_audit_log 
       (actor_user_id, actor_role, action, target_type, target_id, request_id, 
        ip_address, user_agent, after_state, reason)
       VALUES ($1, $2, 'user_created', 'user', $3, $4, $5, $6, $7, $8)`,
      [
        actor.userId,
        actor.role,
        user.id,
        actor.requestId,
        actor.ipAddress,
        actor.userAgent,
        JSON.stringify({ email: body.email, role: body.role }),
        body.reason || 'Direct user creation',
      ]
    );

    return res.status(201).json({
      userId: user.id,
      email: body.email,
      role: body.role,
      requestId: actor.requestId,
    });
  } catch (error) {
    console.error(`[${actor.requestId}] Error creating user:`, error);
    return res.status(500).json({
      error: 'Failed to create user',
      requestId: actor.requestId,
    });
  }
}
