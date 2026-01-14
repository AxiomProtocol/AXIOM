import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';
import { authenticateAdmin, sendAuthError, requireRole } from '../../../../../lib/server/adminAuth';

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

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'Proposal ID is required',
      requestId: actor.requestId,
    });
  }

  try {
    const proposalResult = await pool.query(
      `SELECT * FROM admin_proposals WHERE id = $1`,
      [id]
    );

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Proposal not found',
        requestId: actor.requestId,
      });
    }

    const eventsResult = await pool.query(
      `SELECT * FROM admin_proposal_events WHERE proposal_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    return res.status(200).json({
      proposal: proposalResult.rows[0],
      events: eventsResult.rows,
      requestId: actor.requestId,
    });
  } catch (error) {
    console.error(`[${actor.requestId}] Error fetching proposal:`, error);
    return res.status(500).json({
      error: 'Failed to fetch proposal',
      requestId: actor.requestId,
    });
  }
}
