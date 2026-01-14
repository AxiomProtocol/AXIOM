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

  const roleCheck = requireRole(actor, ['moderator', 'admin', 'finance', 'superadmin']);
  if (!roleCheck.allowed) {
    return res.status(403).json({
      error: roleCheck.message,
      requestId: actor.requestId,
    });
  }

  try {
    const {
      status,
      action_type,
      target_type,
      created_by,
      limit = '50',
      cursor,
    } = req.query;

    const params: (string | number)[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    if (status && typeof status === 'string') {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (action_type && typeof action_type === 'string') {
      conditions.push(`action_type = $${paramIndex++}`);
      params.push(action_type);
    }

    if (target_type && typeof target_type === 'string') {
      conditions.push(`target_type = $${paramIndex++}`);
      params.push(target_type);
    }

    if (created_by && typeof created_by === 'string') {
      conditions.push(`created_by = $${paramIndex++}`);
      params.push(created_by);
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
        action_type,
        target_type,
        target_id,
        amount,
        status,
        reason,
        created_by,
        created_at,
        expires_at,
        approved_by,
        approved_at,
        executed_by,
        executed_at,
        rejected_by,
        rejected_at
      FROM admin_proposals
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex}
    `;

    const result = await pool.query(query, params);

    const proposals = result.rows;
    const nextCursor = proposals.length === limitNum
      ? proposals[proposals.length - 1].created_at?.toISOString()
      : null;

    return res.status(200).json({
      proposals,
      nextCursor,
      requestId: actor.requestId,
    });
  } catch (error) {
    console.error(`[${actor.requestId}] Error listing proposals:`, error);
    return res.status(500).json({
      error: 'Failed to list proposals',
      requestId: actor.requestId,
    });
  }
}
