import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/server/db';
import { ledgerEntries, treasuryAccounts, internalCounterparties, users } from '@/shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { adminOnlyDuringObservation } from '@/middleware/observationGuard';
import { isTreasuryInternalEnabled, isInObservationMode } from '@/server/config/featureFlags';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isTreasuryInternalEnabled()) {
    return res.status(503).json({
      error: 'MODULE_DISABLED',
      message: 'Treasury Internal module is not enabled',
    });
  }

  if (req.method === 'GET') {
    try {
      const entries = await db
        .select({
          id: ledgerEntries.id,
          entryDate: ledgerEntries.entryDate,
          description: ledgerEntries.description,
          entryType: ledgerEntries.entryType,
          amount: ledgerEntries.amount,
          currency: ledgerEntries.currency,
          status: ledgerEntries.status,
          category: ledgerEntries.category,
          referenceNumber: ledgerEntries.referenceNumber,
          debitAccountId: ledgerEntries.debitAccountId,
          creditAccountId: ledgerEntries.creditAccountId,
          createdAt: ledgerEntries.createdAt,
          approvedAt: ledgerEntries.approvedAt,
        })
        .from(ledgerEntries)
        .orderBy(desc(ledgerEntries.entryDate))
        .limit(100);

      return res.status(200).json({
        success: true,
        observationMode: isInObservationMode(),
        entries,
        count: entries.length,
      });
    } catch (error) {
      console.error('Ledger entries fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch ledger entries' });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        entryDate,
        description,
        entryType,
        amount,
        currency = 'USD',
        debitAccountId,
        creditAccountId,
        counterpartyId,
        category,
        referenceNumber,
        externalReference,
        notes,
      } = req.body;

      if (!entryDate || !description || !entryType || !amount) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'entryDate, description, entryType, and amount are required',
        });
      }

      const adminUserId = 1;

      const [entry] = await db
        .insert(ledgerEntries)
        .values({
          entryDate: new Date(entryDate),
          description,
          entryType,
          amount: amount.toString(),
          currency,
          debitAccountId,
          creditAccountId,
          counterpartyId,
          category,
          referenceNumber,
          externalReference,
          notes,
          status: 'pending',
          createdBy: adminUserId,
        })
        .returning();

      return res.status(201).json({
        success: true,
        message: 'Ledger entry created successfully',
        entry,
        observationMode: isInObservationMode(),
      });
    } catch (error) {
      console.error('Ledger entry creation error:', error);
      return res.status(500).json({ error: 'Failed to create ledger entry' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default adminOnlyDuringObservation(handler);
