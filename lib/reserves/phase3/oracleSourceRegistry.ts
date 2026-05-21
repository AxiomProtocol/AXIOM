/**
 * lib/reserves/phase3/oracleSourceRegistry.ts
 *
 * Phase 3 — OracleSourceRegistry
 *
 * Full registry of oracle sources with priority, staleness thresholds,
 * attestation requirements, and safety constraints.
 *
 * Enforcement:
 *   DEX_TWAP is prohibited as a primary source for Treasury asset classes.
 *   Calling assertNotDexTwapPrimary() enforces this at runtime.
 */

import type { OracleSource, OracleSourceType } from './types';

// ── Treasury asset sleeves that prohibit DEX_TWAP as primary ─────────────────

const DEX_TWAP_PROHIBITED_SLEEVES = [
  'TOKENIZED_TBILL',
  'TOKENIZED_TREASURY_FUND',
  'TOKENIZED_GOVERNMENT_MONEY_MARKET',
] as const;

export function assertNotDexTwapPrimary(
  sourceType: OracleSourceType,
  sleeve: string,
): void {
  if (
    sourceType === 'DEX_TWAP' &&
    (DEX_TWAP_PROHIBITED_SLEEVES as readonly string[]).includes(sleeve)
  ) {
    throw new Error(
      `DEX_TWAP cannot be a primary oracle source for sleeve '${sleeve}'. ` +
      'DEX_TWAP is restricted to secondary observation only for Treasury asset classes.'
    );
  }
}

// ── Source registry ───────────────────────────────────────────────────────────

const SOURCES: OracleSource[] = [
  {
    id: 'FIXED_PEG',
    name: 'Fixed Peg ($1.00)',
    type: 'FIXED_PEG',
    description:
      'Hardcoded $1.00 peg for USD-denominated stablecoins with established regulatory standing. ' +
      'Used for USDC. Treated as always fresh — no staleness threshold.',
    supportedAssets: ['usdc-canonical-psm'],
    supportedSleeves: ['USDC_PSM', 'CASH_EQUIVALENT'],
    priorityRank: 1,
    isPrimary: true,
    isFallback: false,
    isActive: true,
    isDeprecated: false,
    maxStalenessSeconds: 315360000, // 10 years — effectively never stale
    requiresAttestation: false,
    requiresManualReview: false,
    referenceUrl: null,
    notes: 'USDC is a regulated USD stablecoin issued by Circle. Fixed peg is appropriate for reserve accounting.',
  },
  {
    id: 'CHAINLINK_USDC_USD',
    name: 'Chainlink USDC/USD',
    type: 'CHAINLINK',
    description:
      'Chainlink price feed for USDC/USD. Used as fallback when fixed peg is challenged.',
    supportedAssets: ['usdc-canonical-psm'],
    supportedSleeves: ['USDC_PSM', 'CASH_EQUIVALENT'],
    priorityRank: 2,
    isPrimary: false,
    isFallback: true,
    isActive: true,
    isDeprecated: false,
    maxStalenessSeconds: 3600,
    requiresAttestation: false,
    requiresManualReview: false,
    referenceUrl: 'https://data.chain.link/arbitrum/mainnet/stablecoins/usdc-usd',
    notes: 'Secondary source for USDC. Confirms peg stability.',
  },
  {
    id: 'CHAINLINK_XAU_USD',
    name: 'Chainlink XAU/USD',
    type: 'CHAINLINK',
    description:
      'Chainlink price feed for gold (XAU/USD). Primary price source for PAXG valuation.',
    supportedAssets: ['paxg-tokenized-gold-planned'],
    supportedSleeves: ['TOKENIZED_GOLD'],
    priorityRank: 1,
    isPrimary: true,
    isFallback: false,
    isActive: true,
    isDeprecated: false,
    maxStalenessSeconds: 3600,
    requiresAttestation: true,
    requiresManualReview: false,
    referenceUrl: 'https://data.chain.link/arbitrum/mainnet/commodities/xau-usd',
    notes: 'Must be paired with custodian attestation for PAXG reserve eligibility.',
  },
  {
    id: 'ERC4626_CONVERT_TO_ASSETS',
    name: 'ERC-4626 convertToAssets()',
    type: 'ERC4626_CONVERT_TO_ASSETS',
    description:
      'On-chain NAV from tokenized fund ERC-4626 convertToAssets(). ' +
      'Applicable to tokenized Treasury funds implementing the ERC-4626 vault standard.',
    supportedAssets: [
      'thbill-theo-market-planned',
      'buidl-tokenized-treasury-planned',
      'ondo-usdy-tokenized-govmmf-planned',
    ],
    supportedSleeves: [
      'TOKENIZED_TBILL',
      'TOKENIZED_TREASURY_FUND',
      'TOKENIZED_GOVERNMENT_MONEY_MARKET',
    ],
    priorityRank: 2,
    isPrimary: false,
    isFallback: true,
    isActive: true,
    isDeprecated: false,
    maxStalenessSeconds: 86400,
    requiresAttestation: true,
    requiresManualReview: false,
    referenceUrl: null,
    notes: 'Fallback for Treasury assets when issuer NAV API is unavailable.',
  },
  {
    id: 'ISSUER_NAV_API',
    name: 'Issuer NAV API',
    type: 'ISSUER_NAV_API',
    description:
      'Issuer-reported NAV via authenticated API endpoint. ' +
      'Primary source for tokenized T-bills and Treasury funds once integrated.',
    supportedAssets: [
      'thbill-theo-market-planned',
      'buidl-tokenized-treasury-planned',
      'ondo-usdy-tokenized-govmmf-planned',
    ],
    supportedSleeves: [
      'TOKENIZED_TBILL',
      'TOKENIZED_TREASURY_FUND',
      'TOKENIZED_GOVERNMENT_MONEY_MARKET',
    ],
    priorityRank: 1,
    isPrimary: true,
    isFallback: false,
    isActive: false, // Phase 3 stub — not yet connected
    isDeprecated: false,
    maxStalenessSeconds: 86400,
    requiresAttestation: true,
    requiresManualReview: true,
    referenceUrl: null,
    notes:
      'Not yet connected. Phase 3 NAV API integration required before any T-Bill asset can go LIVE.',
  },
  {
    id: 'CUSTODIAN_ATTESTATION',
    name: 'Custodian Attestation (BitGo)',
    type: 'CUSTODIAN_ATTESTATION',
    description:
      'Custody attestation from BitGo CaaS confirming asset holdings. ' +
      'Required for PAXG gold reserve eligibility.',
    supportedAssets: ['paxg-tokenized-gold-planned'],
    supportedSleeves: ['TOKENIZED_GOLD'],
    priorityRank: 1,
    isPrimary: false,
    isFallback: false,
    isActive: true,
    isDeprecated: false,
    maxStalenessSeconds: 86400,
    requiresAttestation: true,
    requiresManualReview: false,
    referenceUrl: null,
    notes: 'Paired with CHAINLINK_XAU_USD. Both required for PAXG eligibility.',
  },
  {
    id: 'MANUAL_OPERATOR_INPUT',
    name: 'Manual Operator Input',
    type: 'MANUAL_OPERATOR_INPUT',
    description:
      'Emergency fallback allowing an authorized operator to submit a manual valuation. ' +
      'Time-limited to 24 hours. Triggers manual review flag.',
    supportedAssets: ['*'], // Any asset in emergency
    supportedSleeves: ['*'],
    priorityRank: 99,
    isPrimary: false,
    isFallback: true,
    isActive: true,
    isDeprecated: false,
    maxStalenessSeconds: 86400, // 24h hard limit on manual overrides
    requiresAttestation: false,
    requiresManualReview: true,
    referenceUrl: null,
    notes: 'Emergency use only. Reduces confidence to 50 max. Triggers manual review.',
  },
  {
    id: 'DEX_TWAP',
    name: 'DEX TWAP (Secondary Observation Only)',
    type: 'DEX_TWAP',
    description:
      'Time-weighted average price from DEX pools. ' +
      'RESTRICTED: secondary observation only, NEVER primary for Treasury assets.',
    supportedAssets: ['*'],
    supportedSleeves: ['*'],
    priorityRank: 90,
    isPrimary: false,
    isFallback: false, // Not a valid fallback for Treasury
    isActive: true,
    isDeprecated: false,
    maxStalenessSeconds: 1800,
    requiresAttestation: false,
    requiresManualReview: false,
    referenceUrl: null,
    notes:
      'NOT admissible as primary or fallback for TOKENIZED_TBILL, TOKENIZED_TREASURY_FUND, ' +
      'or TOKENIZED_GOVERNMENT_MONEY_MARKET. Secondary observation only.',
  },
  {
    id: 'INTERNAL_ACCOUNTING',
    name: 'Internal Accounting',
    type: 'INTERNAL_ACCOUNTING',
    description:
      'Operator-internal valuation for OPERATOR_TREASURY assets. ' +
      'Never used for public reserve accounting.',
    supportedAssets: ['weth-operator-treasury-internal', 'axusd-protocol-holdings-internal'],
    supportedSleeves: ['OPERATOR_TREASURY'],
    priorityRank: 1,
    isPrimary: true,
    isFallback: false,
    isActive: true,
    isDeprecated: false,
    maxStalenessSeconds: 3600,
    requiresAttestation: false,
    requiresManualReview: false,
    referenceUrl: null,
    notes: 'Internal only. These assets are always excluded from AXUSD backing.',
  },
  {
    id: 'FALLBACK_COMPOSITE',
    name: 'Fallback Composite (Weighted Average)',
    type: 'FALLBACK_COMPOSITE',
    description:
      'Weighted average of available sources when primary fails. ' +
      'Confidence degraded proportionally to source health.',
    supportedAssets: ['*'],
    supportedSleeves: ['*'],
    priorityRank: 95,
    isPrimary: false,
    isFallback: true,
    isActive: true,
    isDeprecated: false,
    maxStalenessSeconds: 7200,
    requiresAttestation: false,
    requiresManualReview: false,
    referenceUrl: null,
    notes: 'Used when all configured sources are partially degraded.',
  },
];

// ── Registry singleton ────────────────────────────────────────────────────────

let _registry: OracleSource[] | null = null;

export function getOracleSourceRegistry(): OracleSource[] {
  if (!_registry) {
    _registry = SOURCES;
  }
  return _registry;
}

export function getOracleSourceById(id: string): OracleSource | undefined {
  return getOracleSourceRegistry().find(s => s.id === id);
}

export function getActiveOracleSources(): OracleSource[] {
  return getOracleSourceRegistry().filter(s => s.isActive && !s.isDeprecated);
}

export function getSourcesForAsset(assetId: string): OracleSource[] {
  return getOracleSourceRegistry().filter(
    s => s.supportedAssets.includes(assetId) || s.supportedAssets.includes('*')
  );
}

export function getPrimarySourceForAsset(assetId: string): OracleSource | undefined {
  return getOracleSourceRegistry()
    .filter(s => s.isPrimary && (s.supportedAssets.includes(assetId)))
    .sort((a, b) => a.priorityRank - b.priorityRank)[0];
}
