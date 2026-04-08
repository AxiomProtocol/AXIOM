/**
 * Axiom Protocol — Stellar Integration Types
 *
 * Typed models for all Stellar rail integration surfaces.
 * These types are designed for use by:
 *   - StellarPaymentAdapter
 *   - StellarReadinessService
 *   - /api/infrastructure/corridors and /api/infrastructure/chains
 *   - Founder Ops dashboard
 *
 * Active anchor: Axiom Rail (axiomprotocol.app) — Axiom Protocol's own
 * Stellar SEP-10/24/31/38 anchor, settled via Increase ACH/Wire rails.
 */

// ─── Network ──────────────────────────────────────────────────────────────────

export type StellarNetworkId = 'mainnet' | 'testnet';

export interface StellarNetworkConfig {
  networkId: StellarNetworkId;
  horizonUrl: string;
  sorobanRpcUrl: string | null;
  networkPassphrase: string;
  nativeAssetCode: 'XLM';
}

export const STELLAR_NETWORK_CONFIGS: Record<StellarNetworkId, StellarNetworkConfig> = {
  mainnet: {
    networkId: 'mainnet',
    horizonUrl: 'https://horizon.stellar.org',
    sorobanRpcUrl: 'https://soroban-mainnet.stellar.org',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    nativeAssetCode: 'XLM',
  },
  testnet: {
    networkId: 'testnet',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
    nativeAssetCode: 'XLM',
  },
};

// ─── Assets ───────────────────────────────────────────────────────────────────

export interface StellarAssetConfig {
  code: string;
  issuer: string | null;
  isNative: boolean;
  description: string;
  decimals: number;
}

export const STELLAR_KNOWN_ASSETS: StellarAssetConfig[] = [
  {
    code: 'XLM',
    issuer: null,
    isNative: true,
    description: 'Stellar native asset (XLM). Used for transaction fees.',
    decimals: 7,
  },
  {
    code: 'USDC',
    issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    isNative: false,
    description: 'USD Coin on Stellar, issued by Circle. Primary settlement asset for Axiom Rail.',
    decimals: 7,
  },
];

// ─── Anchor ───────────────────────────────────────────────────────────────────

export type AnchorStatus = 'not_selected' | 'evaluating' | 'agreement_pending' | 'integrated' | 'live';

export interface AnchorCandidate {
  anchorId: string;
  anchorName: string;
  website: string;
  corridors: string[];
  primaryCurrencies: string[];
  primaryRegions: string[];
  sep24Support: boolean;
  sep31Support: boolean;
  sep38Support: boolean;
  partnershipRequired: boolean;
  evaluationStatus: AnchorStatus;
  notes: string;
}

/**
 * Axiom Rail is Axiom Protocol's own anchor — no third-party partnership required.
 * The SDF Test Anchor is retained for testnet integration testing.
 * Circle is retained as the USDC settlement layer (not a SEP-24 anchor).
 */
export const ANCHOR_CANDIDATES: AnchorCandidate[] = [
  {
    anchorId: 'axiom-rail',
    anchorName: 'Axiom Rail',
    website: 'https://axiomprotocol.app',
    corridors: [
      'USDC → USD (ACH, 1-3 business days)',
      'USDC → USD (Domestic Wire, same day)',
      'USD → USDC (ACH deposit)',
    ],
    primaryCurrencies: ['USDC', 'USD'],
    primaryRegions: ['US'],
    sep24Support: true,
    sep31Support: true,
    sep38Support: true,
    partnershipRequired: false,
    evaluationStatus: 'live',
    notes: 'Axiom Protocol\'s own Stellar anchor. Settled via Increase (FDIC-insured ACH/wire). No third-party partnership required. Full SEP-10/24/31/38 support. Home domain: axiomprotocol.app.',
  },
  {
    anchorId: 'testanchor-sdf',
    anchorName: 'SDF Test Anchor',
    website: 'https://testanchor.stellar.org',
    corridors: ['USDC (testnet) → Test USD', 'USDC (testnet) → CAD (testnet)'],
    primaryCurrencies: ['USDC', 'SRT', 'USD', 'CAD'],
    primaryRegions: ['Global (testnet only)'],
    sep24Support: true,
    sep31Support: true,
    sep38Support: true,
    partnershipRequired: false,
    evaluationStatus: 'evaluating',
    notes: 'Official SDF test anchor for testnet integration testing only. Use STELLAR_ACTIVE_ANCHOR=testanchor with networkId=testnet.',
  },
  {
    anchorId: 'circle-stellar',
    anchorName: 'Circle (USDC on Stellar)',
    website: 'https://www.circle.com/en/usdc-multichain/stellar',
    corridors: ['USDC direct transfer on Stellar (Circle-issued)'],
    primaryCurrencies: ['USDC'],
    primaryRegions: ['Global'],
    sep24Support: false,
    sep31Support: false,
    sep38Support: false,
    partnershipRequired: false,
    evaluationStatus: 'integrated',
    notes: 'Circle is the canonical USDC issuer on Stellar (GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN). All Axiom Rail USDC settlements use Circle-issued USDC. Not a SEP-24 interactive anchor — direct transfers only.',
  },
];

// ─── SEP protocol models ──────────────────────────────────────────────────────

export type SEPProtocol = 'SEP-0024' | 'SEP-0031' | 'SEP-0038' | 'SEP-0010';

export interface SEPCapability {
  protocol: SEPProtocol;
  description: string;
  status: 'not_reviewed' | 'reviewed' | 'implemented';
  specUrl: string;
  usedFor: string;
}

export const STELLAR_SEP_CAPABILITIES: SEPCapability[] = [
  {
    protocol: 'SEP-0010',
    description: 'Stellar Web Authentication',
    status: 'implemented',
    specUrl: 'https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md',
    usedFor: 'Axiom Rail issues SEP-10 challenge/response JWTs. Required for SEP-24, SEP-31, and SEP-38 authenticated endpoints.',
  },
  {
    protocol: 'SEP-0024',
    description: 'Interactive Anchor Specification',
    status: 'implemented',
    specUrl: 'https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md',
    usedFor: 'Axiom Rail primary ramp protocol. USDC ↔ USD interactive deposit and withdrawal settled via Increase ACH/Wire.',
  },
  {
    protocol: 'SEP-0031',
    description: 'Cross-Border Payments Specification',
    status: 'implemented',
    specUrl: 'https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0031.md',
    usedFor: 'Axiom Rail direct (non-interactive) USDC→USD payment endpoint for B2B use.',
  },
  {
    protocol: 'SEP-0038',
    description: 'Anchor RFQ (Request for Quote)',
    status: 'implemented',
    specUrl: 'https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0038.md',
    usedFor: 'Axiom Rail quote server for USDC↔USD exchange rates and firm quotes.',
  },
];

// ─── SEP-38 types (Anchor RFQ) ────────────────────────────────────────────────

export interface Sep38Asset {
  asset: string;
  countryCodes?: string[];
  sellDeliveryMethods?: { name: string; description: string }[];
  buyDeliveryMethods?: { name: string; description: string }[];
}

export interface Sep38InfoResult {
  assets: Sep38Asset[];
  anchorQuoteServer: string;
  anchorId: string;
}

export interface Sep38BuyAssetQuote {
  asset: string;
  price: string;
  decimals: number;
}

export interface Sep38PricesResult {
  buyAssets: Sep38BuyAssetQuote[];
  sellAsset: string;
  sellAmount: string;
  anchorId: string;
}

export interface Sep38FeeDetail {
  name: string;
  description?: string;
  amount: string;
}

export interface Sep38Fee {
  total: string;
  asset: string;
  details?: Sep38FeeDetail[];
}

export interface Sep38FirmQuote {
  id: string;
  expiresAt: string;
  totalPrice: string;
  price: string;
  sellAsset: string;
  sellAmount: string;
  buyAsset: string;
  buyAmount: string;
  fee: Sep38Fee;
  anchorId: string;
}

// ─── SEP-31 types (Cross-Border Payments) ────────────────────────────────────

export interface Sep31FieldInfo {
  description: string;
  optional?: boolean;
  choices?: string[];
}

export interface Sep31AssetInfo {
  enabled: boolean;
  feeFixed?: number;
  feePercent?: number;
  minAmount?: number;
  maxAmount?: number;
  senderSep12Fields?: { types?: Record<string, { description: string; fields?: Record<string, Sep31FieldInfo> }> };
  receiverSep12Fields?: { types?: Record<string, { description: string; fields?: Record<string, Sep31FieldInfo> }> };
  fields?: { transaction?: Record<string, Sep31FieldInfo> };
}

export interface Sep31Info {
  receive: Record<string, Sep31AssetInfo>;
  directPaymentServer: string;
  anchorId: string;
}

export interface Sep31InitiateResult {
  sep31TransactionId: string;
  stellarAccountId: string;
  stellarMemoType: string;
  stellarMemo: string;
  requiresManualStellarPayment: boolean;
  dbTransferId: string;
}

export interface Sep31TransactionStatus {
  id: string;
  status: string;
  statusEta?: number | null;
  amountIn?: string;
  amountInAsset?: string;
  amountOut?: string;
  amountOutAsset?: string;
  amountFee?: string;
  amountFeeAsset?: string;
  stellarAccountId?: string;
  stellarMemo?: string;
  stellarMemoType?: string;
  startedAt: string;
  completedAt?: string | null;
  stellarTransactionId?: string | null;
  message?: string | null;
  requiredInfoMessage?: string | null;
  requiredInfoUpdates?: Record<string, Sep31FieldInfo> | null;
  dbTransferId: string | null;
}

// ─── Anchor Registry ──────────────────────────────────────────────────────────

/**
 * Registry of active SEP anchors for env-driven selection.
 * Set STELLAR_ACTIVE_ANCHOR=<key> to select an anchor at runtime.
 * Default: 'axiom-rail' — Axiom Protocol's own anchor, no third-party required.
 */
export interface StellarAnchorRegistryEntry {
  homeDomain: string;
  anchorId: string;
  anchorName: string;
  usdcIssuer: string | null;
  network: StellarNetworkId;
  transferServerSep24: string;
  webAuthEndpoint: string;
  sep38BaseUrl?: string;
  sep31BaseUrl?: string;
}

export const STELLAR_ANCHOR_REGISTRY: Record<string, StellarAnchorRegistryEntry> = {
  'axiom-rail': {
    homeDomain: 'axiomprotocol.app',
    anchorId: 'axiom-rail',
    anchorName: 'Axiom Rail',
    usdcIssuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    network: 'mainnet',
    transferServerSep24: 'https://axiomprotocol.app/api/axiom-rail/sep24',
    webAuthEndpoint: 'https://axiomprotocol.app/api/axiom-rail/auth',
    sep38BaseUrl: 'https://axiomprotocol.app/api/axiom-rail/sep38',
    sep31BaseUrl: 'https://axiomprotocol.app/api/axiom-rail/sep31',
  },
  testanchor: {
    homeDomain: 'testanchor.stellar.org',
    anchorId: 'testanchor-sdf',
    anchorName: 'SDF Test Anchor',
    usdcIssuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    network: 'testnet',
    transferServerSep24: 'https://testanchor.stellar.org/sep24',
    webAuthEndpoint: 'https://testanchor.stellar.org/auth',
    sep38BaseUrl: 'https://testanchor.stellar.org/sep38',
    sep31BaseUrl: 'https://testanchor.stellar.org/sep31',
  },
  circle: {
    homeDomain: 'www.circle.com',
    anchorId: 'circle-stellar',
    anchorName: 'Circle (USDC on Stellar)',
    usdcIssuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    network: 'mainnet',
    transferServerSep24: '',
    webAuthEndpoint: '',
  },
};

// ─── Corridor models ──────────────────────────────────────────────────────────

export interface StellarPaymentCorridor {
  corridorId: string;
  label: string;
  sourceAsset: string;
  sourceNetwork: string;
  destinationCurrency: string;
  destinationCountry: string;
  anchorId: string | null;
  status: 'planned' | 'anchor_pending' | 'configured' | 'live';
  estimatedSettlementMinutes: number | null;
  minAmountUsd: number | null;
  maxAmountUsd: number | null;
  complianceRequired: boolean;
  blockers: string[];
}

export const STELLAR_PLANNED_CORRIDORS: StellarPaymentCorridor[] = [
  {
    corridorId: 'axusd-to-usdc-axiom-rail-usd-ach',
    label: 'USDC (Stellar) → USD via Axiom Rail ACH',
    sourceAsset: 'USDC',
    sourceNetwork: 'stellar',
    destinationCurrency: 'USD',
    destinationCountry: 'US',
    anchorId: 'axiom-rail',
    status: 'live',
    estimatedSettlementMinutes: 1440,
    minAmountUsd: 10,
    maxAmountUsd: 25000,
    complianceRequired: true,
    blockers: [],
  },
  {
    corridorId: 'axusd-to-usdc-axiom-rail-usd-wire',
    label: 'USDC (Stellar) → USD via Axiom Rail Wire',
    sourceAsset: 'USDC',
    sourceNetwork: 'stellar',
    destinationCurrency: 'USD',
    destinationCountry: 'US',
    anchorId: 'axiom-rail',
    status: 'live',
    estimatedSettlementMinutes: 240,
    minAmountUsd: 100,
    maxAmountUsd: 25000,
    complianceRequired: true,
    blockers: [],
  },
  {
    corridorId: 'usd-to-usdc-axiom-rail-deposit',
    label: 'USD (ACH) → USDC via Axiom Rail Deposit',
    sourceAsset: 'USD',
    sourceNetwork: 'us-banking',
    destinationCurrency: 'USDC',
    destinationCountry: 'Global',
    anchorId: 'axiom-rail',
    status: 'live',
    estimatedSettlementMinutes: 1440,
    minAmountUsd: 10,
    maxAmountUsd: 25000,
    complianceRequired: true,
    blockers: [],
  },
  {
    corridorId: 'axusd-to-usdc-stellar-circle',
    label: 'AXUSD (Arbitrum) → USDC (Stellar, Circle-issued)',
    sourceAsset: 'AXUSD',
    sourceNetwork: 'arbitrum',
    destinationCurrency: 'USDC',
    destinationCountry: 'Global',
    anchorId: 'circle-stellar',
    status: 'configured',
    estimatedSettlementMinutes: 1,
    minAmountUsd: 1,
    maxAmountUsd: 1000000,
    complianceRequired: false,
    blockers: [],
  },
];
