/**
 * Loss Coverage Reserve claims — public submit + public list (PII-stripped).
 *
 *   GET  → public list, PII stripped (id, status, amounts, dates, wallet short)
 *   POST → submit a claim. No auth required; the claimant wallet must
 *          be a 20-byte hex address.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  submitClaim,
  listClaims,
  toPublicRow,
  type EligibilityCategory,
  type ClaimStatus,
} from '../../../../lib/capinfra/lossCoverage/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'GET') {
    const status = (req.query.status as string | undefined)?.trim() || undefined;
    try {
      const rows = await listClaims({ status: (status as ClaimStatus | undefined) ?? null });
      return res.status(200).json({ ok: true, items: rows.map(toPublicRow) });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'unknown' });
    }
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as {
      claimantWallet?: string;
      contactEmail?: string;
      positionRef?: string;
      txHashes?: string[];
      description?: string;
      amountRequestedCents?: number;
      eligibilityCategory?: EligibilityCategory;
      evidenceUrls?: Array<{ url: string; label?: string | null }>;
    };
    if (
      !body.claimantWallet ||
      !body.description ||
      typeof body.amountRequestedCents !== 'number' ||
      !body.eligibilityCategory
    ) {
      return res.status(400).json({
        ok: false,
        error: 'claimantWallet, description, amountRequestedCents, eligibilityCategory are required',
      });
    }
    try {
      const claim = await submitClaim({
        claimantWallet: body.claimantWallet,
        contactEmail: body.contactEmail ?? null,
        positionRef: body.positionRef ?? null,
        txHashes: body.txHashes ?? null,
        description: body.description,
        amountRequestedCents: body.amountRequestedCents,
        eligibilityCategory: body.eligibilityCategory,
        evidenceUrls: body.evidenceUrls ?? null,
      });
      // Return only the id and a short ack — do not echo PII back via
      // the response body.
      return res.status(201).json({
        ok: true,
        claimId: claim.id,
        status: claim.status,
        createdAt: claim.createdAt,
      });
    } catch (err) {
      return res.status(400).json({ ok: false, error: err instanceof Error ? err.message : 'unknown' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
}
