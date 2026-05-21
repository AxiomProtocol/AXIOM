/**
 * lib/reserves/phase3/assetValuationPolicy.ts
 *
 * Phase 3 — Per-asset ValuationPolicy registry.
 *
 * One policy per Phase 2 registry asset. Policies govern how each asset's
 * NAV is sourced, how confidence degrades under stale/fallback conditions,
 * and whether eligibility is blocked under adverse valuation states.
 */

import type { ValuationPolicy } from './types';

const POLICIES: ValuationPolicy[] = [
  // ── USDC — USDC_PSM ──────────────────────────────────────────────────────
  {
    assetId: 'usdc-canonical-psm',
    symbol: 'USDC',
    primarySourceId: 'FIXED_PEG',
    fallbackSourceId: 'CHAINLINK_USDC_USD',
    maxStalenessSeconds: 315360000, // effectively never stale
    minConfidenceScore: 90,
    haircutExpansionOnStaleBps: 0,
    haircutExpansionOnFallbackBps: 0,
    eligibleWhenStale: true,       // Fixed peg is always live
    eligibleWhenFallback: true,    // Chainlink fallback still highly reliable
    eligibleWhenAttestationMissing: true,
    attestationRequired: false,
    manualReviewRequired: false,
    emergencyDisableBehavior: 'EXCLUDE',
    notes: 'USDC is the canonical primary AXUSD backing. Fixed peg, effectively never stale.',
  },

  // ── thBILL — TOKENIZED_TBILL ──────────────────────────────────────────────
  {
    assetId: 'thbill-theo-market-planned',
    symbol: 'thBILL',
    primarySourceId: 'ISSUER_NAV_API',
    fallbackSourceId: 'ERC4626_CONVERT_TO_ASSETS',
    maxStalenessSeconds: 86400, // 24h for daily NAV instruments
    minConfidenceScore: 70,
    haircutExpansionOnStaleBps: 500,
    haircutExpansionOnFallbackBps: 200,
    eligibleWhenStale: false,     // Stale T-Bill NAV → exclude
    eligibleWhenFallback: false,  // PLANNED — remains zero regardless
    eligibleWhenAttestationMissing: false,
    attestationRequired: true,
    manualReviewRequired: true,
    emergencyDisableBehavior: 'EXCLUDE',
    notes:
      'PLANNED. NAV API not yet connected. Must not count toward AXUSD reserves. ' +
      'Stays zero eligible until status=LIVE and oracle is deployed.',
  },

  // ── BUIDL — TOKENIZED_TREASURY_FUND ──────────────────────────────────────
  {
    assetId: 'buidl-tokenized-treasury-planned',
    symbol: 'BUIDL',
    primarySourceId: 'ISSUER_NAV_API',
    fallbackSourceId: 'ERC4626_CONVERT_TO_ASSETS',
    maxStalenessSeconds: 86400,
    minConfidenceScore: 70,
    haircutExpansionOnStaleBps: 500,
    haircutExpansionOnFallbackBps: 200,
    eligibleWhenStale: false,
    eligibleWhenFallback: false,
    eligibleWhenAttestationMissing: false,
    attestationRequired: true,
    manualReviewRequired: true,
    emergencyDisableBehavior: 'EXCLUDE',
    notes: 'PLANNED. Phase 3 oracle + Phase 4 mint/redeem module required.',
  },

  // ── USDY — TOKENIZED_GOVERNMENT_MONEY_MARKET ─────────────────────────────
  {
    assetId: 'ondo-usdy-tokenized-govmmf-planned',
    symbol: 'USDY',
    primarySourceId: 'ISSUER_NAV_API',
    fallbackSourceId: 'ERC4626_CONVERT_TO_ASSETS',
    maxStalenessSeconds: 86400,
    minConfidenceScore: 70,
    haircutExpansionOnStaleBps: 500,
    haircutExpansionOnFallbackBps: 200,
    eligibleWhenStale: false,
    eligibleWhenFallback: false,
    eligibleWhenAttestationMissing: false,
    attestationRequired: true,
    manualReviewRequired: true,
    emergencyDisableBehavior: 'EXCLUDE',
    notes: 'PLANNED. Integrate after Phase 3 oracle approval.',
  },

  // ── PAXG — TOKENIZED_GOLD ─────────────────────────────────────────────────
  {
    assetId: 'paxg-tokenized-gold-planned',
    symbol: 'PAXG',
    primarySourceId: 'CHAINLINK_XAU_USD',
    fallbackSourceId: 'CUSTODIAN_ATTESTATION',
    maxStalenessSeconds: 3600,
    minConfidenceScore: 70,
    haircutExpansionOnStaleBps: 300,
    haircutExpansionOnFallbackBps: 200,
    eligibleWhenStale: false,
    eligibleWhenFallback: false,
    eligibleWhenAttestationMissing: false,
    attestationRequired: true,     // BitGo attestation required
    manualReviewRequired: true,
    emergencyDisableBehavior: 'EXCLUDE',
    notes:
      'PLANNED. PAXG is already counted in CanonicalReserveSnapshot hard-asset coverage. ' +
      'Dual-counting must be avoided. Reserve-control separation required before eligibility.',
  },

  // ── WETH — OPERATOR_TREASURY ──────────────────────────────────────────────
  {
    assetId: 'weth-operator-treasury-internal',
    symbol: 'WETH',
    primarySourceId: 'INTERNAL_ACCOUNTING',
    fallbackSourceId: null,
    maxStalenessSeconds: 3600,
    minConfidenceScore: 0,  // Irrelevant — always excluded
    haircutExpansionOnStaleBps: 0,
    haircutExpansionOnFallbackBps: 0,
    eligibleWhenStale: false,
    eligibleWhenFallback: false,
    eligibleWhenAttestationMissing: true, // No attestation needed (excluded anyway)
    attestationRequired: false,
    manualReviewRequired: false,
    emergencyDisableBehavior: 'EXCLUDE',
    notes:
      'INTERNAL_ONLY. AxiomTreasuryVault yield-strategy collateral. ' +
      'MUST NOT count as AXUSD reserve backing. Emergency immediate exclusion.',
  },

  // ── AXUSD (protocol holdings) — OPERATOR_TREASURY ────────────────────────
  {
    assetId: 'axusd-protocol-holdings-internal',
    symbol: 'AXUSD',
    primarySourceId: 'INTERNAL_ACCOUNTING',   // Circular backing guard — AXUSD backs itself
    fallbackSourceId: null,
    maxStalenessSeconds: 315360000,
    minConfidenceScore: 0,  // Irrelevant — always excluded (circular backing)
    haircutExpansionOnStaleBps: 0,
    haircutExpansionOnFallbackBps: 0,
    eligibleWhenStale: false,
    eligibleWhenFallback: false,
    eligibleWhenAttestationMissing: true,
    attestationRequired: false,
    manualReviewRequired: false,
    emergencyDisableBehavior: 'EXCLUDE',
    notes:
      'Circular backing guard: AXUSD is the liability being covered, not a backing asset. ' +
      'PERMANENTLY excluded from AXUSD reserve accounting.',
  },
];

// ── Registry ──────────────────────────────────────────────────────────────────

let _policyMap: Map<string, ValuationPolicy> | null = null;

function getPolicyMap(): Map<string, ValuationPolicy> {
  if (!_policyMap) {
    _policyMap = new Map(POLICIES.map(p => [p.assetId, p]));
  }
  return _policyMap;
}

export function getValuationPolicy(assetId: string): ValuationPolicy | undefined {
  return getPolicyMap().get(assetId);
}

export function getAllValuationPolicies(): ValuationPolicy[] {
  return POLICIES;
}

export function getValuationPolicyOrDefault(assetId: string, symbol: string): ValuationPolicy {
  const policy = getValuationPolicy(assetId);
  if (policy) return policy;

  // Safe default — excludes everything
  return {
    assetId,
    symbol,
    primarySourceId: 'INTERNAL_ACCOUNTING',
    fallbackSourceId: null,
    maxStalenessSeconds: 3600,
    minConfidenceScore: 50,
    haircutExpansionOnStaleBps: 10_000,
    haircutExpansionOnFallbackBps: 10_000,
    eligibleWhenStale: false,
    eligibleWhenFallback: false,
    eligibleWhenAttestationMissing: false,
    attestationRequired: true,
    manualReviewRequired: true,
    emergencyDisableBehavior: 'EXCLUDE',
    notes: 'Default policy — no specific policy found. Excludes asset from reserve accounting.',
  };
}
