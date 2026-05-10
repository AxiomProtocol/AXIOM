/**
 * Tokenized Commodities Integration Layer — Unified Registry
 *
 * Single source of truth for all commodity assets recognized by Axiom Protocol.
 * Covers Axiom-issued reserve modules (AXAU), external supported assets (KAG),
 * and deferred / not-issued instruments (AXAG).
 *
 * Product status enum:
 *   LIVE               — issued, deployed, and fully operational
 *   EXTERNAL_SUPPORTED — not issued by Axiom; read-only portfolio support
 *   DEPLOYED_INACTIVE  — contracts exist; trading/issuance not yet active
 *   NOT_LIVE_NOT_ISSUED — no contract, no token; planning/deferred only
 *   DEFERRED           — candidate acknowledged; blocked on governance/custody
 *
 * Hard rules:
 *   - readOnly: true for any asset Axiom does not issue
 *   - No write paths, no custody changes, no new token issuance without
 *     explicit governance approval and launch-gate sign-off
 *   - AXAG MUST remain NOT_LIVE_NOT_ISSUED
 *
 * To add a new supported commodity asset:
 *   1. Add an entry to COMMODITY_REGISTRY below.
 *   2. Add per-asset service module under lib/commodities/ (if external).
 *   3. Add per-asset API endpoints under pages/api/commodities/<symbol>/.
 *   4. Update documents/commodities/TOKENIZED_COMMODITIES_INTEGRATION_LAYER.md.
 */

export type CommodityProductStatus =
  | 'LIVE'
  | 'EXTERNAL_SUPPORTED'
  | 'DEPLOYED_INACTIVE'
  | 'NOT_LIVE_NOT_ISSUED'
  | 'DEFERRED';

export type CommodityCategory = 'GOLD' | 'SILVER' | 'PLATINUM' | 'ENERGY' | 'AGRICULTURAL' | 'LAND' | 'OTHER';

export type CommodityMaturityLabel =
  | 'production'
  | 'external-live'
  | 'inactive'
  | 'deferred'
  | 'not-issued';

export interface CommodityAsset {
  /** Token ticker symbol */
  symbol: string;
  /** Full human-readable name */
  name: string;
  /** Unit description (e.g. "1 AXAU = 1 troy oz of LBMA Good Delivery gold") */
  unit: string;
  /** Issuing entity name */
  issuer: string;
  /** Blockchain / network */
  chain: string;
  /** On-chain contract address; empty string if not deployed */
  contractAddress: string;
  /** Commodity category */
  category: CommodityCategory;
  /** Normalized product status */
  productStatus: CommodityProductStatus;
  /** Whether Axiom Protocol is the issuer */
  axiomIssued: boolean;
  /** Whether Axiom Protocol directly custodies the underlying commodity */
  axiomCustodies: boolean;
  /**
   * Reserve / backing model description.
   * null if not Axiom-issued or no backing model applies.
   */
  reserveModel: string | null;
  /** Canonical price source label */
  pricingSource: string;
  /** If true, Axiom support is read-only (no writes, no swaps, no deposits) */
  readOnly: boolean;
  /** Front-end detail route; empty string if no page exists */
  detailRoute: string;
  /** API routes for this asset; empty object if none */
  apiRoutes: { status?: string; balance?: string };
  /** Human-readable maturity label */
  maturityLabel: CommodityMaturityLabel;
  /** Risk / launch-readiness label for UI display */
  riskLabel: 'LIVE' | 'EXTERNAL' | 'INACTIVE' | 'NOT_ISSUED' | 'DEFERRED';
  /** Short disclosure notes rendered on commodity surfaces */
  disclosureNotes: string[];
}

// ─── Registry entries ─────────────────────────────────────────────────────────

export const COMMODITY_REGISTRY: CommodityAsset[] = [
  // ── AXAU: Axiom-issued gold reserve module ──────────────────────────────────
  {
    symbol: 'AXAU',
    name: 'Axiom Gold Reserve',
    unit: '1 AXAU = 1 troy oz of LBMA Good Delivery 995 fine gold (target backing)',
    issuer: 'Axiom Protocol',
    chain: 'Arbitrum One',
    contractAddress: '0x6b22DE1AeFE6D52Ce64598E1Fb1a9cBa3D9eB5A4',
    category: 'GOLD',
    productStatus: 'LIVE',
    axiomIssued: true,
    axiomCustodies: false,
    reserveModel:
      'Gold reserves held via PAXG (PAX Gold ERC-20) and direct custodied gold.' +
      ' NAV published on-chain by NAVEngine. Coverage ratio enforced by MintRedeemController.' +
      ' Additional reserve sleeves may be added through governance and launch gates.',
    pricingSource: 'CoinGecko pax-gold / Chainlink XAU/USD (Arbitrum One)',
    readOnly: false,
    detailRoute: '/axau',
    apiRoutes: {
      status: '/api/axau/nav',
      balance: '/api/axau/holders',
    },
    maturityLabel: 'production',
    riskLabel: 'LIVE',
    disclosureNotes: [
      'AXAU is issued by Axiom Protocol and live on Arbitrum One.',
      'Gold reserves are held via PAXG and direct custodied gold.',
      'NAV is published on-chain by NAVEngine; the authoritative on-chain value governs.',
      'Redemption is subject to KYC/AML identity verification and platform terms.',
      'Additional reserve sleeves may be added through governance and launch gates.',
    ],
  },

  // ── KAG: external supported silver asset (Kinesis / KMS Labs) ───────────────
  {
    symbol: 'KAG',
    name: 'Kinesis Silver',
    unit: '1 KAG = 1 gram of LBMA Good Delivery 999 fine silver',
    issuer: 'KMS Labs / Kinesis ecosystem',
    chain: 'Ethereum mainnet',
    contractAddress: '0x56Ba8B58B7d1f6d384A1C4dD553F39ebc8741B8e',
    category: 'SILVER',
    productStatus: 'EXTERNAL_SUPPORTED',
    axiomIssued: false,
    axiomCustodies: false,
    reserveModel: null,
    pricingSource: 'CoinGecko (kinesis-silver, USD)',
    readOnly: true,
    detailRoute: '/commodities/kag',
    apiRoutes: {
      status: '/api/commodities/kag/status',
      balance: '/api/commodities/kag/balance',
    },
    maturityLabel: 'external-live',
    riskLabel: 'EXTERNAL',
    disclosureNotes: [
      'KAG is issued by KMS Labs within the Kinesis ecosystem.',
      'Axiom supports KAG as an external commodity asset for portfolio visibility.',
      'Axiom does not issue KAG.',
      'Axiom does not directly custody the underlying silver.',
      'Any redemption rights depend on KMS Labs / Kinesis terms.',
      'Support is read-only: no swaps, no deposits, no withdrawals, no banking rails.',
    ],
  },

  // ── AXAG: Axiom silver wrapper — NOT LIVE AND NOT ISSUED ────────────────────
  {
    symbol: 'AXAG',
    name: 'Axiom Silver Reserve (Not Issued)',
    unit: 'n/a — AXAG is not live and is not issued',
    issuer: 'n/a',
    chain: 'n/a',
    contractAddress: '',
    category: 'SILVER',
    productStatus: 'NOT_LIVE_NOT_ISSUED',
    axiomIssued: false,
    axiomCustodies: false,
    reserveModel: null,
    pricingSource: 'n/a (not issued)',
    readOnly: true,
    detailRoute: '',
    apiRoutes: {},
    maturityLabel: 'not-issued',
    riskLabel: 'NOT_ISSUED',
    disclosureNotes: [
      'AXAG is not live and is not issued.',
      'No AXAG token exists on any chain.',
      'The silver wrapper-token path is deferred.',
      'Axiom does not issue AXAG in this phase.',
      'Phase 1 direct silver support is KAG (external) only.',
    ],
  },
];

// ─── Public accessors ─────────────────────────────────────────────────────────

/** List all commodity assets in the registry. */
export function listCommodities(): CommodityAsset[] {
  return COMMODITY_REGISTRY;
}

/**
 * List only external supported commodity assets (read-only, not Axiom-issued).
 * @deprecated Use listCommodities() and filter by productStatus instead.
 */
export function listSupportedCommodities(): CommodityAsset[] {
  return COMMODITY_REGISTRY.filter((c) => c.productStatus === 'EXTERNAL_SUPPORTED');
}

/** Look up a single commodity asset by symbol. */
export function getCommodity(symbol: string): CommodityAsset | undefined {
  const target = symbol.toUpperCase();
  return COMMODITY_REGISTRY.find((c) => c.symbol === target);
}

/**
 * Look up a single external supported commodity asset by symbol.
 * @deprecated Use getCommodity() instead.
 */
export function getSupportedCommodity(symbol: string): CommodityAsset | undefined {
  return getCommodity(symbol);
}
