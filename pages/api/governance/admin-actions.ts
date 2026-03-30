/**
 * GET /api/governance/admin-actions
 * Returns the last N admin actions from the admin_action_log table.
 *
 * Auth: x-admin-key header (ADMIN_SOLVENCY_KEY)
 * Query: ?limit=50 (default 50, max 200)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ERC3643Service } from '../../../lib/services/ERC3643Service';
import { validateAdminKey } from '../../../src/config/adminRoles';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!validateAdminKey(req as unknown as { headers: Record<string, string | string[] | undefined> })) {
    return res.status(401).json({ error: 'Unauthorized — invalid admin key' });
  }

  const limitParam = parseInt(String(req.query.limit ?? '50'), 10);
  const limit = Math.min(Math.max(limitParam, 1), 200);

  try {
    const actions = await ERC3643Service.getAdminActionLog(limit);
    return res.status(200).json({
      success: true,
      count: actions.length,
      limit,
      asOf: new Date().toISOString(),
      actions,
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error('[admin-actions] Error:', e);
    return res.status(500).json({ error: e?.message ?? String(err) });
  }
}
