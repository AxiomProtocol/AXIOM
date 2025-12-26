import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';
import { authenticateAdmin, sendAuthError, requireRole } from '../../../../../lib/server/adminAuth';
import { rejectProposal } from '../../../../../lib/server/proposals/executor';
import { allowedApproverRoles, isValidActionType, ActionType } from '../../../../../lib/server/adminPolicy';

interface RejectRequest {
  rejection_reason: string;
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

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'Proposal ID is required',
      requestId: actor.requestId,
    });
  }

  const body = req.body as RejectRequest;

  if (!body.rejection_reason) {
    return res.status(400).json({
      error: 'rejection_reason is required',
      requestId: actor.requestId,
    });
  }

  try {
    const proposalResult = await pool.query(
      `SELECT action_type, amount, created_by, status FROM admin_proposals WHERE id = $1`,
      [id]
    );

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Proposal not found',
        requestId: actor.requestId,
      });
    }

    const proposal = proposalResult.rows[0];

    if (proposal.status !== 'pending') {
      return res.status(409).json({
        error: `Proposal status is '${proposal.status}', expected 'pending'`,
        requestId: actor.requestId,
      });
    }

    if (proposal.created_by === actor.userId) {
      return res.status(403).json({
        error: 'Rejector must be a different user than the proposer',
        requestId: actor.requestId,
      });
    }

    if (!isValidActionType(proposal.action_type)) {
      return res.status(400).json({
        error: `Invalid action type: ${proposal.action_type}`,
        requestId: actor.requestId,
      });
    }

    const amount = proposal.amount ? parseFloat(proposal.amount) : undefined;
    const allowedRoles = allowedApproverRoles(proposal.action_type as ActionType, amount);

    const roleCheck = requireRole(actor, allowedRoles);
    if (!roleCheck.allowed) {
      return res.status(403).json({
        error: roleCheck.message,
        requestId: actor.requestId,
      });
    }

    const result = await rejectProposal(id, actor, body.rejection_reason);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        requestId: actor.requestId,
      });
    }

    return res.status(200).json({
      success: true,
      proposalId: id,
      status: 'rejected',
      requestId: actor.requestId,
    });
  } catch (error) {
    console.error(`[${actor.requestId}] Error rejecting proposal:`, error);
    return res.status(500).json({
      error: 'Failed to reject proposal',
      requestId: actor.requestId,
    });
  }
}
