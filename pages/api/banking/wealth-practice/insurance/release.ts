import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../../server/db';
import {
  increaseParticipants,
  increaseInsuranceHolds,
  increaseDistributions,
} from '../../../../../shared/increaseParticipantSchema';
import { IncreaseService, getAccountId } from '../../../../../lib/services/IncreaseService';
import { eq } from 'drizzle-orm';

function isAdmin(req: NextApiRequest): boolean {
  const key = req.headers['x-admin-key'];
  return typeof key === 'string' && key === process.env.ADMIN_SOLVENCY_KEY;
}

// POST /api/banking/wealth-practice/insurance/release
// Admin-only: release a funded insurance hold and initiate outbound ACH return.
//
// Body:
//   holdId                  number  — required
//   reason                  string  — 'completed' | 'forfeited' | 'cancelled'
//   externalRoutingNumber   string  — REQUIRED when reason=completed (9-digit ABA)
//   externalAccountNumber   string  — REQUIRED when reason=completed
//
// Invariants:
//   reason=completed → externalRoutingNumber + externalAccountNumber REQUIRED.
//   ACH return MUST succeed before hold status is set to 'released'.
//   If ACH fails, 502 is returned and hold remains unchanged.
//   reason=forfeited|cancelled → no ACH; hold transitions to 'forfeited'.
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

  // Hard upfront validation for completed releases — enforce before any DB reads
  if (reason === 'completed') {
    if (!externalRoutingNumber || !/^\d{9}$/.test(String(externalRoutingNumber).trim())) {
      return res.status(400).json({
        error: 'externalRoutingNumber (9-digit ABA routing number) is required for reason=completed',
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
      .from(increaseInsuranceHolds)
      .where(eq(increaseInsuranceHolds.id, holdId))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Hold not found' });
    }

    const hold = existing[0];

    if (['released', 'forfeited'].includes(hold.status)) {
      return res.status(409).json({ error: `Hold already ${hold.status}` });
    }

    const now = new Date();
    let transferId: string | null = null;
    let transferStatus: string | null = null;

    // For completed releases: ACH return is MANDATORY — must succeed BEFORE updating hold status
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
        const transfer = await IncreaseService.initiateAchTransfer({
          account_id: accountId,
          account_number: String(externalAccountNumber).trim(),
          routing_number: String(externalRoutingNumber).trim(),
          amount: hold.depositedAmountCents,
          statement_descriptor: `Axiom Nexus Hold Release — ${participant.participantRef}`,
          company_name: 'Axiom Protocol LLC',
        });
        transferId = transfer.id;
        transferStatus = transfer.status;
      } catch (err) {
        // ACH failed — do NOT update hold; return 502 with diagnostic info
        return res.status(502).json({
          error: `ACH return initiation failed: ${err instanceof Error ? err.message : String(err)}`,
          code: 'ACH_TRANSFER_FAILED',
          note: 'Hold status has NOT been updated. Resolve the ACH error and retry.',
        });
      }

      // Record outbound distribution (only after successful ACH initiation)
      await db.insert(increaseDistributions).values({
        participantId: participant.id,
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
      .update(increaseInsuranceHolds)
      .set({
        status: newStatus,
        releasedAt: reason === 'completed' ? now : undefined,
        forfeitedAt: reason === 'forfeited' ? now : undefined,
        notes: [
          hold.notes,
          `${reason === 'completed' ? 'Released' : 'Forfeited'}: ${reason}${transferId ? ` | ACH return: ${transferId} (${transferStatus})` : ''}`,
        ].filter(Boolean).join(' | ') || null,
      })
      .where(eq(increaseInsuranceHolds.id, holdId))
      .returning();

    return res.status(200).json({
      success: true,
      hold: updated,
      reason,
      transfer: transferId ? { id: transferId, status: transferStatus } : null,
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
