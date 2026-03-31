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
// Body: {
//   holdId,
//   reason: 'completed' | 'forfeited' | 'cancelled',
//   // Required for 'completed' releases (to return funds via ACH):
//   externalRoutingNumber?,
//   externalAccountNumber?,
// }
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

    // For completed releases: initiate ACH return to participant's external account
    if (reason === 'completed' && externalRoutingNumber && externalAccountNumber && hold.depositedAmountCents > 0) {
      // Look up participant to get their name for the ACH descriptor
      const participants = await db
        .select()
        .from(increaseParticipants)
        .where(eq(increaseParticipants.id, hold.participantId))
        .limit(1);

      const participant = participants[0];
      const accountId = getAccountId();

      if (accountId && participant) {
        try {
          const transfer = await IncreaseService.initiateAchTransfer({
            account_id: accountId,
            account_number: externalAccountNumber,
            routing_number: externalRoutingNumber,
            amount: hold.depositedAmountCents,
            statement_descriptor: `Axiom Nexus Insurance Hold Release — ${participant.participantRef}`,
            company_name: 'Axiom Protocol LLC',
          });
          transferId = transfer.id;
          transferStatus = transfer.status;

          // Record the outbound distribution
          await db.insert(increaseDistributions).values({
            participantId: participant.id,
            product: 'wealth-practice',
            amountCents: hold.depositedAmountCents,
            status: 'pending',
            increaseTransferId: transfer.id,
            description: `Insurance hold release — group ${hold.groupDisplayName || hold.groupId}`,
            sentAt: now,
          });
        } catch (err) {
          return res.status(502).json({
            error: `ACH return failed: ${err instanceof Error ? err.message : String(err)}`,
            note: 'Hold status not updated — resolve ACH error and retry.',
          });
        }
      }
    }

    const newStatus = reason === 'completed' ? 'released' : 'forfeited';

    const [updated] = await db
      .update(increaseInsuranceHolds)
      .set({
        status: newStatus,
        releasedAt: reason === 'completed' ? now : undefined,
        forfeitedAt: reason === 'forfeited' ? now : undefined,
        notes: [
          hold.notes,
          `Released: ${reason}${transferId ? ` | ACH return: ${transferId}` : ''}`,
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
