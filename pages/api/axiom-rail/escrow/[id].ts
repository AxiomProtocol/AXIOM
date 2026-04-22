/**
 * GET /api/axiom-rail/escrow/[id]
 *
 * Returns the display-safe status of an escrow (no BSA, no bank details).
 * Public endpoint — no token required to view status.
 *
 * Security:
 *  - Rate limited: 30 req/min/IP
 *  - CORS restricted to allowlist origins
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { eq } from 'drizzle-orm';
import { setRailCors, handlePreflight } from '../../../../lib/multichain/stellar/axiom-rail/corsUtils';
import { checkRateLimit } from '../../../../lib/multichain/stellar/axiom-rail/rateLimiter';
import { db } from '../../../../server/db';
import { axiomRailEscrows } from '../../../../shared/escrowSchema';

function purposeLabel(purpose: string): string {
  const map: Record<string, string> = {
    security_deposit: 'Security Deposit',
    earnest_money: 'Earnest Money',
    milestone: 'Milestone Payment',
  };
  return map[purpose] ?? purpose;
}

function conditionLabel(condition: string): string {
  return condition === 'bilateral_approval' ? 'Bilateral Approval' : 'Deadline Auto-Release';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setRailCors(req, res);
  if (handlePreflight(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!checkRateLimit(req, res, 'escrow/status', { max: 30, windowMs: 60_000 })) return;

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Escrow ID is required' });
  }

  try {
    const rows = await db
      .select()
      .from(axiomRailEscrows)
      .where(eq(axiomRailEscrows.id, id))
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    const e = rows[0];
    return res.status(200).json({
      escrowId: e.id,
      initiatorName: e.initiatorName,
      counterpartyName: e.counterpartyName,
      amountUsd: e.amountUsd,
      purpose: e.purpose,
      purposeLabel: purposeLabel(e.purpose),
      releaseCondition: e.releaseCondition,
      conditionLabel: conditionLabel(e.releaseCondition),
      deadline: e.deadline?.toISOString() ?? null,
      status: e.status,
      initiatorApproved: e.initiatorApproved,
      counterpartyApproved: e.counterpartyApproved,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      releasedAt: e.releasedAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error('[AxiomRail Escrow] Status error:', err);
    return res.status(500).json({ error: 'Failed to retrieve escrow' });
  }
}
