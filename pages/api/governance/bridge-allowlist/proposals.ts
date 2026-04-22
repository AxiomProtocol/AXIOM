/**
 * Bridge allow-list proposals — list (public) + create (operator).
 *
 *   GET   → returns all proposals (public).
 *   POST  → creates a proposal. Requires x-admin-key header.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { isValidOperatorKey, OPERATOR_HEADER_KEY } from '../../../../lib/capinfra/operatorAuth';
import { createProposal, listProposals, type ProposalStatus } from '../../../../lib/capinfra/bridgeAllowlist/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'GET') {
    const status = (req.query.status as string | undefined)?.trim() || undefined;
    try {
      const rows = await listProposals({ status: (status as ProposalStatus | undefined) ?? null });
      return res.status(200).json({ ok: true, items: rows });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'unknown' });
    }
  }

  if (req.method === 'POST') {
    const adminKey =
      (req.headers[OPERATOR_HEADER_KEY] as string | undefined) ??
      (req.headers[OPERATOR_HEADER_KEY.toLowerCase()] as string | undefined);
    if (!isValidOperatorKey(adminKey)) {
      return res.status(401).json({ ok: false, error: 'operator key required' });
    }
    const body = (req.body ?? {}) as {
      assetSymbol?: string;
      bridgeProvenance?: string;
      validityAdapterAddress?: string | null;
      perAssetCap?: string | null;
      commentWindowEndsAt?: string | null;
      createdBy?: string | null;
      metadataJson?: Record<string, unknown> | null;
    };
    if (!body.assetSymbol || !body.bridgeProvenance) {
      return res.status(400).json({ ok: false, error: 'assetSymbol and bridgeProvenance are required' });
    }
    try {
      const proposal = await createProposal({
        assetSymbol: body.assetSymbol,
        bridgeProvenance: body.bridgeProvenance,
        validityAdapterAddress: body.validityAdapterAddress ?? null,
        perAssetCap: body.perAssetCap ?? null,
        commentWindowEndsAt: body.commentWindowEndsAt ? new Date(body.commentWindowEndsAt) : null,
        createdBy: body.createdBy ?? null,
        metadataJson: body.metadataJson ?? null,
      });
      return res.status(201).json({ ok: true, proposal });
    } catch (err) {
      return res.status(400).json({ ok: false, error: err instanceof Error ? err.message : 'unknown' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
}
