/**
 * Operator-only: full claim listing (no PII strip), claim detail, and
 * status updates for the Loss Coverage Reserve.
 *
 *   GET  ?claimId=<id>?       → if claimId, full claim record; else full list
 *   POST { claimId, toStatus, reviewerNotes?, paidAmountCents?, paidTxHash? }
 *   Headers: x-admin-key
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { isValidOperatorKey, OPERATOR_HEADER_KEY } from '../../../../lib/capinfra/operatorAuth';
import {
  getClaim,
  listClaims,
  listClaimEvents,
  updateClaimStatus,
  type ClaimStatus,
} from '../../../../lib/capinfra/lossCoverage/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const adminKey =
    (req.headers[OPERATOR_HEADER_KEY] as string | undefined) ??
    (req.headers[OPERATOR_HEADER_KEY.toLowerCase()] as string | undefined);
  if (!isValidOperatorKey(adminKey)) {
    return res.status(401).json({ ok: false, error: 'operator key required' });
  }

  if (req.method === 'GET') {
    const claimId = (req.query.claimId as string | undefined)?.trim();
    try {
      if (claimId) {
        const claim = await getClaim(claimId);
        if (!claim) return res.status(404).json({ ok: false, error: 'claim not found' });
        const events = await listClaimEvents(claimId);
        return res.status(200).json({ ok: true, claim, events });
      }
      const status = (req.query.status as string | undefined)?.trim() || undefined;
      const items = await listClaims({ status: (status as ClaimStatus | undefined) ?? null });
      return res.status(200).json({ ok: true, items });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'unknown' });
    }
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as {
      claimId?: string;
      toStatus?: ClaimStatus;
      reviewerNotes?: string;
      paidAmountCents?: number;
      paidTxHash?: string;
    };
    if (!body.claimId || !body.toStatus) {
      return res.status(400).json({ ok: false, error: 'claimId, toStatus required' });
    }
    try {
      const claim = await updateClaimStatus({
        claimId: body.claimId,
        toStatus: body.toStatus,
        actor: 'operator',
        reviewerNotes: body.reviewerNotes ?? null,
        paidAmountCents: body.paidAmountCents ?? null,
        paidTxHash: body.paidTxHash ?? null,
      });
      return res.status(200).json({ ok: true, claim });
    } catch (err) {
      return res.status(400).json({ ok: false, error: err instanceof Error ? err.message : 'unknown' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
}
