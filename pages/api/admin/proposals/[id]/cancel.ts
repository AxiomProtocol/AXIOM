import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateAdmin, sendAuthError } from '../../../../../lib/server/adminAuth';
import { cancelProposal } from '../../../../../lib/server/proposals/executor';

interface CancelRequest {
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

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'Proposal ID is required',
      requestId: actor.requestId,
    });
  }

  const body = req.body as CancelRequest;

  if (!body.reason) {
    return res.status(400).json({
      error: 'reason is required',
      requestId: actor.requestId,
    });
  }

  try {
    const result = await cancelProposal(id, actor, body.reason);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        requestId: actor.requestId,
      });
    }

    return res.status(200).json({
      success: true,
      proposalId: id,
      status: 'cancelled',
      requestId: actor.requestId,
    });
  } catch (error) {
    console.error(`[${actor.requestId}] Error cancelling proposal:`, error);
    return res.status(500).json({
      error: 'Failed to cancel proposal',
      requestId: actor.requestId,
    });
  }
}
