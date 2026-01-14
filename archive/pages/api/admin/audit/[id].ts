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

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'Audit log ID is required',
      requestId: actor.requestId,
    });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM admin_audit_log WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Audit log not found',
        requestId: actor.requestId,
      });
    }

    return res.status(200).json({
      log: result.rows[0],
      requestId: actor.requestId,
    });
  } catch (error) {
    console.error(`[${actor.requestId}] Error fetching audit log:`, error);
    return res.status(500).json({
      error: 'Failed to fetch audit log',
      requestId: actor.requestId,
    });
  }
}
