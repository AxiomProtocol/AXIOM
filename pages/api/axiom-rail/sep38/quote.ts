/**
 * POST /api/axiom-rail/sep38/quote
 *
 * SEP-38 firm quote for USDC ↔ USD exchange via Axiom Rail.
 * Quote is valid for 10 minutes.
 *
 * Requires SEP-10 JWT in Authorization header.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildAxiomRailQuote,
  verifyRailJwt,
} from '../../../../lib/multichain/stellar/axiom-rail/AxiomRailService';
import type { AxiomRailQuoteRequest } from '../../../../lib/multichain/stellar/axiom-rail/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { valid } = verifyRailJwt(token);
  if (!valid) return res.status(403).json({ error: 'Invalid or expired SEP-10 token' });

  const body = req.body as Partial<AxiomRailQuoteRequest>;

  if (!body.sell_asset || !body.sell_amount || !body.buy_asset) {
    return res.status(400).json({ error: 'sell_asset, sell_amount, and buy_asset are required' });
  }

  try {
    const quote = buildAxiomRailQuote(body as AxiomRailQuoteRequest);
    return res.status(200).json({ quote });
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
}
