/**
 * POST /api/axiom-rail/escrow/[id]/dispute
 *
 * Marks an escrow as disputed by a party token holder.
 * Status transitions: pending_funding | funded → disputed
 *
 * A disputed escrow is frozen — no further approvals can be submitted.
 * Resolution requires admin override via POST /api/axiom-rail/escrow/[id]/resolve.
 *
 * Security:
 *  - Rate limited: 5 req/min/IP
 *  - CORS restricted to allowlist origins
 *  - Party token required — constant-time comparison
 *  - No BSA or bank details in response
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash, timingSafeEqual } from 'crypto';
import { eq, and, inArray } from 'drizzle-orm';
import { setRailCors, handlePreflight } from '../../../../../lib/multichain/stellar/axiom-rail/corsUtils';
import { checkRateLimit } from '../../../../../lib/multichain/stellar/axiom-rail/rateLimiter';
import { db } from '../../../../../server/db';
import { axiomRailEscrows } from '../../../../../shared/escrowSchema';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setRailCors(req, res);
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!checkRateLimit(req, res, 'escrow/dispute', { max: 5, windowMs: 60_000 })) return;

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Escrow ID is required' });
  }

  const { partyToken, reason } = req.body as {
    partyToken?: string;
    reason?: string;
  };

  if (!partyToken?.trim()) {
    return res.status(400).json({ error: 'partyToken is required' });
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

    const escrow = rows[0];

    // Only allow disputes from 'funded' state — unfunded escrows have no funds to protect
    if (escrow.status !== 'funded') {
      if (escrow.status === 'pending_funding') {
        return res.status(409).json({
          error: 'Escrow is not yet funded. Only funded escrows can be disputed.',
        });
      }
      return res.status(409).json({
        error: `Escrow cannot be disputed in status: ${escrow.status}`,
      });
    }

    const providedHash = hashToken(partyToken.trim());
    const isInitiator = constantTimeCompare(escrow.initiatorTokenHash, providedHash);
    const isCounterparty = constantTimeCompare(escrow.counterpartyTokenHash, providedHash);

    if (!isInitiator && !isCounterparty) {
      return res.status(403).json({ error: 'Invalid party token' });
    }

    // Atomic update with status guard: .returning() returns empty array if WHERE didn't match
    const updated = await db
      .update(axiomRailEscrows)
      .set({
        status: 'disputed',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(axiomRailEscrows.id, id),
          eq(axiomRailEscrows.status, 'funded'),
        )
      )
      .returning({ id: axiomRailEscrows.id });

    if (updated.length === 0) {
      return res.status(409).json({ error: 'Escrow state changed concurrently. Please retry.' });
    }

    const party = isInitiator ? 'initiator' : 'counterparty';
    console.warn(`[AxiomRail Escrow] Dispute raised — escrow: ${id}, party: ${party}, reason: ${reason ?? 'not provided'}`);

    return res.status(200).json({
      escrowId: id,
      party,
      status: 'disputed',
      message: 'Dispute recorded. An administrator will review this escrow and issue a resolution.',
    });
  } catch (err) {
    console.error('[AxiomRail Escrow] Dispute error:', err);
    return res.status(500).json({ error: 'Failed to record dispute' });
  }
}
