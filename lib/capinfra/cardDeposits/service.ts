/**
 * Card-deposit service.
 *
 * Card-funded onramp via Stripe Checkout. Two intents are supported:
 *   - TREASURY_FUND: card payment lands in Stripe balance, then
 *     subsequently pays out (operator-triggered or auto-scheduled) to
 *     the Increase Nexus account configured as a Stripe external bank
 *     account. Status walks: PENDING -> PAID -> PAYOUT_INITIATED ->
 *     SETTLED.
 *   - AXUSD_MINT: on PAID, the system mints AXUSD 1:1 to the
 *     targetWalletAddress on Arbitrum. Treasury USD accumulates in
 *     Stripe/Increase as backing.
 *
 * The webhook handler is idempotent on Stripe event id; the deposit
 * row is idempotent on (userId-supplied or generated) idempotencyKey.
 */

import { db } from '../../../server/db';
import {
  getStripe,
  currentStripeAccountId,
  assertCurrentStripeAccount,
} from '../../stripe/client';
import {
  capCardDeposits,
  capCardDepositWebhookEvents,
  capAuditEvents,
  type CapCardDeposit,
  type NewCapCardDeposit,
  type NewCapCardDepositWebhookEvent,
  type NewCapAuditEvent,
} from '../../../shared/capInfraSchema';
import { eq, desc, and, sql, type SQL } from 'drizzle-orm';
import { generateId } from '../ids';
import { centsToDecimalString, type UsdDecimalString } from '../money';
import { maybeEmitDrainArchiveEmail } from './drainArchive';

export type CardDepositIntent = 'TREASURY_FUND' | 'AXUSD_MINT' | 'AXAU_MINT';
export type CardDepositStatus =
  | 'PENDING'
  | 'PAID'
  | 'MINTED'
  | 'PAYOUT_INITIATED'
  | 'SETTLED'
  | 'FAILED'
  | 'REFUNDED';

const VALID_INTENTS: ReadonlyArray<CardDepositIntent> = [
  'TREASURY_FUND', 'AXUSD_MINT', 'AXAU_MINT',
];

const MIN_AMOUNT_CENTS = 100;          // $1.00 — Stripe min for cards
const MAX_AMOUNT_CENTS = 1_000_000;    // $10,000 — protective cap

export interface CreateCheckoutInput {
  amountCents: number;
  intent: CardDepositIntent;
  userId?: string | null;
  buyerEmail?: string | null;
  targetWalletAddress?: string | null;
  idempotencyKey: string;
  baseUrl: string;
}

export interface CreateCheckoutResult {
  deposit: CapCardDeposit;
  checkoutUrl: string;
  sessionId: string;
}

function validateInput(input: CreateCheckoutInput): void {
  if (!Number.isInteger(input.amountCents)) {
    throw new Error('amountCents must be an integer (whole cents)');
  }
  if (input.amountCents < MIN_AMOUNT_CENTS || input.amountCents > MAX_AMOUNT_CENTS) {
    throw new Error(
      `amountCents must be between ${MIN_AMOUNT_CENTS} and ${MAX_AMOUNT_CENTS}`,
    );
  }
  if (!VALID_INTENTS.includes(input.intent)) {
    throw new Error(`intent must be one of ${VALID_INTENTS.join(', ')}`);
  }
  if (input.intent === 'AXUSD_MINT' || input.intent === 'AXAU_MINT') {
    if (!input.targetWalletAddress || !/^0x[a-fA-F0-9]{40}$/.test(input.targetWalletAddress)) {
      throw new Error('targetWalletAddress (0x...) is required for mint intents');
    }
  }
  if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
    throw new Error('idempotencyKey is required (min 8 chars)');
  }
  if (input.idempotencyKey.length > 200) {
    throw new Error('idempotencyKey must be at most 200 chars');
  }
  if (!input.baseUrl) throw new Error('baseUrl is required');
}

function intentLabel(intent: CardDepositIntent): string {
  switch (intent) {
    case 'TREASURY_FUND': return 'Axiom Treasury Funding (USD)';
    case 'AXUSD_MINT': return 'AXUSD Purchase (1:1 USD)';
    case 'AXAU_MINT': return 'AXAU Purchase';
  }
}

export async function createCheckoutSession(
  input: CreateCheckoutInput,
): Promise<CreateCheckoutResult> {
  validateInput(input);

  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured');

  // Idempotent replay: if a deposit with this key already exists, return it.
  const existing = await db
    .select()
    .from(capCardDeposits)
    .where(eq(capCardDeposits.idempotencyKey, input.idempotencyKey))
    .limit(1);
  if (existing[0]) {
    const dep = existing[0];
    if (
      dep.amountCents !== input.amountCents ||
      dep.intent !== input.intent ||
      (dep.targetWalletAddress ?? null) !== (input.targetWalletAddress ?? null)
    ) {
      throw new Error('Idempotency key reused with a different payload');
    }
    if (!dep.stripeSessionId) {
      throw new Error('Existing deposit has no Stripe session id; cannot resume');
    }
    // Re-fetch the session URL from Stripe so the caller can redirect.
    const stripe = await getStripe();
    // Refuse to resume a deposit whose session belongs to a different
    // Stripe account than the live key resolves to (task #400). Throws
    // `LegacyStripeAccountError` for the route handler to surface.
    await assertCurrentStripeAccount(dep.stripeAccountId);
    const session = await stripe.checkout.sessions.retrieve(dep.stripeSessionId);
    return {
      deposit: dep,
      checkoutUrl: session.url ?? '',
      sessionId: dep.stripeSessionId,
    };
  }

  const id = generateId('cd');
  const stripe = await getStripe();
  const stripeAccountId = await currentStripeAccountId();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: intentLabel(input.intent),
          description: input.intent === 'TREASURY_FUND'
            ? 'Funds Axiom Protocol USD treasury via Increase.'
            : input.intent === 'AXUSD_MINT'
              ? `Mints AXUSD to ${input.targetWalletAddress}.`
              : `Purchases AXAU for ${input.targetWalletAddress}.`,
        },
        unit_amount: input.amountCents,
      },
      quantity: 1,
    }],
    metadata: {
      cardDepositId: id,
      intent: input.intent,
      ...(input.targetWalletAddress ? { targetWalletAddress: input.targetWalletAddress } : {}),
      ...(input.userId ? { userId: input.userId } : {}),
    },
    customer_email: input.buyerEmail || undefined,
    success_url: `${input.baseUrl}/treasury/fund/success?dep_id=${id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.baseUrl}/treasury/fund/cancel?dep_id=${id}`,
  }, {
    idempotencyKey: `cap-card-deposit-${input.idempotencyKey}`,
  });

  const row: NewCapCardDeposit = {
    id,
    userId: input.userId ?? null,
    intent: input.intent,
    amountCents: input.amountCents,
    currency: 'usd',
    stripeSessionId: session.id,
    stripePaymentIntentId: typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null),
    status: 'PENDING',
    targetWalletAddress: input.targetWalletAddress ?? null,
    buyerEmail: input.buyerEmail ?? null,
    idempotencyKey: input.idempotencyKey,
    metadataJson: { source: 'card-onramp' },
    stripeAccountId,
  };
  // Race-safe insert: if a concurrent caller already inserted a row for
  // this idempotency key (or this Stripe session id), DO NOTHING and
  // re-fetch. Stripe's own idempotencyKey on session.create above means
  // both racers got the SAME session, so converging on one row is safe.
  const insertedRows = await db
    .insert(capCardDeposits)
    .values(row)
    .onConflictDoNothing({ target: capCardDeposits.idempotencyKey })
    .returning();
  let inserted = insertedRows[0];
  if (!inserted) {
    const refetched = await db
      .select()
      .from(capCardDeposits)
      .where(eq(capCardDeposits.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (!refetched[0]) throw new Error('insert race: row vanished after conflict');
    inserted = refetched[0];
  }

  await emitAudit({
    eventType: 'card_deposit.created',
    aggregateId: id,
    payload: {
      intent: input.intent,
      amountCents: input.amountCents,
      sessionId: session.id,
    },
  });

  return {
    deposit: inserted,
    checkoutUrl: session.url ?? '',
    sessionId: session.id,
  };
}

export interface WebhookProcessResult {
  duplicate: boolean;
  depositId: string | null;
  newStatus: CardDepositStatus | null;
  message: string;
}

/**
 * Process a verified Stripe webhook event. Idempotent on Stripe event
 * id. Concurrency-safe: races to claim the event row first, and only
 * the winner performs side effects. Never throws — all internal
 * failures are caught and recorded as audit events so the route handler
 * can always return 200 once Stripe-signature verification has passed.
 */
export async function handleStripeWebhookEvent(
  event: { id: string; type: string; data: { object: any } },
): Promise<WebhookProcessResult> {
  // ATOMIC GATEWAY IDEMPOTENCY: insert the webhook event row FIRST with
  // ON CONFLICT DO NOTHING. Only the worker that successfully inserts
  // the row owns the right to perform side effects. All other concurrent
  // deliveries see a no-op and return immediately. This eliminates the
  // duplicate-mint race that exists with select-then-process patterns.
  // Stamp `stripe_account_id` from the verified live key (task #400) so
  // the audit log carries provenance for which Stripe account signed it.
  const stripeAccountId = await currentStripeAccountId();
  const evRow: NewCapCardDepositWebhookEvent = {
    id: generateId('we'),
    stripeEventId: event.id,
    eventType: event.type,
    depositId: null,
    payloadJson: { type: event.type, claimedAt: new Date().toISOString() },
    stripeAccountId,
  };
  // IMPORTANT: a thrown error here (DB unreachable, connection lost,
  // etc.) is allowed to propagate. The route handler will surface it
  // as a 5xx so Stripe RETRIES delivery — no event has been claimed
  // yet, so retry is safe and required to avoid silently losing a
  // paid webhook. Only a successful insert returning 0 rows (i.e. the
  // ON CONFLICT path) is treated as a benign duplicate.
  const claimed = await db
    .insert(capCardDepositWebhookEvents)
    .values(evRow)
    .onConflictDoNothing({ target: capCardDepositWebhookEvents.stripeEventId })
    .returning({ id: capCardDepositWebhookEvents.id });
  if (claimed.length === 0) {
    // Another worker (or Stripe retry) already claimed this event.
    return {
      duplicate: true,
      depositId: null,
      newStatus: null,
      message: 'duplicate Stripe event id; no-op',
    };
  }

  let depositId: string | null = null;
  let newStatus: CardDepositStatus | null = null;
  let message = `event ${event.type} ignored`;

  // From here on, every error is caught and recorded; the function still
  // returns successfully so the route handler returns 200 to Stripe.
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const sessionId: string = session.id;
      const cardDepositId: string | undefined = session.metadata?.cardDepositId;
      const paymentIntentId: string | null = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent?.id ?? null);

      const dep = cardDepositId
        ? (await db.select().from(capCardDeposits).where(eq(capCardDeposits.id, cardDepositId)).limit(1))[0]
        : (await db.select().from(capCardDeposits).where(eq(capCardDeposits.stripeSessionId, sessionId)).limit(1))[0];

      if (dep && session.payment_status === 'paid') {
        // ATOMIC STATE TRANSITION: only the writer that flips PENDING→PAID
        // performs side effects. If 0 rows are updated, another path
        // (replay, parallel worker) already won and we no-op.
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

        depositId = dep.id;
        if (transitioned.length === 1) {
          newStatus = 'PAID';
          message = 'deposit marked PAID';

          await emitAudit({
            eventType: 'card_deposit.paid',
            aggregateId: dep.id,
            payload: {
              intent: dep.intent,
              amountCents: dep.amountCents,
              sessionId,
              paymentIntentId,
            },
          });

          // AXUSD mint hook only fires for the actor that won the
          // transition. tryMintAxusd is itself try/catch and never throws.
          if (dep.intent === 'AXUSD_MINT' && dep.targetWalletAddress) {
            await tryMintAxusd(dep.id, dep.targetWalletAddress, dep.amountCents);
          } else if (dep.intent === 'AXAU_MINT') {
            await emitAudit({
              eventType: 'card_deposit.mint_pending',
              aggregateId: dep.id,
              payload: {
                intent: dep.intent,
                targetWalletAddress: dep.targetWalletAddress,
                amountCents: dep.amountCents,
                note: 'AXAU mint pipeline not yet wired into card-onramp; queued for ops.',
              },
            });
          }
        } else {
          message = `deposit ${dep.id} already past PENDING; no-op (idempotent replay)`;
        }
      } else if (dep) {
        depositId = dep.id;
        message = `deposit ${dep.id} status=${dep.status} payment_status=${session.payment_status}; no-op`;
      } else {
        message = `no card deposit row found for session ${sessionId}`;
      }
    } else if (event.type === 'payout.paid') {
      const payout = event.data.object;
      const payoutId: string = payout.id;
      // Conditional update — only transitions are valid from PAYOUT_INITIATED.
      const transitioned = await db
        .update(capCardDeposits)
        .set({ status: 'SETTLED', updatedAt: new Date() })
        .where(and(
          eq(capCardDeposits.stripePayoutId, payoutId),
          eq(capCardDeposits.status, 'PAYOUT_INITIATED'),
        ))
        .returning({ id: capCardDeposits.id });
      if (transitioned.length === 1) {
        depositId = transitioned[0].id;
        newStatus = 'SETTLED';
        message = 'deposit marked SETTLED via payout.paid';
        await emitAudit({
          eventType: 'card_deposit.settled',
          aggregateId: transitioned[0].id,
          payload: { payoutId },
        });
      } else {
        message = `payout ${payoutId} did not match a deposit in PAYOUT_INITIATED; no-op`;
      }
    } else if (event.type === 'payout.failed') {
      const payout = event.data.object;
      const payoutId: string = payout.id;
      const reason = `payout failed: ${payout.failure_code ?? 'unknown'} ${payout.failure_message ?? ''}`.trim();
      const transitioned = await db
        .update(capCardDeposits)
        .set({ status: 'FAILED', errorReason: reason, updatedAt: new Date() })
        .where(and(
          eq(capCardDeposits.stripePayoutId, payoutId),
          eq(capCardDeposits.status, 'PAYOUT_INITIATED'),
        ))
        .returning({ id: capCardDeposits.id });
      if (transitioned.length === 1) {
        depositId = transitioned[0].id;
        newStatus = 'FAILED';
        message = 'deposit marked FAILED via payout.failed';
        await emitAudit({
          eventType: 'card_deposit.payout_failed',
          aggregateId: transitioned[0].id,
          payload: { payoutId, failureCode: payout.failure_code, failureMessage: payout.failure_message },
        });
      } else {
        message = `payout ${payoutId} not in PAYOUT_INITIATED; no-op`;
      }
    }
  } catch (err: any) {
    console.error('[cardDeposits] webhook side-effect error:', err?.message);
    message = `processing_error:${err?.message ?? 'unknown'}`;
    // Best-effort audit; never re-throw.
    try {
      await emitAudit({
        eventType: 'card_deposit.webhook_error',
        aggregateId: depositId ?? event.id,
        payload: { eventType: event.type, error: err?.message ?? String(err) },
      });
    } catch { /* swallow */ }
  }

  // Backfill the gateway event row with depositId + summary now that
  // we know it. Failure here is non-fatal.
  try {
    await db
      .update(capCardDepositWebhookEvents)
      .set({
        depositId,
        payloadJson: { type: event.type, summary: message },
      })
      .where(eq(capCardDepositWebhookEvents.stripeEventId, event.id));
  } catch (err: any) {
    console.error('[cardDeposits] gateway backfill failed:', err?.message);
  }

  // Drain-completion archive (task #250). Only run on real status
  // transitions; the emitter is non-throwing and self-gates on
  // in-flight > 0 / marker-present.
  if (newStatus !== null) {
    await maybeEmitDrainArchiveEmail();
  }

  return { duplicate: false, depositId, newStatus, message };
}

export interface ListDepositsFilter {
  status?: CardDepositStatus | null;
  intent?: CardDepositIntent | null;
  limit?: number;
}

export async function listDeposits(filter: ListDepositsFilter = {}): Promise<CapCardDeposit[]> {
  const conds: SQL[] = [];
  if (filter.status) conds.push(eq(capCardDeposits.status, filter.status));
  if (filter.intent) conds.push(eq(capCardDeposits.intent, filter.intent));
  const limit = Math.min(Math.max(filter.limit ?? 100, 1), 500);
  const q = db
    .select()
    .from(capCardDeposits)
    .orderBy(desc(capCardDeposits.createdAt), desc(capCardDeposits.id))
    .limit(limit);
  return conds.length ? await q.where(and(...conds)) : await q;
}

/**
 * Best-effort internal call to the AXUSD admin mint endpoint. Records
 * the resulting tx hash on the deposit row, or an audit event on
 * failure. Never throws — webhook handler must remain idempotent and
 * always succeed once the payment is recorded.
 */
async function tryMintAxusd(
  depositId: string,
  toAddress: string,
  amountCents: number,
): Promise<void> {
  try {
    const adminKey = process.env.ADMIN_SOLVENCY_KEY;
    if (!adminKey) {
      await emitAudit({
        eventType: 'card_deposit.mint_skipped',
        aggregateId: depositId,
        payload: { reason: 'ADMIN_SOLVENCY_KEY not configured' },
      });
      return;
    }
    // Internal loopback. Use a same-host URL if exposed; otherwise call
    // the handler directly to avoid network hops. Here we use loopback
    // because the mint route enforces its own auth and validation.
    const port = process.env.PORT ?? '5000';
    const url = `http://127.0.0.1:${port}/api/erc3643/admin/mint`;
    // Route the cents->decimal conversion through the canonical, branded
    // helper. This is the same fix shape as #202/#214/#226: keep raw
    // integer cents from being hand-formatted into a string that the
    // mint endpoint then interprets as a USD decimal amount.
    const amountAxusd: UsdDecimalString = centsToDecimalString(amountCents);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({
        toAddress,
        amountAxusd,
        reason: `card_deposit:${depositId}`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success) {
      const txHash: string | undefined = data.data?.txHash ?? data.data?.transactionHash ?? data.data?.safeTxHash;
      await db.update(capCardDeposits).set({
        status: 'MINTED',
        mintTxHash: txHash ?? null,
        updatedAt: new Date(),
      }).where(eq(capCardDeposits.id, depositId));
      await emitAudit({
        eventType: 'card_deposit.minted',
        aggregateId: depositId,
        payload: { toAddress, amountAxusd, txHash, mintStatus: data.data?.status },
      });
    } else {
      await emitAudit({
        eventType: 'card_deposit.mint_failed',
        aggregateId: depositId,
        payload: { toAddress, amountAxusd, status: res.status, error: data?.error ?? 'unknown' },
      });
    }
  } catch (err: any) {
    await emitAudit({
      eventType: 'card_deposit.mint_failed',
      aggregateId: depositId,
      payload: { toAddress, error: err?.message ?? String(err) },
    });
  }
}

async function emitAudit(args: {
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const row: NewCapAuditEvent = {
    id: generateId('ae'),
    eventType: args.eventType,
    aggregateType: 'card_deposit',
    aggregateId: args.aggregateId,
    payloadJson: args.payload as any,
    actor: 'system@card-deposit',
  };
  try {
    await db.insert(capAuditEvents).values(row);
  } catch (err: any) {
    // Audit write failure must not break the webhook; log and continue.
    console.error('[cardDeposits] audit insert failed:', err?.message);
  }
}
