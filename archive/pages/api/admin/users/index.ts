import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { authenticateAdmin, sendAuthError, requireRole } from '../../../../lib/server/adminAuth';
import { listAuthUsers } from '../../../../lib/server/supabaseAdmin';

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
    const { page = '1', per_page = '50' } = req.query;

    const authUsers = await listAuthUsers({
      page: parseInt(page as string) || 1,
      perPage: Math.min(parseInt(per_page as string) || 50, 100),
    });

    const userIds = authUsers.users.map(u => u.id);

    let rolesMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const rolesResult = await pool.query(
        `SELECT user_id, role FROM user_roles WHERE user_id = ANY($1)`,
        [userIds]
      );
      rolesMap = rolesResult.rows.reduce((acc, row) => {
        acc[row.user_id] = row.role;
        return acc;
      }, {} as Record<string, string>);
    }

    const users = authUsers.users.map(u => ({
      id: u.id,
      email: u.email,
      role: rolesMap[u.id] || null,
      emailConfirmed: u.email_confirmed_at != null,
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at,
      disabled: u.user_metadata?.disabled ?? false,
    }));

    return res.status(200).json({
      users,
      total: authUsers.users.length,
      requestId: actor.requestId,
    });
  } catch (error) {
    console.error(`[${actor.requestId}] Error listing users:`, error);
    return res.status(500).json({
      error: 'Failed to list users',
      requestId: actor.requestId,
    });
  }
}
