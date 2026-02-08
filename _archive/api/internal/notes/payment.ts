import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/server/db';
import { privateCreditNotes, notePaymentEvents } from '@/shared/schema';
import { eq, sql } from 'drizzle-orm';
import { adminOnlyDuringObservation } from '@/middleware/observationGuard';
import { isPrivateCreditSelfFundedEnabled, isInObservationMode } from '@/server/config/featureFlags';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isPrivateCreditSelfFundedEnabled()) {
    return res.status(503).json({
      error: 'MODULE_DISABLED',
      message: 'Private Credit Self-Funded module is not enabled',
    });
  }

  try {
    const {
      noteId,
      eventDate,
      eventType,
      amount,
      principalPortion,
      interestPortion,
      lateFee = 0,
      reference,
      notes,
    } = req.body;

    if (!noteId || !eventDate || !eventType || !amount) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'noteId, eventDate, eventType, and amount are required',
      });
    }

    const [note] = await db
      .select()
      .from(privateCreditNotes)
      .where(eq(privateCreditNotes.id, noteId));

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (!note.isSelfFunded) {
      return res.status(403).json({
        error: 'OBSERVATION_MODE_VIOLATION',
        message: 'Only self-funded notes can be serviced during observation mode',
      });
    }

    const adminUserId = 1;
    const principal = principalPortion || 0;
    const interest = interestPortion || 0;

    const newOutstanding = parseFloat(note.outstandingPrincipal || '0') - parseFloat(principal.toString());
    const newTotalPayments = parseFloat(note.totalPaymentsReceived || '0') + parseFloat(amount.toString());

    const [payment] = await db
      .insert(notePaymentEvents)
      .values({
        noteId,
        eventDate: new Date(eventDate),
        eventType,
        amount: amount.toString(),
        principalPortion: principal.toString(),
        interestPortion: interest.toString(),
        lateFee: lateFee.toString(),
        balanceAfter: newOutstanding.toString(),
        reference,
        notes,
        recordedBy: adminUserId,
      })
      .returning();

    const newStatus = newOutstanding <= 0 ? 'paid_off' : note.status === 'draft' ? 'current' : note.status;

    await db
      .update(privateCreditNotes)
      .set({
        outstandingPrincipal: Math.max(0, newOutstanding).toString(),
        totalPaymentsReceived: newTotalPayments.toString(),
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(privateCreditNotes.id, noteId));

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      payment,
      noteStatus: newStatus,
      remainingBalance: Math.max(0, newOutstanding),
      observationMode: isInObservationMode(),
    });
  } catch (error) {
    console.error('Payment recording error:', error);
    return res.status(500).json({ error: 'Failed to record payment' });
  }
}

export default adminOnlyDuringObservation(handler);
