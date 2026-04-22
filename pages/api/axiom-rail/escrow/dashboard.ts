/**
 * GET /api/axiom-rail/escrow/dashboard
 *
 * Returns all escrows associated with a party token (initiator or counterparty).
 * Token is provided via X-Party-Token header.
 *
 * Security:
 *  - Party token required (X-Party-Token header)
 *  - Constant-time hash comparison
 *  - No BSA or bank details in any response
 *  - Rate limited: 20 req/min/IP
 *  - CORS restricted to allowlist origins
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash, timingSafeEqual } from 'crypto';
import { setRailCors, handlePreflight } from '../../../../lib/multichain/stellar/axiom-rail/corsUtils';
import { checkRateLimit } from '../../../../lib/multichain/stellar/axiom-rail/rateLimiter';
import { db } from '../../../../server/db';
import { axiomRailEscrows } from '../../../../shared/escrowSchema';

const TOKEN_SALT = 'axiom-rail-escrow-party-token-v1';

function hashToken(plaintext: string): string {
  return createHash('sha256').update(`${TOKEN_SALT}:${plaintext}`).digest('hex');
}

function constantTimeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function purposeLabel(purpose: string): string {
  const map: Record<string, string> = {
    security_deposit: 'Security Deposit',
    earnest_money: 'Earnest Money',
    milestone: 'Milestone Payment',
  };
  return map[purpose] ?? purpose;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setRailCors(req, res);
  if (handlePreflight(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!checkRateLimit(req, res, 'escrow/dashboard', { max: 20, windowMs: 60_000 })) return;

  const rawToken = req.headers['x-party-token'];
  if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim()) {
    return res.status(401).json({ error: 'Party token required (X-Party-Token header)' });
  }

  const providedHash = hashToken(rawToken.trim());

  try {
    const allEscrows = await db
      .select()
      .from(axiomRailEscrows)
      .orderBy(axiomRailEscrows.createdAt);

    const matchingEscrows = allEscrows.filter(e =>
      constantTimeCompare(e.initiatorTokenHash, providedHash) ||
      constantTimeCompare(e.counterpartyTokenHash, providedHash)
    );

    if (matchingEscrows.length === 0) {
      return res.status(403).json({ error: 'Invalid party token' });
    }

    const safeEscrows = matchingEscrows.map(e => {
      const isInitiator = constantTimeCompare(e.initiatorTokenHash, providedHash);
      return {
        escrowId: e.id,
        role: isInitiator ? 'initiator' : 'counterparty',
        initiatorName: e.initiatorName,
        counterpartyName: e.counterpartyName,
        counterpartyEmail: e.counterpartyEmail,
        amountUsd: e.amountUsd,
        purpose: e.purpose,
        purposeLabel: purposeLabel(e.purpose),
        releaseCondition: e.releaseCondition,
        deadline: e.deadline?.toISOString() ?? null,
        status: e.status,
        initiatorApproved: e.initiatorApproved,
        counterpartyApproved: e.counterpartyApproved,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
        releasedAt: e.releasedAt?.toISOString() ?? null,
      };
    });

    const open = safeEscrows.filter(e => !['released', 'cancelled'].includes(e.status));
    const closed = safeEscrows.filter(e => ['released', 'cancelled'].includes(e.status));

    return res.status(200).json({
      escrows: safeEscrows,
      openCount: open.length,
      closedCount: closed.length,
      total: safeEscrows.length,
    });
  } catch (err) {
    console.error('[AxiomRail Escrow] Dashboard error:', err);
    return res.status(500).json({ error: 'Failed to retrieve dashboard data' });
  }
}
