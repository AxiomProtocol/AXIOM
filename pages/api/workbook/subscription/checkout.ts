import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_API_KEY || '', {
  apiVersion: '2023-10-16',
});

const WORKBOOK_PRICE_ID = process.env.WORKBOOK_STRIPE_PRICE_ID;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!WORKBOOK_PRICE_ID) {
      return res.status(200).json({
        error: 'Stripe product not configured yet. Please check back soon.',
        checkoutUrl: null,
      });
    }

    const successUrl = `${req.headers.origin}/workbook?subscription=success`;
    const cancelUrl = `${req.headers.origin}/workbook?subscription=cancelled`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: WORKBOOK_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    return res.status(200).json({
      checkoutUrl: session.url,
    });

  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({
      error: 'Failed to create checkout session. Please try again.',
    });
  }
}
