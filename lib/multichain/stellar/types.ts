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
 * Circle selected as primary anchor — USDC on Stellar.
 */
export const ANCHOR_CANDIDATES: AnchorCandidate[] = [
  {
    anchorId: 'circle-stellar',
    anchorName: 'Circle (USDC on Stellar)',
    website: 'https://www.circle.com/en/usdc-multichain/stellar',
    corridors: ['USD on/off ramp', 'USDC issuance/redemption'],
    primaryCurrencies: ['USD', 'USDC'],
    primaryRegions: ['Global'],
    sep24Support: true,
    sep31Support: false,
    sep38Support: true,
    partnershipRequired: true,
    evaluationStatus: 'integrated',
    notes: 'Selected anchor. Issues USDC on Stellar. SEP-24 interactive flow active. Home domain: centre.io. USDC issuer: GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN.',
  },
  {
    anchorId: 'moneygram-stellar',
    anchorName: 'MoneyGram (Stellar Anchor)',
    website: 'https://www.moneygram.com',
    corridors: ['Cash-out via MoneyGram agent network', 'Remittance LATAM/Africa'],
    primaryCurrencies: ['USD', 'Local fiat'],
    primaryRegions: ['LATAM', 'Africa', 'Southeast Asia'],
    sep24Support: true,
    sep31Support: false,
    sep38Support: true,
    partnershipRequired: true,
    evaluationStatus: 'not_selected',
    notes: 'Largest remittance network on Stellar. Best for cash-out in emerging markets. High partnership requirements.',
  },
  {
    anchorId: 'bitso-stellar',
    anchorName: 'Bitso',
    website: 'https://bitso.com',
    corridors: ['USD → MXN', 'USD → BRL', 'LATAM remittance'],
    primaryCurrencies: ['USD', 'MXN', 'BRL'],
    primaryRegions: ['Mexico', 'Brazil', 'Argentina'],
    sep24Support: true,
    sep31Support: true,
    sep38Support: false,
    partnershipRequired: true,
    evaluationStatus: 'not_selected',
    notes: 'Strong LATAM corridor specialist. Best for Mexico/Brazil remittance use cases.',
  },
  {
    anchorId: 'tempo-stellar',
    anchorName: 'Tempo',
    website: 'https://www.tempo.eu.com',
    corridors: ['EUR ↔ XLM/USDC', 'European remittance'],
    primaryCurrencies: ['EUR', 'USD'],
    primaryRegions: ['Europe', 'West Africa'],
    sep24Support: true,
    sep31Support: true,
    sep38Support: false,
    partnershipRequired: true,
    evaluationStatus: 'not_selected',
    notes: 'European Stellar anchor with regulated status in EU. Strong for EUR corridors.',
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
    usedFor: 'Authenticating users with Circle anchor. Required by SEP-0024. Challenge/verify flow implemented.',
  },
  {
    protocol: 'SEP-0024',
    description: 'Interactive Anchor Specification',
    status: 'implemented',
    specUrl: 'https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md',
    usedFor: 'Primary anchor protocol for interactive fiat deposit and withdrawal flows via Circle.',
  },
  {
    protocol: 'SEP-0031',
    description: 'Cross-Border Payments Specification',
    status: 'reviewed',
    specUrl: 'https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0031.md',
    usedFor: 'Direct cross-border payment flows (sending-side). Circle does not support SEP-31; reserved for Bitso/MoneyGram expansion.',
  },
  {
    protocol: 'SEP-0038',
    description: 'Anchor RFQ (Request for Quote)',
    status: 'reviewed',
    specUrl: 'https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0038.md',
    usedFor: 'Price quotes from Circle anchor before initiating conversion. SEP-38 endpoint parsed from stellar.toml.',
  },
];

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
    anchorId: 'circle-stellar',
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
    anchorId: 'circle-stellar',
    status: 'configured',
    estimatedSettlementMinutes: 3,
    minAmountUsd: 1,
    maxAmountUsd: 100000,
    complianceRequired: true,
    blockers: [],
  },
  {
    corridorId: 'axusd-to-usdc-stellar-mxn',
    label: 'AXUSD (Arbitrum) → USDC (Stellar) → MXN Remittance',
    sourceAsset: 'AXUSD',
    sourceNetwork: 'arbitrum',
    destinationCurrency: 'MXN',
    destinationCountry: 'MX',
    anchorId: null,
    status: 'anchor_pending',
    estimatedSettlementMinutes: 10,
    minAmountUsd: 10,
    maxAmountUsd: 10000,
    complianceRequired: true,
    blockers: ['Requires Bitso anchor integration for MXN corridors'],
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
