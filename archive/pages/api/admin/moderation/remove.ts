import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { authenticateAdmin, sendAuthError, requireRole } from '../../../../lib/server/adminAuth';

interface RemoveRequest {
  flagId: number;
  reason: string;
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

  const roleCheck = requireRole(actor, ['moderator', 'admin', 'superadmin']);
  if (!roleCheck.allowed) {
    return res.status(403).json({
      error: roleCheck.message,
      requestId: actor.requestId,
    });
  }

  try {
    const body = req.body as RemoveRequest;

    if (!body.flagId || !body.reason) {
      return res.status(400).json({
        error: 'Missing required fields: flagId, reason',
        requestId: actor.requestId,
      });
    }

    const flagResult = await pool.query(
      `SELECT * FROM compliance_audit WHERE id = $1`,
      [body.flagId]
    );

    if (flagResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Flag not found',
        requestId: actor.requestId,
      });
    }

    const flag = flagResult.rows[0];

    await pool.query(
      `UPDATE compliance_audit 
       SET details = jsonb_set(COALESCE(details, '{}'::jsonb), '{resolved}', 'true'::jsonb),
           event = CONCAT(event, '_resolved')
       WHERE id = $1`,
      [body.flagId]
    );

    await pool.query(
      `INSERT INTO admin_audit_log 
       (actor_user_id, actor_role, action, target_type, target_id, request_id, 
        ip_address, user_agent, before_state, reason)
       VALUES ($1, $2, 'moderation_flag_removed', 'flag', $3, $4, $5, $6, $7, $8)`,
      [
        actor.userId,
        actor.role,
        body.flagId.toString(),
        actor.requestId,
        actor.ipAddress,
        actor.userAgent,
        JSON.stringify(flag),
        body.reason,
      ]
    );

    return res.status(200).json({
      success: true,
      flagId: body.flagId,
      removed: true,
      requestId: actor.requestId,
    });
  } catch (error) {
    console.error(`[${actor.requestId}] Error removing flag:`, error);
    return res.status(500).json({
      error: 'Failed to remove flag',
      requestId: actor.requestId,
    });
  }
}
