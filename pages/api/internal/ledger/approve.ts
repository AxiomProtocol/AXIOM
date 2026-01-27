import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/server/db';
import { ledgerEntries, treasuryAccounts } from '@/shared/schema';
import { eq, sql } from 'drizzle-orm';
import { adminOnlyDuringObservation } from '@/middleware/observationGuard';
import { isTreasuryInternalEnabled, isInObservationMode } from '@/server/config/featureFlags';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isTreasuryInternalEnabled()) {
    return res.status(503).json({
      error: 'MODULE_DISABLED',
      message: 'Treasury Internal module is not enabled',
    });
  }

  try {
    const { entryId, action } = req.body;

    if (!entryId || !action) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'entryId and action (approve/reject) are required',
      });
    }

    const [entry] = await db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.id, entryId));

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (entry.status !== 'pending') {
      return res.status(400).json({
        error: 'INVALID_STATUS',
        message: 'Only pending entries can be approved or rejected',
      });
    }

    const adminUserId = 1;

    if (action === 'approve') {
      await db
        .update(ledgerEntries)
        .set({
          status: 'approved',
          approvedBy: adminUserId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(ledgerEntries.id, entryId));

      if (entry.debitAccountId) {
        await db
          .update(treasuryAccounts)
          .set({
            balance: sql`${treasuryAccounts.balance} - ${entry.amount}`,
            updatedAt: new Date(),
          })
          .where(eq(treasuryAccounts.id, entry.debitAccountId));
      }

      if (entry.creditAccountId) {
        await db
          .update(treasuryAccounts)
          .set({
            balance: sql`${treasuryAccounts.balance} + ${entry.amount}`,
            updatedAt: new Date(),
          })
          .where(eq(treasuryAccounts.id, entry.creditAccountId));
      }

      return res.status(200).json({
        success: true,
        message: 'Entry approved and balances updated',
        observationMode: isInObservationMode(),
      });
    }

    if (action === 'reject') {
      const { reason } = req.body;

      await db
        .update(ledgerEntries)
        .set({
          status: 'rejected',
          rejectedBy: adminUserId,
          rejectedAt: new Date(),
          rejectionReason: reason || 'No reason provided',
          updatedAt: new Date(),
        })
        .where(eq(ledgerEntries.id, entryId));

      return res.status(200).json({
        success: true,
        message: 'Entry rejected',
        observationMode: isInObservationMode(),
      });
    }

    return res.status(400).json({ error: 'Invalid action. Use approve or reject.' });
  } catch (error) {
    console.error('Ledger approval error:', error);
    return res.status(500).json({ error: 'Failed to process approval' });
  }
}

export default adminOnlyDuringObservation(handler);
