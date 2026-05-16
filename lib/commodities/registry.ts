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

export type CommodityProductStatus =
  | 'LIVE'
  | 'EXTERNAL_SUPPORTED'
  | 'DEPLOYED_INACTIVE'
  | 'NOT_LIVE_NOT_ISSUED'
  | 'DEFERRED';

export type CommodityCategory =
  | 'GOLD'
  | 'SILVER'
  | 'PRECIOUS_METAL'
  | 'BASE_METAL'
  | 'ENERGY'
  | 'AGRICULTURAL'
  | 'CRYPTOCURRENCY'
  | 'OTHER';

export interface SupportedCommodityAsset {
  symbol: string;
  name: string;
  unit: string;
  issuer: string;
  chain: string;
  contractAddress: string;
  status: CommodityProductStatus;
  productStatus: CommodityProductStatus;
  axagStatus?: 'NOT_LIVE_NOT_ISSUED' | 'LIVE' | 'PLANNED';
  pricingSource: string;
  axiomCustodies: boolean;
  axiomIssues: boolean;
  detailRoute: string;
  apiRoutes: { status: string; balance?: string };
  notes: string;
  disclosureNotes: string[];
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
    productStatus: 'EXTERNAL_SUPPORTED',
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
    disclosureNotes: [
      'KAG is a third-party token issued by KMS Labs within the Kinesis ecosystem.',
      'Axiom does not issue KAG and does not custody the underlying silver.',
      'Redemption terms are determined by KMS Labs / Kinesis, not Axiom Protocol.',
      'Pricing is reference-only via CoinGecko. This is not an offer to buy or sell.',
    ],
  },
];

export const COMMODITY_REGISTRY: SupportedCommodityAsset[] = [
  {
    symbol: 'AXAU',
    name: 'AXAU Gold Reserve',
    unit: '1 AXAU = 1 troy ounce of LBMA Good Delivery 999.9 fine gold',
    issuer: 'Axiom Protocol',
    chain: 'Arbitrum One',
    contractAddress: '',
    status: 'LIVE',
    productStatus: 'LIVE',
    pricingSource: 'ERC-7726 LandNAVOracle + PAXG peg',
    axiomCustodies: true,
    axiomIssues: true,
    detailRoute: '/axau',
    apiRoutes: { status: '/api/commodities/axau/status' },
    notes: 'Axiom-issued gold reserve module. Live on Arbitrum One. Backed by PAXG and LandNAVOracle.',
    disclosureNotes: [
      'AXAU is issued by Axiom Protocol on Arbitrum One.',
      'Redemption returns PAXG, not USD. No ACH or wire redemption is available at this time.',
      'All rates and yields are variable. This is not a guarantee of return.',
      'AXAU is not FDIC insured. Participants should consult independent advisors before committing capital.',
    ],
  },
  {
    symbol: 'KAG',
    name: 'Kinesis Silver',
    unit: '1 KAG = 1 gram of LBMA Good Delivery 999 fine silver',
    issuer: 'KMS Labs / Kinesis ecosystem',
    chain: 'Ethereum mainnet',
    contractAddress: '0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e',
    status: 'EXTERNAL_SUPPORTED',
    productStatus: 'EXTERNAL_SUPPORTED',
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
    disclosureNotes: [
      'KAG is a third-party token issued by KMS Labs within the Kinesis ecosystem.',
      'Axiom does not issue KAG and does not custody the underlying silver.',
      'Redemption terms are determined by KMS Labs / Kinesis, not Axiom Protocol.',
      'Pricing is reference-only via CoinGecko. This is not an offer to buy or sell.',
    ],
  },
  {
    symbol: 'AXAG',
    name: 'AXAG Silver Reserve',
    unit: 'Not issued — no token exists on any chain',
    issuer: 'Axiom Protocol (deferred)',
    chain: 'Arbitrum One (planned)',
    contractAddress: '',
    status: 'NOT_LIVE_NOT_ISSUED',
    productStatus: 'NOT_LIVE_NOT_ISSUED',
    axagStatus: 'NOT_LIVE_NOT_ISSUED',
    pricingSource: 'N/A — not issued',
    axiomCustodies: false,
    axiomIssues: false,
    detailRoute: '/assets/axag',
    apiRoutes: { status: '/api/commodities/axag/status' },
    notes:
      'AXAG is not live and is not issued. No AXAG token exists on any chain. ' +
      'Status will not change without governance approval and a launch gate sign-off.',
    disclosureNotes: [
      'AXAG is not live and is not issued. No AXAG token exists on any chain.',
      'This entry is for pipeline tracking purposes only.',
      'No investment in AXAG is possible at this time.',
      'Status will not change without governance approval and a launch gate sign-off.',
    ],
  },
];

/** List all supported commodity assets (legacy — use COMMODITY_REGISTRY for full registry). */
export function listSupportedCommodities(): SupportedCommodityAsset[] {
  return SUPPORTED_COMMODITIES;
}

/** Look up a single commodity asset by symbol. Searches COMMODITY_REGISTRY. */
export function getCommodity(symbol: string): SupportedCommodityAsset | undefined {
  const target = symbol.toUpperCase();
  return COMMODITY_REGISTRY.find((c) => c.symbol === target);
}

/** Look up a single supported commodity asset by symbol (legacy alias). */
export function getSupportedCommodity(symbol: string): SupportedCommodityAsset | undefined {
  return getCommodity(symbol);
}
