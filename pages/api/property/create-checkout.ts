import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { propertyReports } from '../../../shared/propertySchema';
import { eq } from 'drizzle-orm';
import { TIER_CONFIG } from '../../../server/services/property/pipeline';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(503).json({ error: 'Payment processing is not configured yet. Please try again later.' });
  }

  try {
    const { address, tier, sqft, bedrooms, bathrooms, yearBuilt, propertyType, email, wallet } = req.body;

    if (!address || typeof address !== 'string' || address.trim().length < 5) {
      return res.status(400).json({ error: 'A valid property address is required' });
    }

    const validTier = tier as 'base' | 'premium';
    if (validTier !== 'base' && validTier !== 'premium') {
      return res.status(400).json({ error: 'Invalid tier for checkout. Use base or premium.' });
    }

    const cfg = TIER_CONFIG[validTier];
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

    const [report] = await db.insert(propertyReports).values({
      addressRaw: address.trim(),
      tier: validTier,
      status: 'pending',
      sqft: sqft ? parseInt(sqft) : null,
      bedrooms: bedrooms ? parseInt(bedrooms) : null,
      bathrooms: bathrooms ? bathrooms.toString() : null,
      yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
      propertyType: propertyType || null,
      buyerEmail: email || null,
      buyerWallet: wallet || null,
      ipAddress: ip,
      amountPaidCents: cfg.priceCents,
    }).returning();

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);

    const host = req.headers.host || '';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${cfg.label} — Property Analysis`,
            description: `Detailed property analysis report for: ${address.trim().substring(0, 100)}`,
          },
          unit_amount: cfg.priceCents,
        },
        quantity: 1,
      }],
      metadata: {
        reportId: report.id,
        tier: validTier,
        address: address.trim().substring(0, 500),
      },
      customer_email: email || undefined,
      success_url: `${baseUrl}/property/reports/${report.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/property?cancelled=true`,
    });

    await db.update(propertyReports).set({
      stripeSessionId: session.id,
      updatedAt: new Date(),
    }).where(eq(propertyReports.id, report.id));

    return res.status(200).json({
      checkoutUrl: session.url,
      reportId: report.id,
      sessionId: session.id,
    });
  } catch (err: any) {
    console.error('Checkout creation error:', err.message);
    return res.status(500).json({ error: 'Could not create checkout session. Please try again.' });
  }
}
