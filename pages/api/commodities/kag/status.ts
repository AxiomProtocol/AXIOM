/**
 * GET /api/commodities/kag/status
 *
 * Public, read-only Kinesis Silver (KAG) status endpoint.
 *
 * Phase 1: Direct KAG support inside Axiom.
 *   - No AXAG token. No KAG vault. No wrapper token.
 *   - No custody. No lending. No swaps. No banking rails.
 *   - No DB writes. No contract writes.
 *
 * Returns:
 *   - asset metadata (symbol, unit, issuer, regulator)
 *   - reserve model and standard
 *   - chain registration (Ethereum mainnet primary; Arbitrum deferred)
 *   - spot price (CoinGecko KAG/USD direct; null with warnings on outage)
 *   - integration phase, scope, and disclosures
 *   - structured risk summary
 *
 * Method: GET only. No body. No auth required (public disclosure surface).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getKagAssetMetadata,
  getKagDisclosure,
  getKagRiskSummary,
  getKagUsdValue,
  KAG_ETH_CONTRACT,
  KAG_ARBITRUM_STATUS,
  GRAMS_PER_TROY_OZ,
} from '../../../../lib/commodities/kagService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  try {
    const [metadata, disclosure, risk, spotPrice] = await Promise.all([
      Promise.resolve(getKagAssetMetadata()),
      Promise.resolve(getKagDisclosure()),
      Promise.resolve(getKagRiskSummary()),
      getKagUsdValue(1),
    ]);

    return res.status(200).json({
      schemaVersion: 'kag-status-v2',
      asOf: new Date().toISOString(),

      asset: {
        name: metadata.name,
        symbol: metadata.symbol,
        unit: metadata.unit,
        unitNote: metadata.unitNote,
        gramsPerTroyOz: GRAMS_PER_TROY_OZ,
        status: 'EXTERNAL_SUPPORTED',
        axagStatus: 'NOT_LIVE_NOT_ISSUED',
      },

      issuer: {
        name: metadata.issuer,
        regulator: metadata.issuerRegulator,
        platform: 'https://kinesis.money',
        note: 'KAG is issued by KMS Labs within the Kinesis ecosystem. Axiom does not issue KAG.',
      },

      reserveModel: {
        description: metadata.reserveModel,
        standard: metadata.reserveStandard,
        custodyHolder: 'KMS Labs (vault partners) — not Axiom Protocol',
        axiomCustodyStatement: metadata.axiomCustodyStatement,
      },

      chains: {
        primary: {
          name: metadata.primaryChain,
          chainId: metadata.primaryChainId,
          contractAddress: KAG_ETH_CONTRACT.address,
          contractStandard: KAG_ETH_CONTRACT.standard,
          contractDecimals: KAG_ETH_CONTRACT.decimals,
          verificationStatus: KAG_ETH_CONTRACT.verificationStatus,
          verificationBlocker: KAG_ETH_CONTRACT.verificationBlocker,
          verificationNote: KAG_ETH_CONTRACT.verificationNote,
          etherscan: `https://etherscan.io/token/${KAG_ETH_CONTRACT.address}`,
        },
        arbitrumOne: {
          available: KAG_ARBITRUM_STATUS.available,
          status: KAG_ARBITRUM_STATUS.verificationStatus,
          blocker: KAG_ARBITRUM_STATUS.verificationBlocker,
          note: KAG_ARBITRUM_STATUS.note,
        },
      },

      spotPrice: {
        kagUsdPerGram: spotPrice.kagUsdPerGram,
        xagUsdPerTroyOz: spotPrice.xagUsdPerTroyOz,
        oracleSource: spotPrice.oracleSource,
        fetchedAt: spotPrice.fetchedAt,
        ...(spotPrice.error ? { oracleError: spotPrice.error } : {}),
      },

      integration: {
        phase: metadata.integrationPhase,
        scope: metadata.integrationScope,
        axiomRole:
          'External commodity asset support, read-only. Direct KAG on Ethereum mainnet. ' +
          'No wrapper token. No vault. No custody. No issuance.',
        deferred: [
          'AXAG wrapper-token issuance (NOT LIVE, NOT ISSUED)',
          'Arbitrum-native KAG support (DEFERRED for Phase 1)',
          'KAG vault, lending, swaps, banking rails (out of scope)',
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
        axag: disclosure.axagStatement,
        phase1Scope: disclosure.phase1ScopeStatement,
        unit: disclosure.unitStatement,
      },

      noCustodyStatement:
        'Axiom Protocol does not issue KAG and does not directly custody the underlying ' +
        'silver. KAG is supported as an external commodity asset. ' +
        'AXAG is not live and is not issued.',

      axagStatement: metadata.axagStatement,
    });
  } catch (err: unknown) {
    console.error('[api/commodities/kag/status]', err);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
}
