import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const MEMBERSHIP_PRICES = {
  pro: {
    name: 'Axiom Academy Pro',
    amount: 2500,
    interval: 'month' as const,
  },
  enterprise: {
    name: 'Axiom Academy Enterprise', 
    amount: 9900,
    interval: 'month' as const,
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!process.env.STRIPE_API_KEY) {
    return res.status(503).json({ 
      message: 'Payment service not configured',
      error: 'Stripe API key is not set'
    });
  }

  const stripe = new Stripe(process.env.STRIPE_API_KEY);

  try {
    const { tier, email } = req.body;

    if (!tier || !MEMBERSHIP_PRICES[tier as keyof typeof MEMBERSHIP_PRICES]) {
      return res.status(400).json({ message: 'Invalid membership tier' });
    }

    const membership = MEMBERSHIP_PRICES[tier as keyof typeof MEMBERSHIP_PRICES];
    
    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: membership.name,
              description: tier === 'pro' 
                ? 'Full access to all courses, certificates, and monthly live sessions'
                : 'Everything in Pro plus 1-on-1 mentorship and priority support',
            },
            unit_amount: membership.amount,
            recurring: {
              interval: membership.interval,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/academy/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/academy`,
      customer_email: email || undefined,
      metadata: {
        tier,
        source: 'axiom_academy',
      },
    });

    return res.status(200).json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({ 
      message: 'Failed to create checkout session',
      error: error.message 
    });
  }
}
