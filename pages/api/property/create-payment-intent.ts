import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { propertyReports } from '../../../shared/propertySchema';
import { eq } from 'drizzle-orm';
import { TIER_CONFIG } from '../../../server/services/property/pipeline';
import { buildPaymentInstruction } from '../../../lib/property/onchainPayment';

/**
 * Task #230 — replaces the deprecated Stripe Checkout flow.
 *
 * Creates a pending property_reports row and returns the on-chain AXUSD
 * payment instruction (token, recipient, amount). The buyer then sends the
 * AXUSD transfer from their wallet and POSTs the tx hash to
 * /api/property/confirm-payment to unlock report generation.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { address, tier, sqft, bedrooms, bathrooms, yearBuilt, propertyType, email, wallet } = req.body;

    if (!address || typeof address !== 'string' || address.trim().length < 5) {
      return res.status(400).json({ error: 'A valid property address is required' });
    }

    const validTier = tier as 'base' | 'premium';
    if (validTier !== 'base' && validTier !== 'premium') {
      return res.status(400).json({ error: 'Invalid tier. Use base or premium.' });
    }

    if (!wallet || typeof wallet !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        error: 'A connected wallet address is required to pay in AXUSD on Arbitrum One.',
      });
    }

    const cfg = TIER_CONFIG[validTier];
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || 'unknown';

    const instruction = await buildPaymentInstruction(cfg.priceCents);

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
      buyerWallet: wallet.toLowerCase(),
      ipAddress: ip,
      amountPaidCents: cfg.priceCents,
      paymentChainId: instruction.chainId,
      paymentToken: instruction.token,
      paymentToAddress: instruction.recipient,
    }).returning();

    return res.status(200).json({
      reportId: report.id,
      payment: instruction,
    });
  } catch (err: any) {
    console.error('Property payment intent error:', err.message);
    return res.status(500).json({ error: 'Could not create payment intent. Please try again.' });
  }
}
