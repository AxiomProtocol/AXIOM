import { pool } from '../../server/db';
import {
  getStripe,
  currentStripeAccountId,
  assertCurrentStripeAccount,
  LegacyStripeAccountError,
} from '../stripe/client';
import { AuditLogger } from '../../server/services/sentinel/AuditLogger';

export { LegacyStripeAccountError };

const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;
const SENTINEL_PRICE_ID = process.env.BILLING_PRICE_ID_SENTINEL_MONTHLY || '';

const auditLogger = new AuditLogger();

export type SentinelSubStatus = 'active' | 'past_due' | 'canceled' | 'none';

export interface SentinelSubInfo {
  status: SentinelSubStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

async function writeAudit(
  walletAddress: string,
  action: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await auditLogger.initialize();
    await auditLogger.log(
      walletAddress,
      action,
      'sentinel_subscription',
      walletAddress,
      payload,
    );
  } catch (err) {
    console.warn('[sentinel/billing] audit write failed (non-fatal):', err);
  }
}

export const sentinelBilling = {
  async createCheckoutSession(
    walletAddress: string,
    email: string | undefined,
    successUrl: string,
    cancelUrl: string,
  ): Promise<string> {
    if (!stripeConfigured) throw new Error('Payment provider not configured');
    if (!SENTINEL_PRICE_ID) throw new Error('BILLING_PRICE_ID_SENTINEL_MONTHLY not configured');

    const stripe = await getStripe();
    const stripeAccountId = await currentStripeAccountId();

    const existing = await pool.query(
      `SELECT stripe_customer_id FROM sentinel_subscriptions WHERE wallet_address = $1 LIMIT 1`,
      [walletAddress],
    );

    let customerId: string | null = existing.rows[0]?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { walletAddress },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: SENTINEL_PRICE_ID, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { walletAddress },
    });

    await pool.query(
      `INSERT INTO sentinel_subscriptions
         (wallet_address, plan_key, status, stripe_customer_id, email, stripe_account_id, created_at, updated_at)
       VALUES ($1, 'sentinel_monthly', 'pending', $2, $3, $4, NOW(), NOW())
       ON CONFLICT (wallet_address) DO UPDATE
         SET stripe_customer_id = EXCLUDED.stripe_customer_id,
             email = COALESCE(EXCLUDED.email, sentinel_subscriptions.email),
             stripe_account_id = EXCLUDED.stripe_account_id,
             updated_at = NOW()`,
      [walletAddress, customerId, email ?? null, stripeAccountId],
    );

    await writeAudit(walletAddress, 'CHECKOUT_INITIATED', { customerId, stripeAccountId });

    return session.url || '';
  },

  async handleWebhook(payload: string, signature: string): Promise<void> {
    if (!stripeConfigured) throw new Error('Payment provider not configured');

    const webhookSecret = process.env.SENTINEL_BILLING_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('SENTINEL_BILLING_WEBHOOK_SECRET not configured');

    const stripe = await getStripe();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    const dedupeResult = await pool.query(
      `INSERT INTO sentinel_subscription_webhook_events
         (id, stripe_event_id, event_type, payload_json, stripe_account_id, processed_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
       ON CONFLICT (stripe_event_id) DO NOTHING
       RETURNING id`,
      [event.id, event.type, event.data.object, await currentStripeAccountId()],
    );

    if (!dedupeResult.rows.length) {
      console.log(`[sentinel/billing] duplicate webhook ${event.id} — skipped`);
      return;
    }

    const stripeAccountId = await currentStripeAccountId();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const walletAddress: string = session.metadata?.walletAddress;
        const customerId: string = session.customer;
        const subscriptionId: string = session.subscription;
        if (!walletAddress || !subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId) as any;
        const periodStart = new Date((sub.current_period_start as number) * 1000);
        const periodEnd = new Date((sub.current_period_end as number) * 1000);

        await pool.query(
          `INSERT INTO sentinel_subscriptions
             (wallet_address, plan_key, status, stripe_customer_id, stripe_subscription_id,
              current_period_start, current_period_end, cancel_at_period_end, stripe_account_id,
              created_at, updated_at)
           VALUES ($1, 'sentinel_monthly', 'active', $2, $3, $4, $5, FALSE, $6, NOW(), NOW())
           ON CONFLICT (wallet_address) DO UPDATE
             SET status = 'active',
                 stripe_customer_id = EXCLUDED.stripe_customer_id,
                 stripe_subscription_id = EXCLUDED.stripe_subscription_id,
                 current_period_start = EXCLUDED.current_period_start,
                 current_period_end = EXCLUDED.current_period_end,
                 cancel_at_period_end = FALSE,
                 stripe_account_id = EXCLUDED.stripe_account_id,
                 updated_at = NOW()`,
          [walletAddress, customerId, subscriptionId, periodStart, periodEnd, stripeAccountId],
        );
        await writeAudit(walletAddress, 'SUBSCRIPTION_ACTIVATED', { subscriptionId, stripeAccountId });
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as any;
        const customerId: string = sub.customer;
        const subscriptionId: string = sub.id;
        const periodStart = new Date((sub.current_period_start as number) * 1000);
        const periodEnd = new Date((sub.current_period_end as number) * 1000);
        const cancelAtPeriodEnd: boolean = sub.cancel_at_period_end ?? false;
        const status: string = sub.status;

        const mapped =
          status === 'active' ? 'active' :
          status === 'past_due' ? 'past_due' : 'canceled';

        await pool.query(
          `UPDATE sentinel_subscriptions
           SET status = $1,
               stripe_subscription_id = $2,
               current_period_start = $3,
               current_period_end = $4,
               cancel_at_period_end = $5,
               stripe_account_id = $6,
               updated_at = NOW()
           WHERE stripe_customer_id = $7`,
          [mapped, subscriptionId, periodStart, periodEnd, cancelAtPeriodEnd, stripeAccountId, customerId],
        );

        const row = await pool.query(
          `SELECT wallet_address FROM sentinel_subscriptions WHERE stripe_customer_id = $1 LIMIT 1`,
          [customerId],
        );
        if (row.rows[0]) {
          await writeAudit(row.rows[0].wallet_address, 'SUBSCRIPTION_UPDATED', {
            status: mapped, cancelAtPeriodEnd, stripeAccountId,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        const customerId: string = sub.customer;

        await pool.query(
          `UPDATE sentinel_subscriptions
           SET status = 'canceled', updated_at = NOW()
           WHERE stripe_customer_id = $1`,
          [customerId],
        );

        const row = await pool.query(
          `SELECT wallet_address FROM sentinel_subscriptions WHERE stripe_customer_id = $1 LIMIT 1`,
          [customerId],
        );
        if (row.rows[0]) {
          await writeAudit(row.rows[0].wallet_address, 'SUBSCRIPTION_CANCELED', { stripeAccountId });
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as any;
        const subscriptionId: string = invoice.subscription;
        if (!subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId) as any;
        const periodStart = new Date((sub.current_period_start as number) * 1000);
        const periodEnd = new Date((sub.current_period_end as number) * 1000);

        await pool.query(
          `UPDATE sentinel_subscriptions
           SET status = 'active',
               current_period_start = $1,
               current_period_end = $2,
               updated_at = NOW()
           WHERE stripe_subscription_id = $3`,
          [periodStart, periodEnd, subscriptionId],
        );
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const subscriptionId: string = invoice.subscription;
        if (!subscriptionId) break;

        await pool.query(
          `UPDATE sentinel_subscriptions
           SET status = 'past_due', updated_at = NOW()
           WHERE stripe_subscription_id = $1`,
          [subscriptionId],
        );

        const row = await pool.query(
          `SELECT wallet_address FROM sentinel_subscriptions WHERE stripe_subscription_id = $1 LIMIT 1`,
          [subscriptionId],
        );
        if (row.rows[0]) {
          await writeAudit(row.rows[0].wallet_address, 'PAYMENT_FAILED', { subscriptionId, stripeAccountId });
        }
        break;
      }
    }
  },

  async getSubscriptionInfo(walletAddress: string): Promise<SentinelSubInfo> {
    const result = await pool.query(
      `SELECT status, current_period_start, current_period_end, cancel_at_period_end,
              stripe_customer_id, stripe_subscription_id
       FROM sentinel_subscriptions
       WHERE wallet_address = $1 LIMIT 1`,
      [walletAddress],
    );

    if (!result.rows.length) {
      return {
        status: 'none',
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      };
    }

    const row = result.rows[0];
    const status = (['active', 'past_due', 'canceled'].includes(row.status)
      ? row.status
      : 'none') as SentinelSubStatus;

    return {
      status,
      currentPeriodStart: row.current_period_start?.toISOString() ?? null,
      currentPeriodEnd: row.current_period_end?.toISOString() ?? null,
      cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
      stripeCustomerId: row.stripe_customer_id ?? null,
      stripeSubscriptionId: row.stripe_subscription_id ?? null,
    };
  },

  async cancelSubscription(walletAddress: string): Promise<{ ok: boolean; reason?: string }> {
    if (!stripeConfigured) return { ok: false, reason: 'Payment provider not configured' };

    const result = await pool.query(
      `SELECT stripe_subscription_id, stripe_account_id, status
       FROM sentinel_subscriptions WHERE wallet_address = $1 LIMIT 1`,
      [walletAddress],
    );

    if (!result.rows.length) return { ok: false, reason: 'No subscription found' };

    const row = result.rows[0];
    if (row.status === 'canceled') return { ok: false, reason: 'Subscription already canceled' };
    if (!row.stripe_subscription_id) {
      await pool.query(
        `UPDATE sentinel_subscriptions SET status = 'canceled', updated_at = NOW() WHERE wallet_address = $1`,
        [walletAddress],
      );
      await writeAudit(walletAddress, 'SUBSCRIPTION_CANCELED_LOCAL', { reason: 'no_stripe_id' });
      return { ok: true };
    }

    try {
      await assertCurrentStripeAccount(row.stripe_account_id);
      const stripe = await getStripe();
      await stripe.subscriptions.update(row.stripe_subscription_id, { cancel_at_period_end: true });

      await pool.query(
        `UPDATE sentinel_subscriptions
         SET cancel_at_period_end = TRUE, updated_at = NOW()
         WHERE wallet_address = $1`,
        [walletAddress],
      );

      await writeAudit(walletAddress, 'CANCEL_AT_PERIOD_END_SET', {
        subscriptionId: row.stripe_subscription_id,
      });

      return { ok: true };
    } catch (err) {
      if (err instanceof LegacyStripeAccountError) {
        return { ok: false, reason: 'legacy_stripe_account' };
      }
      console.error('[sentinel/billing] cancel error:', err);
      return { ok: false, reason: 'stripe_error' };
    }
  },
};
