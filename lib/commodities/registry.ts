/**
 * Supported External Commodity Asset Registry — Phase 1
 *
 * Lists external commodity assets that Axiom supports for portfolio
 * visibility and disclosure. Read-only; no Axiom custody, no Axiom issuance.
 *
 * To add a new supported commodity asset:
 *   1. Add an entry below.
 *   2. Add per-asset service module under lib/commodities/.
 *   3. Add per-asset API endpoints under pages/api/commodities/<symbol>/.
 *   4. Update tracker / disclosure docs.
 */

export interface SupportedCommodityAsset {
  symbol: string;
  name: string;
  unit: string;
  issuer: string;
  chain: string;
  contractAddress: string;
  status: 'EXTERNAL_SUPPORTED' | 'INTERNAL_ISSUED' | 'PLANNED' | 'DEFERRED';
  axagStatus?: 'NOT_LIVE_NOT_ISSUED' | 'LIVE' | 'PLANNED';
  pricingSource: string;
  axiomCustodies: boolean;
  axiomIssues: boolean;
  detailRoute: string;
  apiRoutes: { status: string; balance?: string };
  notes: string;
}

export const SUPPORTED_COMMODITIES: SupportedCommodityAsset[] = [
  {
    symbol: 'KAG',
    name: 'Kinesis Silver',
    unit: '1 KAG = 1 gram of LBMA Good Delivery 999 fine silver',
    issuer: 'KMS Labs / Kinesis ecosystem',
    chain: 'Ethereum mainnet',
    contractAddress: '0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e',
    status: 'EXTERNAL_SUPPORTED',
    axagStatus: 'NOT_LIVE_NOT_ISSUED',
    pricingSource: 'CoinGecko (kinesis-silver, USD)',
    axiomCustodies: false,
    axiomIssues: false,
    detailRoute: '/commodities/kag',
    apiRoutes: {
      status: '/api/commodities/kag/status',
      balance: '/api/commodities/kag/balance',
    },
    notes:
      'Direct KAG support on Ethereum mainnet. Read-only. ' +
      'Axiom does not issue KAG. Axiom does not custody the underlying silver. ' +
      'Redemption depends on KMS Labs / Kinesis terms. ' +
      'AXAG is not live and is not issued.',
  },
];

/** List all supported commodity assets. */
export function listSupportedCommodities(): SupportedCommodityAsset[] {
  return SUPPORTED_COMMODITIES;
}

/** Look up a single supported commodity asset by symbol. */
export function getSupportedCommodity(symbol: string): SupportedCommodityAsset | undefined {
  const target = symbol.toUpperCase();
  return SUPPORTED_COMMODITIES.find((c) => c.symbol === target);
}
