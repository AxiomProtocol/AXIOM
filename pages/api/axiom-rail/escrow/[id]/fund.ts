/**
 * POST /api/axiom-rail/escrow/[id]/fund
 *
 * Admin-only endpoint: marks an escrow as funded after a verified inbound
 * settlement event has been confirmed by the Axiom Rail settlement layer.
 *
 * This endpoint is called ONLY by:
 *   - The Axiom Rail monitor (after detecting a verified ACH/wire receipt
 *     or SEP-24 deposit matching the escrow ID and amount).
 *   - An authorized admin after manual reconciliation of a confirmed deposit.
 *
 * Party tokens are intentionally NOT accepted — no party can self-attest funding.
 * Status transition: pending_funding → funded
 *
 * Security:
 *  - Admin key (x-admin-key header) required — no party token path
 *  - Atomic conditional update with .returning()
 *  - Rate limited: 20 req/min/IP
 *  - CORS restricted to allowlist origins
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { eq, and } from 'drizzle-orm';
import { setRailCors, handlePreflight } from '../../../../../lib/multichain/stellar/axiom-rail/corsUtils';
import { checkRateLimit } from '../../../../../lib/multichain/stellar/axiom-rail/rateLimiter';
import { requireAdminAuth } from '../../../../../lib/multichain/stellar/axiom-rail/adminAuth';
import { db } from '../../../../../server/db';
import { axiomRailEscrows } from '../../../../../shared/escrowSchema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setRailCors(req, res);
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!requireAdminAuth(req, res)) return;
  if (!checkRateLimit(req, res, 'escrow/fund', { max: 20, windowMs: 60_000 })) return;

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Escrow ID is required' });
  }

  const { settlementRef } = req.body as { settlementRef?: string };

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

    if (escrow.status !== 'pending_funding') {
      return res.status(409).json({
        error: `Escrow is already in status: ${escrow.status}. Funding is already confirmed.`,
      });
    }

    // Atomic conditional update — idempotent under concurrent admin calls
    const updated = await db
      .update(axiomRailEscrows)
      .set({
        status: 'funded',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(axiomRailEscrows.id, id),
          eq(axiomRailEscrows.status, 'pending_funding'),
        )
      )
      .returning({ id: axiomRailEscrows.id });

    if (updated.length === 0) {
      return res.status(409).json({ error: 'Escrow state changed concurrently. Please retry.' });
    }

    console.log(`[AxiomRail Escrow] Admin confirmed funding — escrow: ${id}${settlementRef ? `, settlement ref: ${settlementRef}` : ''}`);

    return res.status(200).json({
      escrowId: id,
      status: 'funded',
      message: 'Escrow confirmed as funded. Release triggers are now active.',
    });
  } catch (err) {
    console.error('[AxiomRail Escrow] Fund error:', err);
    return res.status(500).json({ error: 'Failed to confirm funding' });
  }
}
