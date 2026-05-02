/**
 * GET /api/assets/[symbol]/status
 *
 * Public, read-only metadata + disclosure + risk + spot price for an
 * external supported asset.
 *
 * Supported symbols: USDC, PAXG, XAUT, WBTC, cbETH (case-insensitive).
 *
 * Hard rules:
 *   - GET only. 405 on other methods.
 *   - 400 on unknown symbol.
 *   - No DB writes. No contract writes. No transactions.
 *   - Axiom does NOT issue or custody these assets.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getAssetMetadata,
  getAssetDisclosure,
  getAssetRiskSummary,
  getAssetUsdValue,
  isSupportedSymbol,
  SUPPORTED_SYMBOLS,
  CHAINS,
} from '../../../../lib/assets/externalAssetService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { symbol } = req.query;
  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: 'Missing required path parameter: symbol' });
  }

  if (!isSupportedSymbol(symbol)) {
    return res.status(400).json({
      error: `Unsupported asset symbol: ${symbol}`,
      supportedSymbols: SUPPORTED_SYMBOLS,
    });
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  try {
    const metadata = getAssetMetadata(symbol);
    const disclosure = getAssetDisclosure(symbol);
    const risk = getAssetRiskSummary(symbol);
    const spot = await getAssetUsdValue(symbol, 1);
    const chain = CHAINS[metadata.primaryChainKey];

    return res.status(200).json({
      schemaVersion: 'asset-status-v1',
      asOf: new Date().toISOString(),
      readOnly: true,

      asset: {
        symbol: metadata.symbol,
        name: metadata.name,
        category: metadata.category,
        productStatus: metadata.productStatus,
        axiomIssued: metadata.axiomIssued,
        axiomCustodies: metadata.axiomCustodies,
        unit: metadata.unit,
        unitNote: metadata.unitNote,
        effectiveDate: metadata.effectiveDate,
      },

      issuer: {
        name: metadata.issuer,
        jurisdiction: metadata.issuerJurisdiction,
        regulator: metadata.issuerRegulator,
      },

      reserveModel: {
        description: metadata.reserveModel,
        standard: metadata.reserveStandard,
        custodyHolder: 'Asset issuer (not Axiom Protocol)',
        axiomCustodyStatement: metadata.axiomCustodyStatement,
      },

      chain: {
        key: metadata.primaryChainKey,
        name: chain.name,
        chainId: chain.chainId,
        contractAddress: metadata.contractAddress,
        contractStandard: metadata.contractStandard,
        contractDecimals: metadata.contractDecimals,
        contractVerificationStatus: metadata.contractVerificationStatus,
        explorer: chain.explorer(metadata.contractAddress),
      },

      spotPrice: {
        unitPriceUsd: spot.unitPriceUsd,
        oracleSource: spot.oracleSource,
        priceSource: metadata.priceSource,
        coingeckoId: metadata.coingeckoId,
        fetchedAt: spot.fetchedAt,
        ...(spot.error ? { oracleError: spot.error } : {}),
      },

      integration: {
        axiomRole:
          'External supported asset, read-only. Metadata, balance reads, reference ' +
          'USD valuation, disclosure, portfolio inclusion, insights inclusion. No ' +
          'custody, no issuance, no swaps, no lending, no banking rails.',
        deferred: [
          'Axiom-issued wrappers of this asset (NOT IN SCOPE)',
          'Custody of the underlying reserve (NOT IN SCOPE)',
          'Lending, swaps, deposits, withdrawals, banking rails (NOT IN SCOPE)',
          'AXAG (NOT LIVE, NOT ISSUED)',
        ],
      },

      riskSummary: risk,
      riskNotes: metadata.riskNotes,
      disclosureLinks: metadata.disclosureLinks,

      disclosure: {
        issuer: disclosure.issuerStatement,
        axiomSupport: disclosure.axiomSupportStatement,
        axiomIssuance: disclosure.axiomIssuanceStatement,
        custody: disclosure.custodyStatement,
        redemption: disclosure.redemptionStatement,
        regulatory: disclosure.regulatoryStatement,
        scope: disclosure.scopeStatement,
        unit: disclosure.unitStatement,
      },

      noCustodyStatement:
        `Axiom Protocol does not issue ${metadata.symbol} and does not directly ` +
        'custody the underlying reserve. The asset is supported as an external ' +
        'asset for portfolio visibility and disclosure. AXAG is not live and is not issued.',

      axagStatement: metadata.axagStatement,
    });
  } catch (err: unknown) {
    console.error('[api/assets/[symbol]/status]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
}
