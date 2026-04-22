/**
 * Operator-only: advance a proposal status.
 *
 *   POST { proposalId, toStatus, executedTxHash?, reason? }
 *   Headers: x-admin-key
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { isValidOperatorKey, OPERATOR_HEADER_KEY } from '../../../../lib/capinfra/operatorAuth';
import { advanceStatus, type ProposalStatus } from '../../../../lib/capinfra/bridgeAllowlist/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  const adminKey =
    (req.headers[OPERATOR_HEADER_KEY] as string | undefined) ??
    (req.headers[OPERATOR_HEADER_KEY.toLowerCase()] as string | undefined);
  if (!isValidOperatorKey(adminKey)) {
    return res.status(401).json({ ok: false, error: 'operator key required' });
  }
  const body = (req.body ?? {}) as {
    proposalId?: string;
    toStatus?: ProposalStatus;
    executedTxHash?: string | null;
    reason?: string | null;
  };
  if (!body.proposalId || !body.toStatus) {
    return res.status(400).json({ ok: false, error: 'proposalId, toStatus required' });
  }
  try {
    const proposal = await advanceStatus({
      proposalId: body.proposalId,
      toStatus: body.toStatus,
      actor: adminKey ? 'operator' : 'unknown',
      executedTxHash: body.executedTxHash ?? null,
      reason: body.reason ?? null,
    });
    return res.status(200).json({ ok: true, proposal });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err instanceof Error ? err.message : 'unknown' });
  }
}
