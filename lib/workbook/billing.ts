import Stripe from 'stripe';
import { pool } from '../../server/db';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const WORKBOOK_PRICE_ID = process.env.BILLING_PRICE_ID_WORKBOOK_MONTHLY || '';

export interface BillingProvider {
  createCheckoutSession(userId: number, email: string, successUrl: string, cancelUrl: string): Promise<string>;
  handleWebhook(payload: string, signature: string): Promise<void>;
  getSubscriptionStatus(userId: number): Promise<'active' | 'past_due' | 'canceled' | 'none'>;
  cancelSubscription(userId: number): Promise<boolean>;
}

export const billingProvider: BillingProvider = {
  async createCheckoutSession(userId: number, email: string, successUrl: string, cancelUrl: string): Promise<string> {
    if (!stripe) {
      throw new Error('Payment provider not configured');
    }

    const result = await pool.query(
      `SELECT provider_customer_id FROM subscription_entitlements WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    let customerId = result.rows[0]?.provider_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { userId: userId.toString() },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: WORKBOOK_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId: userId.toString() },
    });

    return session.url || '';
  },

  async handleWebhook(payload: string, signature: string): Promise<void> {
    if (!stripe) {
      throw new Error('Payment provider not configured');
    }

    const webhookSecret = process.env.BILLING_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = parseInt(session.metadata?.userId || '0');
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (userId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
          const periodStart = typeof subscription.current_period_start === 'number' 
            ? new Date(subscription.current_period_start * 1000) 
            : new Date();
          const periodEnd = typeof subscription.current_period_end === 'number'
            ? new Date(subscription.current_period_end * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            
          await pool.query(`
            INSERT INTO subscription_entitlements (user_id, plan_key, status, provider_customer_id, provider_subscription_id, current_period_start, current_period_end)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (user_id) 
            DO UPDATE SET status = $3, provider_customer_id = $4, provider_subscription_id = $5, current_period_start = $6, current_period_end = $7, updated_at = NOW()
          `, [userId, 'workbook_monthly_20', 'active', customerId, subscriptionId, periodStart, periodEnd]);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId = (invoice as any).subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
          const customerId = subscription.customer as string;
          const customer = await stripe.customers.retrieve(customerId);
          const userId = parseInt((customer as any).metadata?.userId || '0');

          if (userId) {
            const periodStart = typeof subscription.current_period_start === 'number'
              ? new Date(subscription.current_period_start * 1000)
              : new Date();
            const periodEnd = typeof subscription.current_period_end === 'number'
              ? new Date(subscription.current_period_end * 1000)
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            await pool.query(`
              UPDATE subscription_entitlements 
              SET status = 'active', current_period_start = $2, current_period_end = $3, updated_at = NOW()
              WHERE user_id = $1
            `, [userId, periodStart, periodEnd]);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = (invoice as any).subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
          const customerId = subscription.customer as string;
          const customer = await stripe.customers.retrieve(customerId);
          const userId = parseInt((customer as any).metadata?.userId || '0');

          if (userId) {
            await pool.query(`
              UPDATE subscription_entitlements SET status = 'past_due', updated_at = NOW() WHERE user_id = $1
            `, [userId]);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        const userId = parseInt((customer as any).metadata?.userId || '0');

        if (userId) {
          await pool.query(`
            UPDATE subscription_entitlements SET status = 'canceled', updated_at = NOW() WHERE user_id = $1
          `, [userId]);
        }
        break;
      }
    }
  },

  async getSubscriptionStatus(userId: number): Promise<'active' | 'past_due' | 'canceled' | 'none'> {
    const result = await pool.query(
      `SELECT status FROM subscription_entitlements WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    return result.rows[0]?.status || 'none';
  },

  async cancelSubscription(userId: number): Promise<boolean> {
    if (!stripe) {
      return false;
    }

    const result = await pool.query(
      `SELECT provider_subscription_id FROM subscription_entitlements WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    const subscriptionId = result.rows[0]?.provider_subscription_id;

    if (!subscriptionId) {
      return false;
    }

    try {
      await stripe.subscriptions.cancel(subscriptionId);
      
      await pool.query(`
        UPDATE subscription_entitlements SET status = 'canceled', updated_at = NOW() WHERE user_id = $1
      `, [userId]);
      
      return true;
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      return false;
    }
  },
};
