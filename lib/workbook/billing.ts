import Stripe from 'stripe';
import { db } from '../../server/db';
import { subscriptionEntitlements } from '../../shared/schema';
import { eq } from 'drizzle-orm';

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

    const [existingEntitlement] = await db
      .select()
      .from(subscriptionEntitlements)
      .where(eq(subscriptionEntitlements.userId, userId))
      .limit(1);

    let customerId = existingEntitlement?.providerCustomerId;

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
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const periodStart = typeof subscription.current_period_start === 'number' 
            ? new Date(subscription.current_period_start * 1000) 
            : new Date();
          const periodEnd = typeof subscription.current_period_end === 'number'
            ? new Date(subscription.current_period_end * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            
          await db
            .insert(subscriptionEntitlements)
            .values({
              userId,
              planKey: 'workbook_monthly_20',
              status: 'active',
              providerCustomerId: customerId,
              providerSubscriptionId: subscriptionId,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
            })
            .onConflictDoUpdate({
              target: subscriptionEntitlements.userId,
              set: {
                status: 'active',
                providerCustomerId: customerId,
                providerSubscriptionId: subscriptionId,
                currentPeriodStart: periodStart,
                currentPeriodEnd: periodEnd,
                updatedAt: new Date(),
              },
            });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId = (invoice as any).subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
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

            await db
              .update(subscriptionEntitlements)
              .set({
                status: 'active',
                currentPeriodStart: periodStart,
                currentPeriodEnd: periodEnd,
                updatedAt: new Date(),
              })
              .where(eq(subscriptionEntitlements.userId, userId));
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = (invoice as any).subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const customerId = subscription.customer as string;
          const customer = await stripe.customers.retrieve(customerId);
          const userId = parseInt((customer as any).metadata?.userId || '0');

          if (userId) {
            await db
              .update(subscriptionEntitlements)
              .set({
                status: 'past_due',
                updatedAt: new Date(),
              })
              .where(eq(subscriptionEntitlements.userId, userId));
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
          await db
            .update(subscriptionEntitlements)
            .set({
              status: 'canceled',
              updatedAt: new Date(),
            })
            .where(eq(subscriptionEntitlements.userId, userId));
        }
        break;
      }
    }
  },

  async getSubscriptionStatus(userId: number): Promise<'active' | 'past_due' | 'canceled' | 'none'> {
    const [entitlement] = await db
      .select()
      .from(subscriptionEntitlements)
      .where(eq(subscriptionEntitlements.userId, userId))
      .limit(1);

    return entitlement?.status || 'none';
  },

  async cancelSubscription(userId: number): Promise<boolean> {
    if (!stripe) {
      return false;
    }

    const [entitlement] = await db
      .select()
      .from(subscriptionEntitlements)
      .where(eq(subscriptionEntitlements.userId, userId))
      .limit(1);

    if (!entitlement?.providerSubscriptionId) {
      return false;
    }

    await stripe.subscriptions.cancel(entitlement.providerSubscriptionId);
    return true;
  },
};
