import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/server/db';
import { privateCreditNotes } from '@/shared/schema';
import { eq, desc } from 'drizzle-orm';
import { adminOnlyDuringObservation } from '@/middleware/observationGuard';
import { isPrivateCreditSelfFundedEnabled, isInObservationMode } from '@/server/config/featureFlags';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isPrivateCreditSelfFundedEnabled()) {
    return res.status(503).json({
      error: 'MODULE_DISABLED',
      message: 'Private Credit Self-Funded module is not enabled',
    });
  }

  if (req.method === 'GET') {
    try {
      const notes = await db
        .select()
        .from(privateCreditNotes)
        .orderBy(desc(privateCreditNotes.createdAt))
        .limit(100);

      const summary = {
        totalNotes: notes.length,
        totalPrincipal: notes.reduce((sum, n) => sum + parseFloat(n.principal || '0'), 0),
        activeNotes: notes.filter(n => n.status === 'active' || n.status === 'current').length,
        draftNotes: notes.filter(n => n.status === 'draft').length,
      };

      return res.status(200).json({
        success: true,
        observationMode: isInObservationMode(),
        selfFundedOnly: true,
        notes,
        summary,
      });
    } catch (error) {
      console.error('Notes fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch notes' });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        principal,
        interestRate,
        termMonths,
        paymentFrequency = 'monthly',
        borrowerEntityName,
        collateralType,
        collateralDescription,
        collateralValue,
        originationDate,
        firstPaymentDate,
      } = req.body;

      if (!principal || !interestRate || !termMonths) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'principal, interestRate, and termMonths are required',
        });
      }

      if (parseFloat(interestRate) > 0.20) {
        return res.status(400).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Interest rate cannot exceed 20% (0.20) per governance policy',
        });
      }

      const ltvRatio = collateralValue ? parseFloat(principal) / parseFloat(collateralValue) : null;
      if (ltvRatio && ltvRatio > 0.80) {
        return res.status(400).json({
          error: 'LTV_LIMIT_EXCEEDED',
          message: 'LTV ratio cannot exceed 80% per RiskConfig policy',
        });
      }

      const noteNumber = `PCN-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      const adminUserId = 1;

      const originDate = originationDate ? new Date(originationDate) : new Date();
      const maturityDate = new Date(originDate);
      maturityDate.setMonth(maturityDate.getMonth() + parseInt(termMonths));

      const [note] = await db
        .insert(privateCreditNotes)
        .values({
          noteNumber,
          principal: principal.toString(),
          interestRate: interestRate.toString(),
          termMonths: parseInt(termMonths),
          paymentFrequency,
          issuer: 'Axiom Protocol Treasury',
          borrowerEntityName,
          isSelfFunded: true,
          collateralType,
          collateralDescription,
          collateralValue: collateralValue?.toString(),
          ltvRatio: ltvRatio?.toString(),
          originationDate: originDate,
          maturityDate,
          firstPaymentDate: firstPaymentDate ? new Date(firstPaymentDate) : null,
          status: 'draft',
          outstandingPrincipal: principal.toString(),
          accruedInterest: '0',
          totalPaymentsReceived: '0',
          riskConfigSnapshot: {
            maxLTV: 0.80,
            maxRate: 0.20,
            capturedAt: new Date().toISOString(),
          },
          createdBy: adminUserId,
        })
        .returning();

      return res.status(201).json({
        success: true,
        message: 'Private credit note created successfully',
        note,
        observationMode: isInObservationMode(),
        selfFundedOnly: true,
      });
    } catch (error) {
      console.error('Note creation error:', error);
      return res.status(500).json({ error: 'Failed to create note' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default adminOnlyDuringObservation(handler);
