/**
 * GET /api/assets/[symbol]/balance?address=0x...
 *
 * Read-only ERC-20 balance lookup for an external supported asset.
 *
 * Supported symbols: USDC, PAXG, XAUT, WBTC, cbETH (case-insensitive).
 *
 * Hard rules:
 *   - GET only. 405 on other methods.
 *   - 400 on unknown symbol or invalid address.
 *   - Read-only ERC-20 balanceOf only — no writes, no transactions.
 *   - Axiom does NOT custody, manage, or control the returned balance.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getAssetBalance,
  isSupportedSymbol,
  isValidEvmAddress,
  SUPPORTED_SYMBOLS,
} from '../../../../lib/assets/externalAssetService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { symbol, address } = req.query;

  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: 'Missing required path parameter: symbol' });
  }
  if (!isSupportedSymbol(symbol)) {
    return res.status(400).json({
      error: `Unsupported asset symbol: ${symbol}`,
      supportedSymbols: SUPPORTED_SYMBOLS,
    });
  }

  if (!address || typeof address !== 'string') {
    return res.status(400).json({
      error: 'Missing required query parameter: address',
      example: `/api/assets/${symbol.toLowerCase()}/balance?address=0x...`,
    });
  }
  if (!isValidEvmAddress(address)) {
    return res.status(400).json({
      error: 'Invalid wallet address. Must be a 42-character hex string starting with 0x.',
      received: address,
    });
  }

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  try {
    const result = await getAssetBalance(symbol, address);
    return res.status(200).json({
      schemaVersion: 'asset-balance-v1',
      readOnly: true,
      noCustodyStatement:
        'This endpoint performs a read-only ERC-20 balanceOf call. Axiom Protocol ' +
        'does not custody, manage, or control any returned balance. No transaction, ' +
        'swap, or custody action is performed.',
      data: result,
    });
  } catch (err: unknown) {
    console.error('[api/assets/[symbol]/balance]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
}
