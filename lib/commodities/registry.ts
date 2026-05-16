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

// ─── Shared types (consumed by components, admissions, hub, and pages) ────────

export type CommodityProductStatus =
  | 'LIVE'
  | 'EXTERNAL_SUPPORTED'
  | 'DEPLOYED_INACTIVE'
  | 'NOT_LIVE_NOT_ISSUED'
  | 'DEFERRED';

export type CommodityCategory =
  | 'precious_metals'
  | 'energy'
  | 'agriculture'
  | 'base_metals'
  | 'GOLD'
  | 'SILVER'
  | 'other';

/** Full commodity registry entry — covers Axiom-issued, external-supported,
 *  and pipeline assets alike. */
export interface CommodityRegistryEntry {
  symbol: string;
  name: string;
  productStatus: CommodityProductStatus;
  category: CommodityCategory;
  unit: string;
  issuer: string;
  chain: string;
  contractAddress: string | null;
  axiomIssues: boolean;
  axiomCustodies: boolean;
  detailRoute: string;
  pricingSource: string;
  notes: string;
  /** Bullet-point disclosure sentences rendered in the commodity hub cards. */
  disclosureNotes: string[];
}

/** Canonical commodity registry — includes Axiom-issued, external-supported,
 *  and pipeline assets. Pages consume this for hub/disclosure rendering. */
export const COMMODITY_REGISTRY: CommodityRegistryEntry[] = [
  {
    symbol: 'AXAU',
    name: 'Axiom Gold Reserve',
    productStatus: 'LIVE',
    category: 'precious_metals',
    unit: '1 AXAU ≈ 1 troy oz of LBMA Good Delivery gold (XAU/USD oracle)',
    issuer: 'Axiom Protocol',
    chain: 'Arbitrum One',
    contractAddress: '0xbcCA4D937d427829914498423aE6E04C846dB0Bb',
    axiomIssues: true,
    axiomCustodies: false,
    detailRoute: '/commodities/axau',
    pricingSource: 'Chainlink XAU/USD (Arbitrum One)',
    notes:
      'Axiom-issued gold reserve token. Backed by PAXG held in BitGo CaaS institutional custody. ' +
      'Minted via MintRedeemController against PAXG collateral. Redemption returns PAXG, not USD.',
    disclosureNotes: [
      'Axiom-issued gold reserve token on Arbitrum One.',
      'Backed by PAXG held in BitGo CaaS institutional custody.',
      'Minted against PAXG collateral via MintRedeemController.',
      'Redemption returns PAXG — not USD or physical gold.',
      'Not a deposit. Not FDIC insured. Not a stablecoin.',
    ],
  },
  {
    symbol: 'KAG',
    name: 'Kinesis Silver',
    productStatus: 'EXTERNAL_SUPPORTED',
    category: 'SILVER',
    unit: '1 KAG = 1 gram of LBMA Good Delivery 999 fine silver',
    issuer: 'KMS Labs / Kinesis ecosystem',
    chain: 'Ethereum mainnet',
    contractAddress: '0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e',
    axiomIssues: false,
    axiomCustodies: false,
    detailRoute: '/commodities/kag',
    pricingSource: 'CoinGecko (kinesis-silver, USD)',
    notes:
      'External silver token supported for portfolio visibility only. ' +
      'Axiom does not issue KAG. Redemption depends on KMS Labs / Kinesis terms.',
    disclosureNotes: [
      'External silver token — Axiom does not issue KAG.',
      'Supported for portfolio visibility only. Read-only integration.',
      'Axiom does not custody the underlying silver.',
      'Redemption and custody terms are governed by KMS Labs / Kinesis.',
    ],
  },
  {
    symbol: 'AXAG',
    name: 'Axiom Silver (Not Issued)',
    productStatus: 'NOT_LIVE_NOT_ISSUED',
    category: 'SILVER',
    unit: 'Not defined — token not issued',
    issuer: 'Axiom Protocol (pipeline)',
    chain: 'Not deployed',
    contractAddress: null,
    axiomIssues: false,
    axiomCustodies: false,
    detailRoute: '/commodities/axag',
    pricingSource: 'N/A — not issued',
    notes:
      'AXAG is NOT live and NOT issued. ' +
      'No contract. No token. No reserve. Governance approval required before any deployment.',
    disclosureNotes: [
      'AXAG is NOT live and NOT issued.',
      'No contract has been deployed. No token exists.',
      'No reserve has been established.',
      'Governance approval is required before any deployment.',
    ],
  },
];

/** Look up a commodity by symbol from the full COMMODITY_REGISTRY. */
export function getCommodity(symbol: string): CommodityRegistryEntry | undefined {
  return COMMODITY_REGISTRY.find((c) => c.symbol === symbol.toUpperCase());
}

// ─── Legacy narrow registry (external-supported only) ────────────────────────

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
