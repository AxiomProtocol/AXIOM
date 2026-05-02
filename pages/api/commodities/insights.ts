/**
 * GET /api/commodities/insights[?address=0x...]
 *
 * Reference-only commodity intelligence: gold spot, silver spot, gold/silver
 * ratio, AXAU implied USD, KAG implied USD, AXAG status, and optional
 * wallet-context concentration analysis when an address is provided.
 *
 * Hard rules:
 *   - GET only. No DB writes. No contract writes. No transactions.
 *   - Reference-only. No buy/sell recommendations. No financial advice.
 *   - AXAG is NOT LIVE and NOT ISSUED.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getCommodityInsights } from '../../../lib/commodities/insightsService';
import { isValidEvmAddress } from '../../../lib/portfolio/realAssetsPortfolio';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;
  let walletAddress: string | undefined;
  if (typeof address === 'string' && address.length > 0) {
    if (!isValidEvmAddress(address)) {
      return res.status(400).json({
        error: 'If `address` is provided, it must be 0x followed by 40 hex characters.',
      });
    }
    walletAddress = address;
  }

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  try {
    const insights = await getCommodityInsights({ walletAddress });
    return res.status(200).json({
      schemaVersion: 'commodity-insights-v1',
      readOnly: true,
      referenceOnly: true,
      noCustodyStatement:
        'Axiom Protocol does not issue or custody any of the external assets ' +
        'referenced in this response (KAG and external supported assets such as ' +
        'USDC, PAXG, XAUT, WBTC, cbETH). All values are reference-only. ' +
        'AXAG is not live and is not issued.',
      data: insights,
    });
  } catch (err) {
    console.error('[api/commodities/insights]', err);
    return res.status(500).json({
      error: 'Failed to compose commodity insights.',
    });
  }
}
