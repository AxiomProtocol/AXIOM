import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { db } from '../../../../../server/db';
import {
  increaseParticipants,
  increaseProductEscrows,
  increaseDistributions,
} from '../../../../../shared/increaseParticipantSchema';
import { IncreaseService, getAccountId, IncreaseDisabledError } from '../../../../../lib/services/IncreaseService';
import { eq, and } from 'drizzle-orm';

function isAdmin(req: NextApiRequest): boolean {
  const key = req.headers['x-admin-key'];
  return typeof key === 'string' && key === process.env.ADMIN_SOLVENCY_KEY;
}

// POST /api/banking/wealth-practice/insurance/release
// Admin-only: release a funded insurance hold (increase_product_escrows purpose='insurance-hold')
// and initiate outbound ACH return to participant's external account.
//
// Body:
//   holdId                  number  — required (product escrow row ID)
//   reason                  string  — 'completed' | 'forfeited' | 'cancelled'
//   externalRoutingNumber   string  — REQUIRED when reason=completed (9-digit ABA)
//   externalAccountNumber   string  — REQUIRED when reason=completed
//
// Invariants:
//   reason=completed → routing + account REQUIRED; ACH must succeed before hold is set released.
//   reason=forfeited|cancelled → no ACH; hold transitions to forfeited.
//   If ACH fails → 502 returned and hold status unchanged.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin authorization required' });
  }

  const { holdId, reason, externalRoutingNumber, externalAccountNumber } = req.body;

  if (!holdId || typeof holdId !== 'number') {
    return res.status(400).json({ error: 'holdId (number) required' });
  }
  if (!reason || !['completed', 'forfeited', 'cancelled'].includes(reason)) {
    return res.status(400).json({ error: 'reason must be completed|forfeited|cancelled' });
  }

  // Hard upfront validation for completed releases
  if (reason === 'completed') {
    if (!externalRoutingNumber || !/^\d{9}$/.test(String(externalRoutingNumber).trim())) {
      return res.status(400).json({
        error: 'externalRoutingNumber (9-digit ABA) is required for reason=completed',
        code: 'ROUTING_REQUIRED',
      });
    }
    if (!externalAccountNumber || String(externalAccountNumber).trim().length < 4) {
      return res.status(400).json({
        error: 'externalAccountNumber is required for reason=completed',
        code: 'ACCOUNT_REQUIRED',
      });
    }
  }

  try {
    const existing = await db
      .select()
      .from(increaseProductEscrows)
      .where(
        and(
          eq(increaseProductEscrows.id, holdId),
          eq(increaseProductEscrows.purpose, 'insurance-hold')
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Insurance hold not found in product escrows' });
    }

    const hold = existing[0];

    if (['released', 'forfeited'].includes(hold.status)) {
      return res.status(409).json({ error: `Hold already ${hold.status}` });
    }

    const now = new Date();
    let transferId: string | null = null;
    let transferStatus: string | null = null;

    // Completed releases: ACH return is MANDATORY — must succeed BEFORE updating hold status
    if (reason === 'completed') {
      if (hold.depositedAmountCents <= 0) {
        return res.status(400).json({
          error: 'Hold has no deposited amount to return — use reason=cancelled for zero-balance holds',
          code: 'NO_DEPOSIT_TO_RETURN',
          depositedAmountCents: hold.depositedAmountCents,
        });
      }

      const participant = await db
        .select()
        .from(increaseParticipants)
        .where(eq(increaseParticipants.id, hold.participantId))
        .limit(1)
        .then((rows) => rows[0] ?? null);

      if (!participant) {
        return res.status(404).json({ error: 'Participant record not found for this hold' });
      }

      const accountId = getAccountId();
      if (!accountId) {
        return res.status(503).json({
          error: 'Banking account not configured — set INCREASE_ACCOUNT_ID in environment',
          code: 'ACCOUNT_NOT_CONFIGURED',
        });
      }

      // Initiate ACH return — if this throws, hold status is NOT updated
      try {
        const isoDate = new Date().toISOString().slice(0, 10);
        const idempotencyKey = crypto
          .createHash('sha256')
          .update(`${accountId}:hold-release:${String(externalRoutingNumber).trim()}:${String(externalAccountNumber).trim()}:${hold.depositedAmountCents}:${isoDate}:${holdId}`)
          .digest('hex');

        const transfer = await IncreaseService.initiateAchTransfer({
          account_id: accountId,
          account_number: String(externalAccountNumber).trim(),
          routing_number: String(externalRoutingNumber).trim(),
          amount: hold.depositedAmountCents,
          statement_descriptor: `Axiom Nexus Hold Release — ${participant.participantRef}`,
          company_name: 'Axiom Protocol LLC',
        }, idempotencyKey);
        transferId = transfer.id;
        transferStatus = transfer.status;
      } catch (err) {
        if (err instanceof IncreaseDisabledError) {
          return res.status(err.status).json({ error: err.message, code: err.code });
        }
        return res.status(502).json({
          error: `ACH return initiation failed: ${err instanceof Error ? err.message : String(err)}`,
          code: 'ACH_TRANSFER_FAILED',
          note: 'Hold status has NOT been updated. Resolve the ACH error and retry.',
        });
      }

      // Record outbound distribution only after successful ACH initiation
      await db.insert(increaseDistributions).values({
        participantId: hold.participantId,
        product: 'wealth-practice',
        amountCents: hold.depositedAmountCents,
        status: 'pending',
        increaseTransferId: transferId,
        description: `Insurance hold release — group ${hold.groupDisplayName || hold.groupId}`,
        sentAt: now,
      });
    }

    // Update hold status only after ACH is confirmed (or for non-completed reasons)
    const newStatus = reason === 'completed' ? 'released' : 'forfeited';

    const [updated] = await db
      .update(increaseProductEscrows)
      .set({
        status: newStatus,
        releasedAt: reason === 'completed' ? now : undefined,
        forfeitedAt: reason === 'forfeited' ? now : undefined,
        notes: [
          hold.notes,
          `${reason === 'completed' ? 'Released' : 'Forfeited'}: ${reason}${transferId ? ` | ACH: ${transferId} (${transferStatus})` : ''}`,
        ].filter(Boolean).join(' | ') || null,
      })
      .where(eq(increaseProductEscrows.id, holdId))
      .returning();

    return res.status(200).json({
      success: true,
      hold: updated,
      reason,
      transfer: transferId ? { id: transferId, status: transferStatus } : null,
    });
  } catch (err: unknown) {
    if (err instanceof IncreaseDisabledError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
