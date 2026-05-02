/**
 * GET /api/portfolio/external?address=0x...
 *
 * Read-only unified external supported assets portfolio for a wallet.
 * Includes USDC, PAXG, XAUT, WBTC, cbETH balances, USD valuations, and
 * allocation percentages.
 *
 * Hard rules:
 *   - GET only. 405 on other methods.
 *   - 400 on invalid wallet address.
 *   - Read-only. No DB writes. No contract writes. No transactions.
 *   - Axiom does NOT custody, manage, or control any returned balance.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getExternalAssetsPortfolio,
  isValidEvmAddress,
} from '../../../lib/portfolio/externalAssetsPortfolio';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;
  if (!address || typeof address !== 'string') {
    return res.status(400).json({
      error: 'Missing required query parameter: address',
      example: '/api/portfolio/external?address=0x...',
    });
  }
  if (!isValidEvmAddress(address)) {
    return res.status(400).json({
      error: 'Invalid wallet address. Must be 42-character hex starting with 0x.',
      received: address,
    });
  }

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  try {
    const portfolio = await getExternalAssetsPortfolio(address);
    return res.status(200).json({
      schemaVersion: 'external-assets-portfolio-v1',
      readOnly: true,
      noCustodyStatement:
        'This endpoint composes read-only ERC-20 balanceOf calls across external ' +
        'supported assets. Axiom Protocol does not custody, manage, or control any ' +
        'returned balance. AXAG is not live and is not issued.',
      data: portfolio,
    });
  } catch (err: unknown) {
    console.error('[api/portfolio/external]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
}
