import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAdminKey } from '@/src/config/adminRoles';
import { getStripe } from '@/lib/stripe/client';
import { db } from '@/server/db';
import { capCardDeposits, capAuditEvents } from '@/shared/capInfraSchema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '@/lib/capinfra/ids';

/**
 * POST /api/capinfra/operator/reconcile-session
 *
 * Admin-only manual reconciliation for a Stripe checkout session.
 * Fetches the session from Stripe, verifies payment_status === 'paid',
 * marks the deposit PAID, and credits the internal wallet if intent
 * is WALLET_TOPUP. Idempotent — safe to call multiple times.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!validateAdminKey(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { session_id } = req.body ?? {};
  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ success: false, error: 'session_id required' });
  }

  try {
    const stripe = await getStripe();

    // Fetch live session state from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent'],
    });

    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: `Session payment_status is '${session.payment_status}' — must be 'paid' to reconcile`,
        session_id,
      });
    }

    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent as any)?.id ?? null;

    // Look up deposit — try metadata cardDepositId first, then session id
    const cardDepositId: string | undefined = (session.metadata as any)?.cardDepositId;
    const deposits = cardDepositId
      ? await db.select().from(capCardDeposits).where(eq(capCardDeposits.id, cardDepositId)).limit(1)
      : await db.select().from(capCardDeposits).where(eq(capCardDeposits.stripeSessionId, session_id)).limit(1);

    const dep = deposits[0];
    if (!dep) {
      return res.status(404).json({
        success: false,
        error: 'No deposit row found for this session — checkout may have been initiated from a different environment',
        session_id,
        hint: 'Check that this session was created by this environment\'s checkout endpoint',
      });
    }

    if (dep.status !== 'PENDING') {
      return res.status(200).json({
        success: true,
        already_reconciled: true,
        deposit_id: dep.id,
        status: dep.status,
        message: `Deposit already in status '${dep.status}' — no action taken`,
      });
    }

    // Atomic PENDING → PAID transition
    const transitioned = await db
      .update(capCardDeposits)
      .set({
        status: 'PAID',
        stripePaymentIntentId: paymentIntentId ?? dep.stripePaymentIntentId,
        buyerEmail: session.customer_email ?? dep.buyerEmail,
        updatedAt: new Date(),
      })
      .where(and(
        eq(capCardDeposits.id, dep.id),
        eq(capCardDeposits.status, 'PENDING'),
      ))
      .returning({ id: capCardDeposits.id });

    if (transitioned.length === 0) {
      return res.status(200).json({
        success: true,
        already_reconciled: true,
        deposit_id: dep.id,
        message: 'Race: another process already transitioned this deposit',
      });
    }

    // Write audit event
    await db.insert(capAuditEvents).values({
      id: generateId('ae'),
      eventType: 'card_deposit.manual_reconcile',
      aggregateType: 'card_deposit',
      aggregateId: dep.id,
      payloadJson: { sessionId: session_id, paymentIntentId, operator: 'admin', source: 'reconcile-session' },
    }).onConflictDoNothing();

    let walletCredited = false;
    let walletError: string | null = null;

    // Credit wallet for WALLET_TOPUP intent
    if (dep.intent === 'WALLET_TOPUP' && dep.userId) {
      try {
        const { creditTopUp } = await import('@/lib/wallet/service');
        await creditTopUp({
          userId: dep.userId,
          amountCents: dep.amountCents,
          referenceId: dep.id,
          idempotencyKey: `wallet-topup-credit-${dep.id}`,
          notes: `Manual reconcile — Stripe session ${session_id}`,
        });
        walletCredited = true;

        await db.insert(capAuditEvents).values({
          id: generateId('ae'),
          eventType: 'card_deposit.wallet_credited',
          aggregateType: 'card_deposit',
          aggregateId: dep.id,
          payloadJson: { userId: dep.userId, amountCents: dep.amountCents, source: 'reconcile-session' },
        }).onConflictDoNothing();
      } catch (err: any) {
        walletError = err?.message ?? String(err);
      }
    }

    return res.status(200).json({
      success: true,
      deposit_id: dep.id,
      intent: dep.intent,
      amount_cents: dep.amountCents,
      amount_usd: dep.amountCents / 100,
      new_status: 'PAID',
      wallet_credited: walletCredited,
      wallet_error: walletError,
      payment_intent_id: paymentIntentId,
    });
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.error('[reconcile-session]', msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
