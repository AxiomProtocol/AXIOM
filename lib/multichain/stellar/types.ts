/**
 * Axiom Protocol — Stellar Integration Types
 *
 * Typed models for all Stellar rail integration surfaces.
 * These types are designed for use by:
 *   - StellarPaymentAdapter (stub, then real implementation)
 *   - StellarReadinessService
 *   - /api/infrastructure/corridors and /api/infrastructure/chains
 *   - Founder Ops dashboard
 *
 * These types align with the StellarPaymentAdapterInterface contract
 * defined in lib/multichain/adapters/StellarPaymentAdapterInterface.ts.
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

/**
 * Known assets relevant to Axiom's Stellar payments integration.
 * USDC on Stellar (Circle-issued) is the primary corridor asset.
 */
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
    description: 'USD Coin on Stellar, issued by Circle. Primary corridor asset for AXUSD → Stellar payments.',
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
 * Candidate anchor partners for Axiom's Stellar payments corridor.
 * MoneyGram selected as primary anchor — validated SEP-24, USDC→USD, mainnet, 95ms latency.
 * Centre.io (Circle USDC issuer) does NOT offer SEP-24 interactive withdrawal.
 */
export const ANCHOR_CANDIDATES: AnchorCandidate[] = [
  {
    anchorId: 'moneygram-stellar',
    anchorName: 'MoneyGram (Stellar Access)',
    website: 'https://stellar.moneygram.com',
    corridors: ['USDC → USD payout (US)', 'USDC → Global fiat remittance'],
    primaryCurrencies: ['USD', 'USDC'],
    primaryRegions: ['US', 'Global'],
    sep24Support: true,
    sep31Support: false,
    sep38Support: true,
    partnershipRequired: true,
    evaluationStatus: 'integrated',
    notes: 'Active anchor. SEP-24 + SEP-10 validated live. Home domain: stellar.moneygram.com. TRANSFER_SERVER_SEP0024: https://stellar.moneygram.com/stellaradapterservice/sep24. USDC issuer GA5ZSEJ... matches Circle mainnet exactly. 95ms avg latency. Driven by STELLAR_ACTIVE_ANCHOR=moneygram.',
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
    notes: 'Official SDF test anchor. Testnet network only — not for production payments. Full SEP-24/31/38 support confirmed. ANCHOR_QUOTE_SERVER: https://testanchor.stellar.org/sep38. DIRECT_PAYMENT_SERVER: https://testanchor.stellar.org/sep31. Use STELLAR_ACTIVE_ANCHOR=testanchor with networkId=testnet for integration testing.',
  },
  {
    anchorId: 'anclap-stellar',
    anchorName: 'Anclap (LATAM)',
    website: 'https://anclap.com',
    corridors: ['USDC → ARS (Argentine Peso)', 'USDC → PEN (Peruvian Sol)'],
    primaryCurrencies: ['ARS', 'PEN'],
    primaryRegions: ['Argentina', 'Peru'],
    sep24Support: true,
    sep31Support: false,
    sep38Support: false,
    partnershipRequired: true,
    evaluationStatus: 'evaluating',
    notes: 'Validated SEP-24 anchor for LATAM corridor. 178ms latency. Reserve for future ARS/PEN expansion.',
  },
  {
    anchorId: 'mykobo-stellar',
    anchorName: 'MyKobo (Europe)',
    website: 'https://mykobo.co',
    corridors: ['EURC → EUR'],
    primaryCurrencies: ['EURC', 'EUR'],
    primaryRegions: ['Europe'],
    sep24Support: true,
    sep31Support: false,
    sep38Support: false,
    partnershipRequired: true,
    evaluationStatus: 'evaluating',
    notes: 'Validated SEP-24 anchor for European corridor. EURC only. Reserve for future EUR expansion.',
  },
  {
    anchorId: 'owlpay-harbor',
    anchorName: 'OwlPay Harbor (OwlTing)',
    website: 'https://owlpay.com/harbor',
    corridors: ['USDC → USD (US bank)', 'USDC → Fiat (40+ US states)', 'Stablecoin on/off ramp'],
    primaryCurrencies: ['USDC', 'USD'],
    primaryRegions: ['US', 'Japan', 'EU', 'Singapore', 'Hong Kong'],
    sep24Support: true,
    sep31Support: false,
    sep38Support: false,
    partnershipRequired: true,
    evaluationStatus: 'evaluating',
    notes: 'OwlTing is licensed as MSB in 40+ US states, FinCEN registered, VASP in Poland. OwlPay Harbor is their SEP-24 fiat-stablecoin ramp. Strong alternative to MoneyGram — infrastructure-grade B2B integration. Outreach initiated April 2026.',
  },
  {
    anchorId: 'latamex-stellar',
    anchorName: 'Latamex (LATAM — ARS/BRL)',
    website: 'https://latamex.com',
    corridors: ['USDC → ARS (Argentine Peso)', 'USDC → BRL (Brazilian Real)', 'ARS → USDC', 'BRL → USDC'],
    primaryCurrencies: ['USDC', 'ARS', 'BRL'],
    primaryRegions: ['Argentina', 'Brazil', 'Mexico'],
    sep24Support: true,
    sep31Support: false,
    sep38Support: false,
    partnershipRequired: true,
    evaluationStatus: 'evaluating',
    notes: 'Latamex is the actual SEP-24 ARS anchor behind the Vibrant consumer wallet app. Vibrant is a wallet — not an anchor. Latamex requires a partnership agreement. Contact: business@latamex.com. Covers ARS and BRL corridors.',
  },
  {
    anchorId: 'cowrie-stellar',
    anchorName: 'Cowrie (Africa — NGN)',
    website: 'https://cowrie.exchange',
    corridors: ['USDC → NGN (Nigerian Naira)', 'NGN → USDC', 'NGNT stablecoin issuance'],
    primaryCurrencies: ['USDC', 'NGN', 'NGNT'],
    primaryRegions: ['Nigeria', 'Africa'],
    sep24Support: true,
    sep31Support: false,
    sep38Support: false,
    partnershipRequired: true,
    evaluationStatus: 'evaluating',
    notes: 'Cowrie integrates with NIBSS (Nigerian interbank network) to settle NGN payments. Tokenizes Naira (NGNT) on Stellar. Opens Africa corridor for Axiom — significant diaspora remittance market. Partnership required for production access.',
  },
  {
    anchorId: 'circle-stellar',
    anchorName: 'Circle (USDC on Stellar)',
    website: 'https://www.circle.com/en/usdc-multichain/stellar',
    corridors: ['USDC direct transfer on Stellar (Circle-issued)', 'AXUSD → USDC (Circle, Stellar mainnet)'],
    primaryCurrencies: ['USDC'],
    primaryRegions: ['Global'],
    sep24Support: false,
    sep31Support: false,
    sep38Support: false,
    partnershipRequired: false,
    evaluationStatus: 'integrated',
    notes: 'Circle is the canonical USDC issuer on Stellar (GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN). Integrated as the underlying settlement asset for all USDC-denominated corridors. All active SEP-24 anchors (MoneyGram, Anclap, MyKobo) settle against Circle-issued USDC. Direct USDC transfer corridor does not require a SEP-24 anchor.',
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
    usedFor: 'Authenticating users with the active anchor. Required by SEP-0024. Ephemeral keypair challenge/sign/verify flow implemented server-side.',
  },
  {
    protocol: 'SEP-0024',
    description: 'Interactive Anchor Specification',
    status: 'implemented',
    specUrl: 'https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md',
    usedFor: 'Primary anchor protocol for interactive fiat deposit and withdrawal flows. Active anchor driven by STELLAR_ACTIVE_ANCHOR env var (default: MoneyGram).',
  },
  {
    protocol: 'SEP-0031',
    description: 'Cross-Border Payments Specification',
    status: 'implemented',
    specUrl: 'https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0031.md',
    usedFor: 'Direct (non-interactive) cross-border payment API. Anchor resolved from DIRECT_PAYMENT_SERVER in stellar.toml or registry. Supports initiate, poll, and status endpoints.',
  },
  {
    protocol: 'SEP-0038',
    description: 'Anchor RFQ (Request for Quote)',
    status: 'implemented',
    specUrl: 'https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0038.md',
    usedFor: 'Indicative prices (public) and firm quotes (SEP-10 authenticated) from anchor. Anchor resolved from ANCHOR_QUOTE_SERVER in stellar.toml or registry.',
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
 * Registry of validated SEP-24 anchors for env-driven selection.
 * Set STELLAR_ACTIVE_ANCHOR=<key> to select an anchor at runtime.
 * Default: 'moneygram' (production-ready, USDC→USD, mainnet, 95ms).
 *
 * sep38BaseUrl / sep31BaseUrl: Populated only when an anchor explicitly
 * declares ANCHOR_QUOTE_SERVER / DIRECT_PAYMENT_SERVER in their stellar.toml.
 * These are also parsed live from the toml at runtime. Do NOT derive these
 * from the SEP-24 URL pattern — anchors like MoneyGram serve HTML at those paths.
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
  moneygram: {
    homeDomain: 'stellar.moneygram.com',
    anchorId: 'moneygram-stellar',
    anchorName: 'MoneyGram (Stellar Access)',
    usdcIssuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    network: 'mainnet',
    transferServerSep24: 'https://stellar.moneygram.com/stellaradapterservice/sep24',
    webAuthEndpoint: 'https://stellar.moneygram.com/stellaradapterservice/auth',
    // MoneyGram requires a formal partnership for SEP-31/38 — not publicly available
    sep38BaseUrl: undefined,
    sep31BaseUrl: undefined,
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
  anclap: {
    homeDomain: 'anclap.com',
    anchorId: 'anclap-stellar',
    anchorName: 'Anclap (LATAM)',
    usdcIssuer: null,
    network: 'mainnet',
    transferServerSep24: 'https://api.anclap.com/transfer24',
    webAuthEndpoint: 'https://api.anclap.com/auth',
  },
  mykobo: {
    homeDomain: 'mykobo.co',
    anchorId: 'mykobo-stellar',
    anchorName: 'MyKobo (Europe)',
    usdcIssuer: null,
    network: 'mainnet',
    transferServerSep24: 'https://stellar.mykobo.co/sep24',
    webAuthEndpoint: 'https://stellar.mykobo.co/auth',
  },
  ultrastellar: {
    homeDomain: 'ultrastellar.com',
    anchorId: 'ultrastellar',
    anchorName: 'Ultra Stellar',
    usdcIssuer: null,
    network: 'mainnet',
    transferServerSep24: 'https://ultracapital.xyz/sep24',
    webAuthEndpoint: 'https://ultracapital.xyz/auth',
  },
  owlpay: {
    homeDomain: 'owlpay.com',
    anchorId: 'owlpay-harbor',
    anchorName: 'OwlPay Harbor (OwlTing)',
    usdcIssuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    network: 'mainnet',
    // Endpoints to be confirmed from owlpay.com/.well-known/stellar.toml after partnership
    transferServerSep24: 'https://anchor.owlpay.com/sep24',
    webAuthEndpoint: 'https://anchor.owlpay.com/auth',
  },
  latamex: {
    homeDomain: 'latamex.com',
    anchorId: 'latamex-stellar',
    anchorName: 'Latamex (LATAM — ARS/BRL)',
    usdcIssuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    network: 'mainnet',
    // Endpoints to be confirmed after partnership — Latamex is the anchor behind Vibrant wallet
    transferServerSep24: 'https://api.latamex.com/sep24',
    webAuthEndpoint: 'https://api.latamex.com/auth',
  },
  cowrie: {
    homeDomain: 'cowrie.exchange',
    anchorId: 'cowrie-stellar',
    anchorName: 'Cowrie (Africa — NGN)',
    usdcIssuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    network: 'mainnet',
    // Endpoints to be confirmed from cowrie.exchange/.well-known/stellar.toml after partnership
    transferServerSep24: 'https://api.cowrie.exchange/sep24',
    webAuthEndpoint: 'https://api.cowrie.exchange/auth',
  },
  circle: {
    homeDomain: 'www.circle.com',
    anchorId: 'circle-stellar',
    anchorName: 'Circle (USDC on Stellar)',
    usdcIssuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    network: 'mainnet',
    // Circle is the USDC issuer — not a SEP-24/31 interactive anchor.
    // Direct USDC transfers use native Stellar payment operations, not SEP-24.
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
    corridorId: 'axusd-to-usdc-stellar-usd',
    label: 'AXUSD (Arbitrum) → USDC (Stellar) → USD Payout',
    sourceAsset: 'AXUSD',
    sourceNetwork: 'arbitrum',
    destinationCurrency: 'USD',
    destinationCountry: 'US',
    anchorId: 'moneygram-stellar',
    status: 'configured',
    estimatedSettlementMinutes: 5,
    minAmountUsd: 10,
    maxAmountUsd: 25000,
    complianceRequired: true,
    blockers: [],
  },
  {
    corridorId: 'axusd-to-usdc-stellar-global',
    label: 'AXUSD (Arbitrum) → USDC (Stellar) → Global USDC',
    sourceAsset: 'AXUSD',
    sourceNetwork: 'arbitrum',
    destinationCurrency: 'USDC',
    destinationCountry: 'Global',
    anchorId: 'moneygram-stellar',
    status: 'configured',
    estimatedSettlementMinutes: 3,
    minAmountUsd: 1,
    maxAmountUsd: 100000,
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
  {
    corridorId: 'axusd-to-usdc-stellar-ars',
    label: 'AXUSD (Arbitrum) → USDC (Stellar) → ARS Remittance',
    sourceAsset: 'AXUSD',
    sourceNetwork: 'arbitrum',
    destinationCurrency: 'ARS',
    destinationCountry: 'AR',
    anchorId: 'anclap-stellar',
    status: 'anchor_pending',
    estimatedSettlementMinutes: 15,
    minAmountUsd: 10,
    maxAmountUsd: 10000,
    complianceRequired: true,
    blockers: ['Requires Anclap partnership activation for ARS corridor'],
  },
  {
    corridorId: 'axusd-to-usdc-stellar-usd-owlpay',
    label: 'AXUSD (Arbitrum) → USDC (Stellar) → USD Payout via OwlPay Harbor',
    sourceAsset: 'AXUSD',
    sourceNetwork: 'arbitrum',
    destinationCurrency: 'USD',
    destinationCountry: 'US',
    anchorId: 'owlpay-harbor',
    status: 'anchor_pending',
    estimatedSettlementMinutes: 5,
    minAmountUsd: 10,
    maxAmountUsd: 50000,
    complianceRequired: true,
    blockers: ['Requires OwlTing partnership agreement and API credentials'],
  },
  {
    corridorId: 'axusd-to-usdc-stellar-ars-latamex',
    label: 'AXUSD (Arbitrum) → USDC (Stellar) → ARS via Latamex',
    sourceAsset: 'AXUSD',
    sourceNetwork: 'arbitrum',
    destinationCurrency: 'ARS',
    destinationCountry: 'AR',
    anchorId: 'latamex-stellar',
    status: 'anchor_pending',
    estimatedSettlementMinutes: 10,
    minAmountUsd: 5,
    maxAmountUsd: 5000,
    complianceRequired: true,
    blockers: ['Requires Latamex partnership agreement — contact business@latamex.com'],
  },
  {
    corridorId: 'axusd-to-usdc-stellar-ngn',
    label: 'AXUSD (Arbitrum) → USDC (Stellar) → NGN via Cowrie',
    sourceAsset: 'AXUSD',
    sourceNetwork: 'arbitrum',
    destinationCurrency: 'NGN',
    destinationCountry: 'NG',
    anchorId: 'cowrie-stellar',
    status: 'anchor_pending',
    estimatedSettlementMinutes: 20,
    minAmountUsd: 10,
    maxAmountUsd: 10000,
    complianceRequired: true,
    blockers: ['Requires Cowrie partnership and NIBSS integration activation'],
  },
];

// ─── Transfer state ───────────────────────────────────────────────────────────

export type StellarTransferStatus =
  | 'pending_user_transfer_start'
  | 'pending_external'
  | 'pending_anchor'
  | 'pending_stellar'
  | 'pending_trust'
  | 'completed'
  | 'error'
  | 'refunded';

export interface StellarTransferRecord {
  transferId: string;
  axiomRequestId: string;
  walletAddress: string;
  anchorId: string;
  corridorId: string;
  status: StellarTransferStatus;
  sourceAmountAxusd: string;
  destinationCurrency: string;
  destinationAmount: string | null;
  fee: string | null;
  stellarTransactionHash: string | null;
  anchorTransferId: string | null;
  errorMessage: string | null;
  initiatedAt: string;
  completedAt: string | null;
  updatedAt: string;
}
