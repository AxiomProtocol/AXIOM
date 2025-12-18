import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { academyMemberships } from '../../../shared/schema';
import { eq, and, gte } from 'drizzle-orm';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_API_KEY || '');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, sessionId } = req.body;

    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status === 'paid' && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        
        return res.status(200).json({
          hasMembership: true,
          tier: session.metadata?.tier || 'pro',
          expiresAt: new Date((subscription as any).current_period_end * 1000).toISOString(),
          status: (subscription as any).status
        });
      }
    }

    if (email) {
      const customers = await stripe.customers.list({
        email: email,
        limit: 1
      });

      if (customers.data.length > 0) {
        const customer = customers.data[0];
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'active',
          limit: 1
        });

        if (subscriptions.data.length > 0) {
          const subscription = subscriptions.data[0] as any;
          const tier = subscription.metadata?.tier || 'pro';
          
          return res.status(200).json({
            hasMembership: true,
            tier: tier,
            expiresAt: new Date(subscription.current_period_end * 1000).toISOString(),
            status: subscription.status
          });
        }
      }
    }

    return res.status(200).json({
      hasMembership: false,
      tier: 'free',
      expiresAt: null,
      status: null
    });

  } catch (error: any) {
    console.error('Membership check error:', error);
    return res.status(500).json({ 
      message: 'Failed to check membership',
      error: error.message 
    });
  }
}
