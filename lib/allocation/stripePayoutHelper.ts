/**
 * stripePayoutHelper — Stripe payout rail for the allocation executor.
 *
 * Creates a Stripe payout from the platform balance to the default bank
 * account for the `operating_spend` allocation row.
 *
 * Pre-conditions:
 *   - STRIPE_SECRET_KEY must be set.
 *   - The Stripe account must have a verified bank account attached
 *     and a sufficient Stripe balance (otherwise Stripe returns an
 *     error which is captured as status='failed').
 *
 * Returns a RailResult; never throws.
 */

import { getStripe } from '../stripe/client';
import type { RailResult } from './executionRails';

export async function stripeOperatingSpendPayout(usdAmount: number): Promise<RailResult> {
  const rail = 'stripe_payout' as const;

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      rail, status: 'failed',
      txHash: null, externalRef: null, externalUrl: null,
      note: 'STRIPE_SECRET_KEY not configured — cannot create payout',
    };
  }

  const amountCents = Math.round(usdAmount * 100);
  if (amountCents <= 0) {
    return {
      rail, status: 'skipped',
      txHash: null, externalRef: null, externalUrl: null,
      note: `USD allocation $${usdAmount.toFixed(2)} rounds to 0 cents`,
    };
  }

  try {
    const stripe  = await getStripe();
    const payout  = await stripe.payouts.create({
      amount:      amountCents,
      currency:    'usd',
      description: `Axiom Protocol operating spend allocation — $${usdAmount.toFixed(2)}`,
      metadata:    { source: 'allocation_executor', rail: 'operating_spend' },
    });

    return {
      rail, status: 'executed',
      txHash: null,
      externalRef: payout.id,
      externalUrl: `https://dashboard.stripe.com/payouts/${payout.id}`,
      note: `Stripe payout ${payout.id} created for $${usdAmount.toFixed(2)} — status: ${payout.status}`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stripe payout failed';
    return {
      rail, status: 'failed',
      txHash: null, externalRef: null, externalUrl: null,
      note: `Stripe payout error: ${msg.slice(0, 300)}`,
    };
  }
}
