/**
 * GET /api/axiom-rail/health
 *
 * Axiom Rail anchor health check.
 * Returns status of the anchor and its Increase settlement rail.
 * Public endpoint — no auth required.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getRailAccountStatus } from '../../../lib/multichain/stellar/axiom-rail/IncreaseSettlement';
import {
  AXIOM_RAIL_HOME_DOMAIN,
  AXIOM_RAIL_SIGNING_KEY,
  AXIOM_RAIL_SEP24_URL,
  AXIOM_RAIL_SEP31_URL,
  AXIOM_RAIL_SEP38_URL,
  AXIOM_RAIL_AUTH_URL,
} from '../../../lib/multichain/stellar/axiom-rail/AxiomRailService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Cache-Control', 'no-store');

  const [increaseStatus] = await Promise.allSettled([getRailAccountStatus()]);

  const increase =
    increaseStatus.status === 'fulfilled'
      ? increaseStatus.value
      : { status: 'error', account_id: '', balance_cents: 0, environment: 'unknown' };

  const railOnline =
    increaseStatus.status === 'fulfilled' && increase.status !== 'unconfigured';

  res.status(200).json({
    anchor: {
      id: 'axiom-rail',
      name: 'Axiom Rail',
      home_domain: AXIOM_RAIL_HOME_DOMAIN,
      signing_key: AXIOM_RAIL_SIGNING_KEY,
      status: railOnline ? 'online' : 'degraded',
    },
    endpoints: {
      sep10_auth: AXIOM_RAIL_AUTH_URL,
      sep24_transfer: AXIOM_RAIL_SEP24_URL,
      sep31_direct: AXIOM_RAIL_SEP31_URL,
      sep38_quotes: AXIOM_RAIL_SEP38_URL,
    },
    settlement: {
      provider: 'Increase',
      rail: 'ACH / Domestic Wire',
      currency: 'USD',
      environment: increase.environment,
      status: increase.status,
    },
    stellar: {
      network: 'mainnet',
      network_passphrase: 'Public Global Stellar Network ; September 2015',
    },
    checked_at: new Date().toISOString(),
  });
}
