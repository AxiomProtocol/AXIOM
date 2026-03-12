import { getUnitClient, isUnitConfigured } from '../unit/client';
import { generateIdempotencyKey } from '../unit/helpers';
import { db } from '../db';
import { unitPayments, unitRecurringPayments } from '../../shared/unitSchema';
import { eq } from 'drizzle-orm';

export interface BookPaymentParams {
  walletAddress: string;
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  description: string;
  purpose?: string;
  susuGroupId?: string;
}

export interface AchDebitParams {
  walletAddress: string;
  toAccountId: string;
  counterpartyId: string;
  amountCents: number;
  description: string;
  purpose?: string;
}

export interface RecurringPaymentParams {
  walletAddress: string;
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  description: string;
  frequency: 'Monthly' | 'Weekly' | 'Biweekly';
  numberOfPayments?: number;
  susuGroupId?: string;
  purpose?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  unitPaymentId?: string;
  status?: string;
  error?: string;
}

export class UnitPaymentService {
  async createBookPayment(params: BookPaymentParams): Promise<PaymentResult> {
    if (!isUnitConfigured()) {
      return { success: false, error: 'Banking service is not configured.' };
    }
    const client = getUnitClient();
    if (!client) return { success: false, error: 'Banking service unavailable.' };

    const idempotencyKey = generateIdempotencyKey('book');

    try {
      const response = await client.payments.create({
        data: {
          type: 'bookPayment',
          attributes: {
            amount: params.amountCents,
            description: params.description,
            idempotencyKey,
          },
          relationships: {
            account: { data: { type: 'depositAccount', id: params.fromAccountId } },
            counterpartyAccount: { data: { type: 'depositAccount', id: params.toAccountId } },
          },
        },
      });

      const payment = response.data;
      const unitPaymentId = payment.id;
      const attrs = payment.attributes as { status?: string };

      const [inserted] = await db
        .insert(unitPayments)
        .values({
          walletAddress: params.walletAddress.toLowerCase(),
          unitPaymentId,
          idempotencyKey,
          paymentType: 'book',
          status: (attrs.status ?? 'Pending') as 'Pending' | 'Sent' | 'Clearing' | 'Returned' | 'Rejected' | 'Canceled' | 'Cleared',
          amountCents: params.amountCents,
          description: params.description,
          purpose: params.purpose ?? undefined,
          fromAccountId: params.fromAccountId,
          toAccountId: params.toAccountId,
          susuGroupId: params.susuGroupId ?? undefined,
        })
        .returning({ id: unitPayments.id });

      return { success: true, paymentId: inserted.id, unitPaymentId, status: attrs.status };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[UnitPaymentService] createBookPayment error:', msg);
      return { success: false, error: 'Payment failed. Please try again.' };
    }
  }

  async createAchDebit(params: AchDebitParams): Promise<PaymentResult> {
    if (!isUnitConfigured()) {
      return { success: false, error: 'Banking service is not configured.' };
    }
    const client = getUnitClient();
    if (!client) return { success: false, error: 'Banking service unavailable.' };

    const idempotencyKey = generateIdempotencyKey('ach-debit');

    try {
      const response = await client.payments.create({
        data: {
          type: 'achPayment',
          attributes: {
            amount: params.amountCents,
            description: params.description,
            direction: 'Debit',
            idempotencyKey,
          },
          relationships: {
            account: { data: { type: 'depositAccount', id: params.toAccountId } },
            counterparty: { data: { type: 'counterparty', id: params.counterpartyId } },
          },
        },
      });

      const payment = response.data;
      const unitPaymentId = payment.id;
      const attrs = payment.attributes as { status?: string };

      const [inserted] = await db
        .insert(unitPayments)
        .values({
          walletAddress: params.walletAddress.toLowerCase(),
          unitPaymentId,
          idempotencyKey,
          paymentType: 'ach_debit',
          status: (attrs.status ?? 'Pending') as 'Pending' | 'Sent' | 'Clearing' | 'Returned' | 'Rejected' | 'Canceled' | 'Cleared',
          amountCents: params.amountCents,
          description: params.description,
          purpose: params.purpose ?? undefined,
          toAccountId: params.toAccountId,
        })
        .returning({ id: unitPayments.id });

      return { success: true, paymentId: inserted.id, unitPaymentId, status: attrs.status };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[UnitPaymentService] createAchDebit error:', msg);
      return { success: false, error: 'ACH payment failed. Please try again.' };
    }
  }

  async createRecurringPayment(params: RecurringPaymentParams): Promise<{
    success: boolean;
    recurringId?: string;
    unitRecurringId?: string;
    error?: string;
  }> {
    if (!isUnitConfigured()) {
      return { success: false, error: 'Banking service is not configured.' };
    }
    const client = getUnitClient();
    if (!client) return { success: false, error: 'Banking service unavailable.' };

    const idempotencyKey = generateIdempotencyKey('recurring');

    try {
      const response = await client.recurringPayments.create({
        data: {
          type: 'recurringBookPayment',
          attributes: {
            amount: params.amountCents,
            description: params.description,
            schedule: {
              interval: params.frequency,
              ...(params.numberOfPayments ? { totalNumberOfPayments: params.numberOfPayments } : {}),
            },
            idempotencyKey,
          },
          relationships: {
            account: { data: { type: 'depositAccount', id: params.fromAccountId } },
            counterpartyAccount: { data: { type: 'depositAccount', id: params.toAccountId } },
          },
        },
      });

      const recurring = response.data;
      const unitRecurringId = recurring.id;
      const attrs = recurring.attributes as {
        status?: string;
        nextScheduledAction?: string;
        numberOfPayments?: number;
        remainingNumberOfPayments?: number;
      };

      const [inserted] = await db
        .insert(unitRecurringPayments)
        .values({
          walletAddress: params.walletAddress.toLowerCase(),
          unitRecurringId,
          status: attrs.status ?? 'Active',
          amountCents: params.amountCents,
          description: params.description,
          purpose: params.purpose ?? undefined,
          fromAccountId: params.fromAccountId,
          toAccountId: params.toAccountId,
          susuGroupId: params.susuGroupId ?? undefined,
          frequency: params.frequency,
          nextPaymentDate: attrs.nextScheduledAction?.split('T')[0] ?? undefined,
          totalPaymentsCount: attrs.numberOfPayments ?? params.numberOfPayments ?? undefined,
          remainingPaymentsCount: attrs.remainingNumberOfPayments ?? params.numberOfPayments ?? undefined,
        })
        .returning({ id: unitRecurringPayments.id });

      return { success: true, recurringId: inserted.id, unitRecurringId };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[UnitPaymentService] createRecurringPayment error:', msg);
      return { success: false, error: 'Failed to set up automatic payment.' };
    }
  }

  async cancelRecurringPayment(unitRecurringId: string): Promise<{ success: boolean; error?: string }> {
    if (!isUnitConfigured()) return { success: false, error: 'Banking service is not configured.' };
    const client = getUnitClient();
    if (!client) return { success: false, error: 'Banking service unavailable.' };

    try {
      await client.recurringPayments.disable(unitRecurringId);

      await db
        .update(unitRecurringPayments)
        .set({ status: 'Disabled', canceledAt: new Date(), updatedAt: new Date() })
        .where(eq(unitRecurringPayments.unitRecurringId, unitRecurringId));

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[UnitPaymentService] cancelRecurringPayment error:', msg);
      return { success: false, error: 'Failed to cancel automatic payment.' };
    }
  }

  async processSusuPayout(params: {
    walletAddress: string;
    fromPoolAccountId: string;
    toMemberAccountId: string;
    amountCents: number;
    groupName: string;
    cycleNumber: number;
    susuGroupId: string;
  }): Promise<PaymentResult> {
    return this.createBookPayment({
      walletAddress: params.walletAddress,
      fromAccountId: params.fromPoolAccountId,
      toAccountId: params.toMemberAccountId,
      amountCents: params.amountCents,
      description: `Wealth Practice Payout — ${params.groupName} — Cycle ${params.cycleNumber}`,
      purpose: 'susu_payout',
      susuGroupId: params.susuGroupId,
    });
  }

  async collectSusuContribution(params: {
    walletAddress: string;
    fromMemberAccountId: string;
    toPoolAccountId: string;
    amountCents: number;
    groupName: string;
    cycleNumber: number;
    susuGroupId: string;
  }): Promise<PaymentResult> {
    return this.createBookPayment({
      walletAddress: params.walletAddress,
      fromAccountId: params.fromMemberAccountId,
      toAccountId: params.toPoolAccountId,
      amountCents: params.amountCents,
      description: `Wealth Practice Contribution — ${params.groupName} — Cycle ${params.cycleNumber}`,
      purpose: 'susu_contribution',
      susuGroupId: params.susuGroupId,
    });
  }
}

export const unitPaymentService = new UnitPaymentService();
