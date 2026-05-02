/**
 * GET /api/assets
 *
 * Public, read-only directory of external assets supported by Axiom.
 *
 * Hard rules:
 *   - GET only. 405 on other methods.
 *   - No DB writes. No contract writes. No transactions.
 *   - All assets returned are EXTERNAL_SUPPORTED — Axiom does not issue or
 *     custody any of them.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  listSupportedAssets,
  SUPPORTED_SYMBOLS,
} from '../../../lib/assets/externalAssetService';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const assets = listSupportedAssets().map((m) => ({
    symbol: m.symbol,
    name: m.name,
    category: m.category,
    productStatus: m.productStatus,
    axiomIssued: m.axiomIssued,
    axiomCustodies: m.axiomCustodies,
    issuer: m.issuer,
    primaryChain: m.primaryChain,
    primaryChainId: m.primaryChainId,
    contractAddress: m.contractAddress,
    contractStandard: m.contractStandard,
    contractDecimals: m.contractDecimals,
    contractVerificationStatus: m.contractVerificationStatus,
    priceSource: m.priceSource,
    detail: `/api/assets/${m.symbol.toLowerCase()}/status`,
    page: `/assets/${m.symbol.toLowerCase()}`,
  }));

  return res.status(200).json({
    schemaVersion: 'assets-list-v1',
    asOf: new Date().toISOString(),
    readOnly: true,
    count: assets.length,
    supportedSymbols: SUPPORTED_SYMBOLS,
    assets,
    noCustodyStatement:
      'Axiom Protocol does not issue any of the listed external assets and does ' +
      'not custody their underlying reserves. AXAG is not live and is not issued.',
  });
}
