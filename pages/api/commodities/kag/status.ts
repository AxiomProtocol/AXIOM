/**
 * GET /api/commodities/kag/status
 *
 * Read-only status endpoint for Kinesis Silver (KAG) external asset.
 *
 * Returns:
 *   - asset metadata
 *   - supported chain
 *   - contract address (with verification status)
 *   - issuer
 *   - reserve model
 *   - risk notes
 *   - disclosure links
 *   - no-custody statement
 *   - current XAG/USD spot price (Chainlink, Arbitrum One)
 *
 * Hard rules:
 *   - GET only. No DB writes. No contract writes. No custody.
 *   - No AXAG issuance. No swaps. No banking rails.
 *   - Axiom does not own, issue, or custody KAG or the underlying silver.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getKagAssetMetadata,
  getKagDisclosure,
  getKagUsdValue,
  KAG_ETH_CONTRACT,
  KAG_ARBITRUM_STATUS,
  CHAINLINK_XAG_USD_STATUS,
  GRAMS_PER_TROY_OZ,
} from '../../../../lib/commodities/kagService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  try {
    const [metadata, disclosure, spotPrice] = await Promise.all([
      Promise.resolve(getKagAssetMetadata()),
      Promise.resolve(getKagDisclosure()),
      getKagUsdValue(1),
    ]);

    return res.status(200).json({
      schemaVersion: 'kag-status-v1',
      asOf: new Date().toISOString(),

      asset: {
        name: metadata.name,
        symbol: metadata.symbol,
        unit: metadata.unit,
        unitNote: metadata.unitNote,
        gramsPerTroyOz: GRAMS_PER_TROY_OZ,
      },

      issuer: {
        name: metadata.issuer,
        regulator: metadata.issuerRegulator,
        platform: 'https://kinesis.money',
        note:
          'KMS Labs AG is authorized under Liechtenstein TVTG. ' +
          'Axiom Protocol is not the issuer of KAG.',
      },

      reserveModel: {
        description: metadata.reserveModel,
        standard: metadata.reserveStandard,
        custodyHolder: 'KMS Labs AG (not Axiom Protocol)',
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
        },
        arbitrumOne: {
          available: KAG_ARBITRUM_STATUS.available,
          status: KAG_ARBITRUM_STATUS.verificationStatus,
          blocker: KAG_ARBITRUM_STATUS.verificationBlocker,
          note: KAG_ARBITRUM_STATUS.note,
        },
      },

      spotPrice: {
        xagUsdPerTroyOz: spotPrice.xagUsdPerTroyOz,
        kagUsdPerGram: spotPrice.kagUsdPerGram,
        oracleSource: spotPrice.oracleSource,
        fetchedAt: spotPrice.fetchedAt,
        ...(spotPrice.error ? { oracleError: spotPrice.error } : {}),
      },

      oracle: {
        planned: 'Chainlink XAG/USD',
        plannedAddress: CHAINLINK_XAG_USD_STATUS.plannedAddress,
        chain: CHAINLINK_XAG_USD_STATUS.chain,
        status: CHAINLINK_XAG_USD_STATUS.status,
        blocker: CHAINLINK_XAG_USD_STATUS.blocker,
        note: CHAINLINK_XAG_USD_STATUS.note,
      },

      integration: {
        phase: metadata.integrationPhase,
        scope: metadata.integrationScope,
        axiomRole:
          'External asset recognition and integration planning only. ' +
          'No custody, no issuance, no vault.',
        openBlockers: [
          'KIN-01: Official KAG contract address not yet confirmed from KMS Labs',
          'KIN-02: KAG on Arbitrum One availability not yet confirmed',
          'KIN-03: KMS Labs Terms review for wrapper permission — not yet completed',
          'KIN-04: Redemption terms — minimum grams, KYC, timeline not yet documented',
          'KIN-05: Proof-of-reserves cadence and auditor not yet confirmed',
          'KIN-06: Legal opinion on KMS Labs TVTG custody scoring — not yet received',
        ],
      },

      riskNotes: metadata.riskNotes,

      disclosureLinks: metadata.disclosureLinks,

      disclosure: {
        issuer: disclosure.issuerStatement,
        custody: disclosure.custodyStatement,
        redemption: disclosure.redemptionStatement,
        regulatory: disclosure.regulatoryStatement,
        axag: disclosure.axagStatement,
        phase1Scope: disclosure.phase1ScopeStatement,
        unit: disclosure.unitStatement,
      },

      noCustodyStatement:
        'Axiom Protocol does not hold, issue, or custody KAG or the physical silver ' +
        'underlying KAG. Axiom Protocol has not entered into any vault agreement, ' +
        'custodial agreement, or custody arrangement with KMS Labs or any vault operator ' +
        'with respect to KAG. This endpoint is read-only research and planning infrastructure.',

      axagStatement: metadata.axagStatement,
    });
  } catch (err: unknown) {
    console.error('[api/commodities/kag/status]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
}
