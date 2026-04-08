/**
 * GET /api/axiom-rail/sep38/prices
 *
 * SEP-38 indicative price list for USDC ↔ USD.
 * Returns exchange rates without committing to a firm quote.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { AXIOM_RAIL_FEE_PERCENT, AXIOM_RAIL_USDC_ISSUER } from '../../../../lib/multichain/stellar/axiom-rail/AxiomRailService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Cache-Control', 'public, max-age=30');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { sell_asset, sell_amount } = req.query as { sell_asset?: string; sell_amount?: string };

  if (!sell_asset) {
    return res.status(400).json({ error: 'sell_asset required' });
  }

  const sellAmount = sell_amount ? parseFloat(sell_amount) : 1000;
  const feeMultiplier = 1 + AXIOM_RAIL_FEE_PERCENT;

  const prices = [
    {
      buy_asset: sell_asset.includes('USDC') ? 'iso4217:USD' : `stellar:USDC:${AXIOM_RAIL_USDC_ISSUER}`,
      price: (1 / feeMultiplier).toFixed(7),
      decimals: 7,
      total_price: feeMultiplier.toFixed(7),
      buy_amount: (sellAmount / feeMultiplier).toFixed(2),
      fee: {
        total: (sellAmount * AXIOM_RAIL_FEE_PERCENT).toFixed(2),
        asset: 'iso4217:USD',
      },
    },
  ];

  return res.status(200).json({ prices });
}
