/**
 * Property Analysis report — Stripe Checkout service (task #403).
 *
 * Re-enables card payment as a parallel option alongside the existing
 * on-chain AXUSD path. Both paths write the same `property_reports` table
 * and are distinguished by `stripe_session_id IS NULL` (on-chain) vs
 * `IS NOT NULL` (card).
 *
 * Buyers without a connected wallet now have a way to pay. The on-chain
 * path is unchanged (`/api/property/create-payment-intent` →
 * `/api/property/confirm-payment`).
 *
 * Architecture mirrors `lib/capinfra/cardDeposits/service.ts`:
 *   - `getStripe()` enforces the account-id pin on first use per process.
 *   - `currentStripeAccountId()` stamps `stripe_account_id` at insert so
 *     every Stripe-bearing row carries provenance (task #400).
 *   - Webhook gateway uses `property_report_webhook_events` with UNIQUE
 *     `stripe_event_id` and ON CONFLICT DO NOTHING for race-safe
 *     idempotency. Only the inserter performs report-paid side effects.
 *   - On `checkout.session.completed`, the webhook validates amount,
 *     currency, and account provenance before atomically transitioning
 *     `pending → paid`. Only the writer that wins the transition fires
 *     `generateReport()`.
 *   - Operator-side reads of stored Stripe ids call
 *     `assertCurrentStripeAccount()` first to refuse cross-account calls.
 *
 * Idempotency (review fix, post-architect):
 *   - The service derives a deterministic Stripe idempotency key from
 *     the buyer payload (address/tier/email/ip + 15-min bucket). Stripe
 *     returns the SAME checkout session for repeat calls within the
 *     window, so accidental double-clicks, modal reopens, and network
 *     retries all converge on the same payable session. The canonical
 *     report row is reused (never duplicated on retry) by reading back
 *     the pre-allocated reportId from the Stripe session metadata.
 *
 * Access control on poll (review fix, post-architect):
 *   - createCardCheckoutSession returns an `accessToken` (HMAC of the
 *     reportId keyed by STRIPE_SECRET_KEY). The checkout-status route
 *     requires this token, so the report's UUID alone is not a status
 *     oracle if it leaks via browser history / shared devices.
 */

import crypto from 'node:crypto';
import { db } from '../../server/db';
import {
  getStripe,
  currentStripeAccountId,
  assertCurrentStripeAccount,
} from '../stripe/client';
import {
  propertyReports,
  propertyReportWebhookEvents,
  type PropertyReport,
  type NewPropertyReportWebhookEvent,
} from '../../shared/propertySchema';
import { TIER_CONFIG, generateReport } from '../../server/services/property/pipeline';
import { and, eq } from 'drizzle-orm';

export type PropertyCardTier = 'base' | 'premium';

export interface CreateCardCheckoutInput {
  address: string;
  tier: PropertyCardTier;
  sqft?: number | null;
  bedrooms?: number | null;
  bathrooms?: string | null;
  yearBuilt?: number | null;
  propertyType?: string | null;
  buyerEmail?: string | null;
  ipAddress?: string | null;
  baseUrl: string;
}

export interface CreateCardCheckoutResult {
  reportId: string;
  checkoutUrl: string;
  sessionId: string;
  /**
   * Deterministic HMAC bound to reportId (keyed by STRIPE_SECRET_KEY).
   * Not time-bound — the same report id always produces the same token,
   * which is the property the modal relies on to keep polling after a
   * page reload. The /checkout-status poll endpoint requires this token
   * so a leaked report UUID alone cannot be used as a status oracle.
   * Effective security depends on the secrecy of STRIPE_SECRET_KEY.
   */
  accessToken: string;
}

function tierLabel(tier: PropertyCardTier): string {
  return tier === 'premium' ? 'Premium Property Report' : 'Base Property Report';
}

/**
 * 15-minute time bucket for Stripe idempotency. Inside this window,
 * identical payloads produce identical idempotency keys → Stripe
 * returns the same checkout session, preventing duplicate sessions
 * and duplicate charges from rapid double-clicks / modal reopens /
 * network retries. Outside the window the buyer can start a fresh
 * session (e.g. after canceling on Stripe's hosted page).
 */
function fifteenMinuteBucket(): string {
  const now = Date.now();
  const bucket = Math.floor(now / (15 * 60 * 1000));
  return String(bucket);
}

function deriveIdempotencyKey(input: CreateCardCheckoutInput): string {
  const material = [
    'property-card-v1',
    input.address.trim().toLowerCase(),
    input.tier,
    (input.buyerEmail ?? '').trim().toLowerCase(),
    input.ipAddress ?? '',
    fifteenMinuteBucket(),
  ].join('|');
  // Stripe accepts up to 255 chars; 64 hex is plenty.
  return crypto.createHash('sha256').update(material).digest('hex');
}

/**
 * Derive a stable UUID from the idempotency key. Critically, Stripe's
 * idempotency check compares the FULL request payload — if the
 * success_url embeds a reportId that changes between calls, Stripe
 * rejects the second call with "keys for idempotent requests can only
 * be used with the same parameters". Making the tentative reportId a
 * deterministic function of the idempotency key keeps the entire
 * Stripe request byte-identical across retries.
 *
 * Postgres `uuid` type accepts any 8-4-4-4-12 hex string regardless of
 * RFC 4122 version/variant bits, so we don't need to set those.
 */
function deterministicReportId(idempotencyKey: string): string {
  const hex = crypto.createHash('sha256')
    .update(`property-report-id:${idempotencyKey}`)
    .digest('hex')
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Sign a reportId with STRIPE_SECRET_KEY (always present when this
 * service runs — getStripe would have thrown otherwise). Truncated to
 * 32 base64url chars; full HMAC is ~43 chars and we don't need every
 * bit. Verified by exact string compare on the poll route.
 */
export function signReportAccess(reportId: string): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return crypto
    .createHmac('sha256', key)
    .update(`property-report-status:${reportId}`)
    .digest('base64url')
    .slice(0, 32);
}

export function verifyReportAccess(reportId: string, token: string): boolean {
  if (!reportId || !token) return false;
  let expected: string;
  try {
    expected = signReportAccess(reportId);
  } catch {
    return false;
  }
  if (expected.length !== token.length) return false;
  // Constant-time compare.
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

/**
 * Creates (or resumes) a Stripe Checkout session for the configured
 * tier price and returns the canonical pending property_reports row.
 *
 * Resume semantics: if the same buyer payload is submitted again
 * within the 15-minute idempotency window, Stripe returns the same
 * session and we return the same reportId — no duplicate row, no
 * duplicate session, no risk of double-charge.
 */
export async function createCardCheckoutSession(
  input: CreateCardCheckoutInput,
): Promise<CreateCardCheckoutResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }

  if (!input.address || input.address.trim().length < 5) {
    throw new Error('A valid property address is required');
  }
  if (input.tier !== 'base' && input.tier !== 'premium') {
    throw new Error('Invalid tier. Use base or premium.');
  }
  if (!input.baseUrl) throw new Error('baseUrl is required');

  const cfg = TIER_CONFIG[input.tier];
  if (!cfg || !cfg.priceCents || cfg.priceCents <= 0) {
    throw new Error(`Tier ${input.tier} has no card price configured.`);
  }

  // 1) Account-id pin enforced by getStripe(). On mismatch, throws
  //    StripeAccountMismatchError — the route maps it to a 503 so the
  //    operator fixes the env before we ever insert a Stripe id onto
  //    the row.
  const stripe = await getStripe();
  const stripeAccountId = await currentStripeAccountId();

  // 2) Pre-allocate the canonical reportId DETERMINISTICALLY from the
  //    idempotency key. This keeps the Stripe request byte-identical
  //    across retries — including the success_url which embeds the
  //    reportId — so Stripe's idempotency check is satisfied and the
  //    same checkout session is returned for repeat calls within the
  //    15-minute window.
  const idempotencyKey = deriveIdempotencyKey(input);
  const tentativeReportId = deterministicReportId(idempotencyKey);
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: tierLabel(input.tier),
            description: `Property Analysis report for ${input.address.trim()}`,
          },
          unit_amount: cfg.priceCents,
        },
        quantity: 1,
      }],
      customer_email: input.buyerEmail ?? undefined,
      success_url: `${input.baseUrl}/property/reports/${tentativeReportId}?paid=1`,
      cancel_url: `${input.baseUrl}/property?cancelled=1`,
      metadata: {
        reportId: tentativeReportId,
        tier: input.tier,
        source: 'property_report_card',
      },
    },
    { idempotencyKey },
  );

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL');
  }

  // 3) Resolve canonical reportId from Stripe metadata. On idempotency
  //    hit, this is the first call's UUID, not `tentativeReportId`.
  const canonicalReportId = (session.metadata?.reportId as string | undefined)
    ?? tentativeReportId;

  // 4) See if the row already exists from a previous call within the
  //    idempotency window.
  const [existing] = await db.select().from(propertyReports)
    .where(eq(propertyReports.id, canonicalReportId)).limit(1);

  if (existing) {
    // Already-pending row: return its reportId + the resumed Stripe
    // session URL. No new DB write, no new Stripe session.
    return {
      reportId: existing.id,
      checkoutUrl: session.url,
      sessionId: session.id,
      accessToken: signReportAccess(existing.id),
    };
  }

  // 5) Insert the canonical row. ON CONFLICT DO NOTHING handles the
  //    extremely narrow race where two concurrent callers with the
  //    same idempotency key both miss the SELECT above; only one
  //    INSERT lands and both callers re-SELECT the same row.
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : (session.payment_intent?.id ?? null);

  await db.insert(propertyReports).values({
    id: canonicalReportId,
    addressRaw: input.address.trim(),
    tier: input.tier,
    status: 'pending',
    sqft: input.sqft ?? null,
    bedrooms: input.bedrooms ?? null,
    bathrooms: input.bathrooms ?? null,
    yearBuilt: input.yearBuilt ?? null,
    propertyType: input.propertyType ?? null,
    buyerEmail: input.buyerEmail ?? null,
    ipAddress: input.ipAddress ?? null,
    amountPaidCents: cfg.priceCents,
    stripeSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    stripeAccountId,
  }).onConflictDoNothing({ target: propertyReports.id });

  const [report] = await db.select().from(propertyReports)
    .where(eq(propertyReports.id, canonicalReportId)).limit(1);

  if (!report) throw new Error('Failed to create or resume pending report row');

  return {
    reportId: report.id,
    checkoutUrl: session.url,
    sessionId: session.id,
    accessToken: signReportAccess(report.id),
  };
}

export interface WebhookProcessResult {
  duplicate: boolean;
  reportId: string | null;
  newStatus: string | null;
  message: string;
}

/**
 * Process a verified Stripe webhook event. Idempotent on Stripe event
 * id via the gateway insert into `property_report_webhook_events`.
 * Concurrency-safe: only the worker that successfully claims the row
 * performs side effects; all other deliveries see a benign no-op.
 *
 * Pre-mutation validation (review fix, post-architect):
 *   - amount_total must match the row's `amountPaidCents` (which was
 *     set from TIER_CONFIG at insert).
 *   - currency must be USD.
 *   - if the row's stripe_account_id is stamped, it must match the
 *     currently-resolved Stripe account.
 *   - payment_status must be 'paid'.
 * Any mismatch logs and returns success without firing generateReport
 * (the gateway row is already claimed so Stripe won't retry).
 *
 * Never throws on post-claim failures — the route handler always
 * returns 200 once the gateway claim succeeds, since retrying would
 * hit the same stripe_event_id and short-circuit. Operators see
 * failures via the `failed` status on the report row.
 */
export async function handlePropertyStripeWebhookEvent(
  event: { id: string; type: string; data: { object: any } },
): Promise<WebhookProcessResult> {
  const stripeAccountId = await currentStripeAccountId();
  const evRow: NewPropertyReportWebhookEvent = {
    stripeEventId: event.id,
    eventType: event.type,
    reportId: null,
    payloadJson: { type: event.type, claimedAt: new Date().toISOString() },
    stripeAccountId,
  };

  // ATOMIC GATEWAY IDEMPOTENCY: insert the webhook event row FIRST.
  // A thrown error here (DB unreachable, etc.) propagates up so the
  // route handler returns 5xx and Stripe retries — safe because no
  // event has been claimed yet.
  const claimed = await db
    .insert(propertyReportWebhookEvents)
    .values(evRow)
    .onConflictDoNothing({ target: propertyReportWebhookEvents.stripeEventId })
    .returning({ id: propertyReportWebhookEvents.id });

  if (claimed.length === 0) {
    return {
      duplicate: true,
      reportId: null,
      newStatus: null,
      message: 'duplicate Stripe event id; no-op',
    };
  }

  let reportId: string | null = null;
  let newStatus: string | null = null;
  let message = `event ${event.type} ignored`;

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const sessionId: string = session.id;
      const metaReportId: string | undefined = session.metadata?.reportId;
      const paymentIntentId: string | null = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent?.id ?? null);

      // Resolve by metadata.reportId first (most reliable), fall back to
      // stripe_session_id which is stamped on the row at create time.
      let report: PropertyReport | undefined;
      if (metaReportId) {
        const r = await db.select().from(propertyReports)
          .where(eq(propertyReports.id, metaReportId)).limit(1);
        report = r[0];
      }
      if (!report) {
        const r = await db.select().from(propertyReports)
          .where(eq(propertyReports.stripeSessionId, sessionId)).limit(1);
        report = r[0];
      }

      if (!report) {
        message = `no report found for session ${sessionId}`;
      } else {
        // Tag the gateway row with the resolved report id either way
        // (even on a no-op transition, this is the right report).
        await db.update(propertyReportWebhookEvents)
          .set({ reportId: report.id })
          .where(eq(propertyReportWebhookEvents.stripeEventId, event.id));

        reportId = report.id;

        // VALIDATION: refuse to mutate on amount/currency/account drift.
        const validationFailures: string[] = [];
        if (session.payment_status !== 'paid') {
          validationFailures.push(`payment_status=${session.payment_status}`);
        }
        if (typeof session.amount_total === 'number'
            && report.amountPaidCents != null
            && session.amount_total !== report.amountPaidCents) {
          validationFailures.push(
            `amount_total=${session.amount_total} != row.amountPaidCents=${report.amountPaidCents}`,
          );
        }
        if (typeof session.currency === 'string'
            && session.currency.toLowerCase() !== 'usd') {
          validationFailures.push(`currency=${session.currency}`);
        }
        try {
          await assertCurrentStripeAccount(report.stripeAccountId);
        } catch (acctErr: any) {
          validationFailures.push(`stripe_account_drift: ${acctErr?.message ?? 'unknown'}`);
        }

        if (validationFailures.length > 0) {
          console.error(
            `[property/webhook] validation refused for report ${report.id}: ${validationFailures.join('; ')}`,
          );
          newStatus = report.status;
          message = `validation_refused: ${validationFailures.join('; ')}`;
        } else {
          // ATOMIC STATE TRANSITION: only the writer that flips
          // pending → paid performs side effects.
          //
          // Restamp stripe_account_id on transition (review fix): for
          // post-#400 rows the column is already correct, but for any
          // legacy-NULL row that survived to this point we want to
          // tag it with the live account so future read-then-call
          // sites can use `assertCurrentStripeAccount()` strictly.
          const transitioned = await db
            .update(propertyReports)
            .set({
              status: 'paid',
              stripeSessionId: report.stripeSessionId ?? sessionId,
              stripePaymentIntentId: paymentIntentId ?? report.stripePaymentIntentId,
              stripeAccountId: report.stripeAccountId ?? stripeAccountId,
              buyerEmail: session.customer_email ?? report.buyerEmail,
              paymentConfirmedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(and(
              eq(propertyReports.id, report.id),
              eq(propertyReports.status, 'pending'),
            ))
            .returning({ id: propertyReports.id });

          if (transitioned.length === 1) {
            newStatus = 'paid';
            message = 'report marked paid';

            // Generate the report in-process. generateReport flips
            // status to 'generating' then to 'ready' or 'failed'
            // itself. Errors are swallowed here so the webhook still
            // returns 200 — a failed report row is visible to the
            // operator and to the buyer on /property/reports/{id}.
            try {
              await generateReport(report.id);
              newStatus = 'ready';
              message = 'report generated';
            } catch (genErr: any) {
              console.error(
                `[property/webhook] generateReport failed for ${report.id}:`,
                genErr?.message,
              );
              newStatus = 'failed';
              message = `generation failed: ${genErr?.message ?? 'unknown'}`;
            }
          } else {
            // Already past pending — duplicate webhook for an
            // already-paid row, or a race we lost. Just report
            // current state.
            const [current] = await db.select({ status: propertyReports.status })
              .from(propertyReports).where(eq(propertyReports.id, report.id)).limit(1);
            newStatus = current?.status ?? null;
            message = 'report already past pending';
          }
        }
      }
    }
  } catch (err: any) {
    // Post-claim failures don't propagate — log and return success.
    console.error(
      `[property/webhook] post-claim error for event ${event.id}:`,
      err?.message,
    );
    message = `post-claim error: ${err?.message ?? 'unknown'}`;
  }

  return { duplicate: false, reportId, newStatus, message };
}
