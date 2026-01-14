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

  const roleCheck = requireRole(actor, ['admin', 'superadmin']);
  if (!roleCheck.allowed) {
    return res.status(403).json({
      error: roleCheck.message,
      requestId: actor.requestId,
    });
  }

  try {
    const {
      action,
      target_type,
      actor_user_id,
      limit = '50',
      cursor,
    } = req.query;

    const params: (string | number)[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    if (action && typeof action === 'string') {
      conditions.push(`action = $${paramIndex++}`);
      params.push(action);
    }

    if (target_type && typeof target_type === 'string') {
      conditions.push(`target_type = $${paramIndex++}`);
      params.push(target_type);
    }

    if (actor_user_id && typeof actor_user_id === 'string') {
      conditions.push(`actor_user_id = $${paramIndex++}`);
      params.push(actor_user_id);
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
        id,
        actor_user_id,
        actor_role,
        action,
        target_type,
        target_id,
        request_id,
        ip_address,
        reason,
        created_at
      FROM admin_audit_log
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex}
    `;

    const result = await pool.query(query, params);

    const logs = result.rows;
    const nextCursor = logs.length === limitNum
      ? logs[logs.length - 1].created_at?.toISOString()
      : null;

    return res.status(200).json({
      logs,
      nextCursor,
      requestId: actor.requestId,
    });
  } catch (error) {
    console.error(`[${actor.requestId}] Error listing audit logs:`, error);
    return res.status(500).json({
      error: 'Failed to list audit logs',
      requestId: actor.requestId,
    });
  }
}
