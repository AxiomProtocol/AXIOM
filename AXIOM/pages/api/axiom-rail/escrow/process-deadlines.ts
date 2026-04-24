/**
 * GET /api/axiom-rail/escrow/process-deadlines
 *
 * Scans for deadline-triggered escrows past their deadline and releases them.
 * Callable by Vercel cron or manual polling.
 *
 * For each escrow where:
 *   - releaseCondition = 'deadline'
 *   - status = 'funded'      ← only funded escrows: funds must be held before release
 *   - deadline <= NOW()
 *
 * Wraps status→'releasing' + transfer record creation in a DB transaction so
 * the escrow is never stranded in 'releasing' if transfer insert fails.
 *
 * Idempotent: atomic conditional .returning() update prevents duplicate payouts
 * from concurrent cron runs.
 *
 * Security:
 *  - Admin key required (x-admin-key header)
 *  - Rate limited: 60 requests per IP per hour
 *  - CORS restricted to allowlist origins
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { eq, lte, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { setRailCors, handlePreflight } from '../../../../lib/multichain/stellar/axiom-rail/corsUtils';
import { checkRateLimit } from '../../../../lib/multichain/stellar/axiom-rail/rateLimiter';
import { requireAdminAuth } from '../../../../lib/multichain/stellar/axiom-rail/adminAuth';
import { db } from '../../../../server/db';
import { axiomRailEscrows } from '../../../../shared/escrowSchema';
import { stellarPaymentTransfers } from '../../../../shared/stellarSchema';
import { AXIOM_RAIL_FEE_FIXED_USD, AXIOM_RAIL_FEE_PERCENT } from '../../../../lib/multichain/stellar/axiom-rail/AxiomRailService';

interface ProcessResult {
  processed: number;
  skipped: number;
  errors: string[];
  details: Array<{
    escrowId: string;
    status: 'ok' | 'skipped' | 'error';
    message: string;
  }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setRailCors(req, res);
  if (handlePreflight(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!requireAdminAuth(req, res)) return;
  if (!checkRateLimit(req, res, 'escrow/process-deadlines', { max: 60, windowMs: 3600_000 })) return;

  const result: ProcessResult = {
    processed: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  try {
    const now = new Date();

    // Only scan 'funded' escrows — pending_funding means no funds are held yet,
    // so deadline auto-release must not trigger.
    const expiredEscrows = await db
      .select()
      .from(axiomRailEscrows)
      .where(
        and(
          eq(axiomRailEscrows.releaseCondition, 'deadline'),
          eq(axiomRailEscrows.status, 'funded'),
          lte(axiomRailEscrows.deadline, now),
        )
      );

    for (const escrow of expiredEscrows) {
      try {
        const amount = parseFloat(String(escrow.amountUsd));
        const fee = AXIOM_RAIL_FEE_FIXED_USD + amount * AXIOM_RAIL_FEE_PERCENT;
        const amountOut = Math.max(0, amount - fee);
        const txId = uuidv4();
        const destinationAccount = `${escrow.beneficiaryBankName} | Account: ${escrow.beneficiaryAccount} | Routing: ${escrow.beneficiaryRouting} | ACH`;

        // Wrap status transition + transfer creation in a transaction.
        // If transfer insert fails, status update is rolled back — no stranded state.
        // Atomic conditional WHERE guards idempotency from concurrent cron runs.
        const txResult = await db.transaction(async (tx) => {
          const updated = await tx
            .update(axiomRailEscrows)
            .set({
              status: 'releasing',
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(axiomRailEscrows.id, escrow.id),
                eq(axiomRailEscrows.status, 'funded'),
              )
            )
            .returning({ id: axiomRailEscrows.id });

          if (updated.length === 0) {
            return null; // concurrent cron run already processed this escrow
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
              releaseTrigger: 'deadline',
              deadline: escrow.deadline?.toISOString(),
              releasedAt: new Date().toISOString(),
            },
          });

          return txId;
        });

        if (txResult === null) {
          result.skipped++;
          result.details.push({
            escrowId: escrow.id,
            status: 'skipped',
            message: `Skipped — escrow already processed by concurrent run`,
          });
          continue;
        }

        result.processed++;
        result.details.push({
          escrowId: escrow.id,
          status: 'ok',
          message: `Deadline expired (${escrow.deadline?.toISOString()}). Transfer ${txId} created → releasing`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Escrow ${escrow.id}: ${msg}`);
        result.details.push({
          escrowId: escrow.id,
          status: 'error',
          message: msg,
        });
      }
    }

    return res.status(200).json({
      ok: true,
      scanned: expiredEscrows.length,
      ...result,
    });
  } catch (err) {
    console.error('[AxiomRail Escrow] process-deadlines error:', err);
    return res.status(500).json({ error: 'Failed to process deadline escrows' });
  }
}
