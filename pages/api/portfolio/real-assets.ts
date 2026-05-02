/**
 * GET /api/portfolio/real-assets?address=0x...
 *
 * Wallet-aware real-assets portfolio composer (AXUSD + AXAU + KAG).
 *
 * Hard rules:
 *   - GET only. No DB writes. No contract writes. No transactions.
 *   - Read-only: ERC-20 balanceOf reads + reference USD prices only.
 *   - No AXAG issuance. No KAG custody. No swaps. No banking rails.
 *   - No synthetic balances. Structured warnings on any unavailable price.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getRealAssetsPortfolio,
  isValidEvmAddress,
} from '../../../lib/portfolio/realAssetsPortfolio';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;
  if (typeof address !== 'string' || !isValidEvmAddress(address)) {
    return res.status(400).json({
      error: 'Valid Ethereum address required (0x followed by 40 hex characters).',
    });
  }

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  try {
    const portfolio = await getRealAssetsPortfolio(address);
    return res.status(200).json({
      schemaVersion: 'real-assets-portfolio-v1',
      readOnly: true,
      data: portfolio,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.startsWith('Invalid Ethereum address')) {
      return res.status(400).json({ error: message });
    }
    if (message.startsWith('Alchemy API key not configured')) {
      return res.status(503).json({ error: message });
    }
    console.error('[api/portfolio/real-assets]', message);
    return res.status(500).json({ error: 'Failed to compose real-assets portfolio.' });
  }
}
