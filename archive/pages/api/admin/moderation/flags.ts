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

  const roleCheck = requireRole(actor, ['moderator', 'admin', 'superadmin']);
  if (!roleCheck.allowed) {
    return res.status(403).json({
      error: roleCheck.message,
      requestId: actor.requestId,
    });
  }

  try {
    const { status = 'pending', limit = '50', cursor } = req.query;

    const params: (string | number)[] = [status];
    let paramIndex = 2;

    let cursorCondition = '';
    if (cursor && typeof cursor === 'string') {
      cursorCondition = `AND created_at < $${paramIndex++}`;
      params.push(cursor);
    }

    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    params.push(limitNum);

    const query = `
      SELECT 
        id, event, wallet_address, ip_address, details, timestamp as created_at
      FROM compliance_audit
      WHERE event LIKE 'flag_%' OR event = 'moderation_flag'
      ${cursorCondition}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex}
    `;

    const result = await pool.query(query, params);

    const flags = result.rows;
    const nextCursor = flags.length === limitNum
      ? flags[flags.length - 1].created_at?.toISOString()
      : null;

    return res.status(200).json({
      flags,
      nextCursor,
      requestId: actor.requestId,
    });
  } catch (error) {
    console.error(`[${actor.requestId}] Error listing flags:`, error);
    return res.status(500).json({
      error: 'Failed to list moderation flags',
      requestId: actor.requestId,
    });
  }
}
