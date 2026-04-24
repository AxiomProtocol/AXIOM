/**
 * POST /api/axiom-rail/escrow/[id]/resolve
 *
 * Admin-only dispute resolution endpoint.
 * Resolves a disputed escrow by releasing funds to the specified beneficiary
 * or cancelling the escrow.
 *
 * Body:
 *   { outcome: 'release' | 'cancel', adminNote?: string }
 *
 * 'release' → wraps status→'releasing' + transfer creation in a DB transaction
 *             so escrow is never stranded if transfer insert fails
 * 'cancel'  → no disbursement, status → 'cancelled'
 *
 * Security:
 *  - Admin key required (x-admin-key header) with brute-force lockout
 *  - Rate limited: 20 req/hour/IP
 *  - CORS restricted to allowlist origins
 *  - No BSA or bank details in response
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { setRailCors, handlePreflight } from '../../../../../lib/multichain/stellar/axiom-rail/corsUtils';
import { checkRateLimit } from '../../../../../lib/multichain/stellar/axiom-rail/rateLimiter';
import { requireAdminAuth } from '../../../../../lib/multichain/stellar/axiom-rail/adminAuth';
import { db } from '../../../../../server/db';
import { axiomRailEscrows } from '../../../../../shared/escrowSchema';
import { stellarPaymentTransfers } from '../../../../../shared/stellarSchema';
import { AXIOM_RAIL_FEE_FIXED_USD, AXIOM_RAIL_FEE_PERCENT } from '../../../../../lib/multichain/stellar/axiom-rail/AxiomRailService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setRailCors(req, res);
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!requireAdminAuth(req, res)) return;
  if (!checkRateLimit(req, res, 'escrow/resolve', { max: 20, windowMs: 3600_000 })) return;

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Escrow ID is required' });
  }

  const { outcome, adminNote } = req.body as {
    outcome?: string;
    adminNote?: string;
  };

  if (!outcome || !['release', 'cancel'].includes(outcome)) {
    return res.status(400).json({ error: 'outcome must be "release" or "cancel"' });
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

    if (escrow.status !== 'disputed') {
      return res.status(409).json({
        error: `Escrow resolution only applies to disputed escrows. Current status: ${escrow.status}`,
      });
    }

    let transferId: string | null = null;

    if (outcome === 'release') {
      // Wrap status transition + transfer creation in a transaction.
      // If transfer insert fails, status update is rolled back — no stranded 'releasing' state.
      const amount = parseFloat(String(escrow.amountUsd));
      const fee = AXIOM_RAIL_FEE_FIXED_USD + amount * AXIOM_RAIL_FEE_PERCENT;
      const amountOut = Math.max(0, amount - fee);
      const txId = uuidv4();
      const destinationAccount = `${escrow.beneficiaryBankName} | Account: ${escrow.beneficiaryAccount} | Routing: ${escrow.beneficiaryRouting} | ACH`;

      const txResult = await db.transaction(async (tx) => {
        const updated = await tx
          .update(axiomRailEscrows)
          .set({
            status: 'releasing',
            releasedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(axiomRailEscrows.id, id),
              eq(axiomRailEscrows.status, 'disputed'),
            )
          )
          .returning({ id: axiomRailEscrows.id });

        if (updated.length === 0) {
          return null; // concurrent admin call already resolved it
        }

        await tx.insert(stellarPaymentTransfers).values({
          id: txId,
          axiomWalletAddress: '0x0000000000000000000000000000000000000000',
          stellarPublicKey: null,
          anchorId: 'axiom-rail',
          corridorId: 'usd-to-usd-escrow-axiom-rail',
          sourceAmountAxusd: amount.toFixed(2),
          destinationCurrency: 'USD',
          destinationAmount: amountOut.toFixed(2),
          destinationAccount,
          feeEstimate: fee.toFixed(2),
          status: 'pending_user_transfer_start',
          sepProtocol: 'escrow',
          anchorRawResponse: {
            escrowId: escrow.id,
            initiatorName: escrow.initiatorName,
            counterpartyName: escrow.counterpartyName,
            purpose: escrow.purpose,
            releaseTrigger: 'admin_dispute_resolution',
            adminNote: adminNote ?? null,
            releasedAt: new Date().toISOString(),
          },
        });

        return txId;
      });

      if (txResult === null) {
        return res.status(409).json({ error: 'Escrow state changed concurrently. Please retry.' });
      }

      transferId = txResult;
    } else {
      // Cancel path: just update status, no transfer
      const updated = await db
        .update(axiomRailEscrows)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(axiomRailEscrows.id, id),
            eq(axiomRailEscrows.status, 'disputed'),
          )
        )
        .returning({ id: axiomRailEscrows.id });

      if (updated.length === 0) {
        return res.status(409).json({ error: 'Escrow state changed concurrently. Please retry.' });
      }
    }

    console.log(`[AxiomRail Escrow] Dispute resolved — escrow: ${id}, outcome: ${outcome}, admin note: ${adminNote ?? 'none'}`);

    return res.status(200).json({
      escrowId: id,
      outcome,
      status: outcome === 'release' ? 'releasing' : 'cancelled',
      transferId,
      message: outcome === 'release'
        ? 'Dispute resolved. Funds are being released to the beneficiary account.'
        : 'Dispute resolved. Escrow has been cancelled with no disbursement.',
    });
  } catch (err) {
    console.error('[AxiomRail Escrow] Resolve error:', err);
    return res.status(500).json({ error: 'Failed to resolve dispute' });
  }
}
