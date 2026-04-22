/**
 * POST /api/axiom-rail/escrow/[id]/approve
 *
 * Marks a party's approval of the escrow release.
 * Requires { partyToken: string } in the request body.
 *
 * Escrow MUST be in 'funded' state before approvals are accepted.
 * Funds must be confirmed as held (via /fund endpoint) before any
 * release triggers execute.
 *
 * State machine:
 *   funded → funded         (first approval — only approval flag set)
 *   funded → releasing      (second approval — both parties approved)
 *
 * When both parties approve, a DB transaction atomically:
 *   1. Updates escrow status → 'releasing'
 *   2. Creates stellar_payment_transfers record for disbursement
 * If either step fails, the transaction rolls back — no stranded state.
 *
 * Security:
 *  - Rate limited: 10 req/min/IP
 *  - CORS restricted to allowlist origins
 *  - Party tokens compared via constant-time SHA-256 hash comparison
 *  - No BSA or bank details in response
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash, timingSafeEqual } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { setRailCors, handlePreflight } from '../../../../../lib/multichain/stellar/axiom-rail/corsUtils';
import { checkRateLimit } from '../../../../../lib/multichain/stellar/axiom-rail/rateLimiter';
import { db } from '../../../../../server/db';
import { axiomRailEscrows } from '../../../../../shared/escrowSchema';
import { stellarPaymentTransfers } from '../../../../../shared/stellarSchema';
import { AXIOM_RAIL_FEE_FIXED_USD, AXIOM_RAIL_FEE_PERCENT } from '../../../../../lib/multichain/stellar/axiom-rail/AxiomRailService';

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

  if (!checkRateLimit(req, res, 'escrow/approve', { max: 10, windowMs: 60_000 })) return;

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Escrow ID is required' });
  }

  const { partyToken } = req.body as { partyToken?: string };
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

    // Enforce release condition: bilateral approvals only for bilateral_approval escrows.
    // Deadline escrows release exclusively via the process-deadlines cron or admin resolution.
    if (escrow.releaseCondition !== 'bilateral_approval') {
      return res.status(409).json({
        error: `This escrow uses release condition '${escrow.releaseCondition}'. Bilateral approval is not applicable.`,
      });
    }

    // Only allow approvals from 'funded' state — ensures funds are actually held
    if (escrow.status !== 'funded') {
      if (escrow.status === 'pending_funding') {
        return res.status(409).json({
          error: 'Escrow is not yet funded. Funds must be confirmed as held before approvals can be submitted.',
        });
      }
      return res.status(409).json({
        error: `Escrow cannot be approved in status: ${escrow.status}`,
      });
    }

    const providedHash = hashToken(partyToken.trim());
    const isInitiator = constantTimeCompare(escrow.initiatorTokenHash, providedHash);
    const isCounterparty = constantTimeCompare(escrow.counterpartyTokenHash, providedHash);

    if (!isInitiator && !isCounterparty) {
      return res.status(403).json({ error: 'Invalid party token' });
    }

    const alreadyApproved = isInitiator ? escrow.initiatorApproved : escrow.counterpartyApproved;
    if (alreadyApproved) {
      return res.status(409).json({ error: 'This party has already approved' });
    }

    const newInitiatorApproved = isInitiator ? true : escrow.initiatorApproved;
    const newCounterpartyApproved = isCounterparty ? true : escrow.counterpartyApproved;
    const bothApproved = newInitiatorApproved && newCounterpartyApproved;
    const newStatus = bothApproved ? 'releasing' : 'funded';

    if (bothApproved) {
      // Wrap status transition + transfer creation in a transaction.
      // If transfer insert fails, status update is rolled back — no stranded state.
      const amount = parseFloat(String(escrow.amountUsd));
      const fee = AXIOM_RAIL_FEE_FIXED_USD + amount * AXIOM_RAIL_FEE_PERCENT;
      const amountOut = Math.max(0, amount - fee);
      const txId = uuidv4();
      const destinationAccount = `${escrow.beneficiaryBankName} | Account: ${escrow.beneficiaryAccount} | Routing: ${escrow.beneficiaryRouting} | ACH`;

      const txResult = await db.transaction(async (tx) => {
        // Atomic conditional update: only succeed if status/flags haven't changed
        const updated = await tx
          .update(axiomRailEscrows)
          .set({
            initiatorApproved: newInitiatorApproved,
            counterpartyApproved: newCounterpartyApproved,
            status: 'releasing',
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(axiomRailEscrows.id, id),
              eq(axiomRailEscrows.status, 'funded'),
              isInitiator
                ? eq(axiomRailEscrows.initiatorApproved, false)
                : eq(axiomRailEscrows.counterpartyApproved, false),
            )
          )
          .returning({ id: axiomRailEscrows.id });

        if (updated.length === 0) {
          return null; // concurrent update won the race
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
            releaseTrigger: 'bilateral_approval',
            releasedAt: new Date().toISOString(),
          },
        });

        return txId;
      });

      if (txResult === null) {
        const refreshed = await db
          .select()
          .from(axiomRailEscrows)
          .where(eq(axiomRailEscrows.id, id))
          .limit(1);
        const e = refreshed[0];
        const wasApproved = isInitiator ? e.initiatorApproved : e.counterpartyApproved;
        if (wasApproved) {
          return res.status(409).json({ error: 'This party has already approved' });
        }
        return res.status(409).json({ error: 'Escrow state changed concurrently. Please retry.' });
      }

      return res.status(200).json({
        escrowId: id,
        party: isInitiator ? 'initiator' : 'counterparty',
        initiatorApproved: true,
        counterpartyApproved: true,
        status: 'releasing',
        message: 'Both parties have approved. Funds are being released.',
      });
    }

    // First approval only — just set the flag, no transfer yet
    const updated = await db
      .update(axiomRailEscrows)
      .set({
        initiatorApproved: newInitiatorApproved,
        counterpartyApproved: newCounterpartyApproved,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(axiomRailEscrows.id, id),
          eq(axiomRailEscrows.status, 'funded'),
          isInitiator
            ? eq(axiomRailEscrows.initiatorApproved, false)
            : eq(axiomRailEscrows.counterpartyApproved, false),
        )
      )
      .returning({ id: axiomRailEscrows.id });

    if (updated.length === 0) {
      const refreshed = await db
        .select()
        .from(axiomRailEscrows)
        .where(eq(axiomRailEscrows.id, id))
        .limit(1);
      const e = refreshed[0];
      const wasApproved = isInitiator ? e.initiatorApproved : e.counterpartyApproved;
      if (wasApproved) {
        return res.status(409).json({ error: 'This party has already approved' });
      }
      return res.status(409).json({ error: 'Escrow state changed concurrently. Please retry.' });
    }

    const party = isInitiator ? 'initiator' : 'counterparty';
    return res.status(200).json({
      escrowId: id,
      party,
      initiatorApproved: newInitiatorApproved,
      counterpartyApproved: newCounterpartyApproved,
      status: 'funded',
      message: `Approval recorded for ${party}. Waiting for the other party.`,
    });
  } catch (err) {
    console.error('[AxiomRail Escrow] Approve error:', err);
    return res.status(500).json({ error: 'Failed to process approval' });
  }
}
