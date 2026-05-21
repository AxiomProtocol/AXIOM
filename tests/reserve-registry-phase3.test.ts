/**
 * tests/reserve-registry-phase3.test.ts
 *
 * Phase 3 — Oracle and NAV Adapter Architecture unit tests.
 *
 * Tests cover:
 *   1.  OracleSourceRegistry — load, validate, deduplicate
 *   2.  assertNotDexTwapPrimary — enforcement on prohibited sleeves
 *   3.  ValuationPolicy registry — per-asset policies
 *   4.  Freshness state machine — computeFreshnessState()
 *   5.  Confidence scoring — computeConfidenceScore()
 *   6.  TreasuryNAVOracleService — per-asset NAVObservation
 *   7.  USDC fixed-peg invariant
 *   8.  PLANNED asset NAV invariant (unusable observation)
 *   9.  INTERNAL_ONLY asset NAV routing
 *  10.  RWAValuationAdapter — eligibility gate enforcement
 *  11.  RWAValuationAdapter — haircut expansion on stale/fallback
 *  12.  Fallback hierarchy selection
 *  13.  Reserve snapshot bucketing
 *  14.  ReserveManagerSummaryPhase3 extensions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getOracleSourceRegistry,
  getOracleSourceById,
  getActiveOracleSources,
  assertNotDexTwapPrimary,
} from '../lib/reserves/phase3/oracleSourceRegistry';
import {
  getValuationPolicy,
  getAllValuationPolicies,
  getValuationPolicyOrDefault,
} from '../lib/reserves/phase3/assetValuationPolicy';
import {
  computeFreshnessState,
  computeConfidenceScore,
  isFreshnessStale,
  isFreshnessUnusable,
  SOURCE_BASE_SCORES,
} from '../lib/reserves/phase3/valuationConfidence';
import {
  TreasuryNAVOracleService,
  getTreasuryNAVOracle,
} from '../lib/reserves/phase3/treasuryNAVOracle';
import {
  getValuation,
} from '../lib/reserves/phase3/rwaValuationAdapter';
import {
  selectValuationSource,
} from '../lib/reserves/phase3/fallbackHierarchy';
import {
  buildSnapshotAsset,
  assembleReserveSnapshot,
} from '../lib/reserves/phase3/reserveSnapshot';
import type {
  NAVObservation,
  ValuationResult,
  ConfidenceScoreParams,
} from '../lib/reserves/phase3/types';
import type {
  ApprovedReserveAsset,
  HaircutPolicy,
} from '../lib/reserves/phase2/types';

// ── Mock helpers ─────────────────────────────────────────────────────────────

const VALID_ADDR = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const NOW_ISO = new Date().toISOString();
const STALE_ISO = new Date(Date.now() - 200_000 * 1000).toISOString(); // very old

function mockHaircut(overrides: Partial<HaircutPolicy> = {}): HaircutPolicy {
  return {
    haircutBps:           0,
    maxAllocationBps:     10_000,
    emergencyDisabled:    false,
    staleValuation:       false,
    manualReviewRequired: false,
    haircutRationale:     'Test haircut',
    ...overrides,
  };
}

function mockAsset(overrides: Partial<ApprovedReserveAsset> = {}): ApprovedReserveAsset {
  return {
    id: 'usdc-canonical-psm',
    assetAddress: VALID_ADDR,
    assetSymbol: 'USDC',
    assetDecimals: 6,
    chainId: 42161,
    sleeve: 'USDC_PSM',
    status: 'LIVE',
    disclosureStatus: 'PUBLIC',
    isLive: true,
    isPlanned: false,
    isRedeemable: true,
    isMintEligible: true,
    isDisclosureEligible: true,
    valuationSource: 'FIXED_PEG',
    priceUsdPerUnit: 1.0,
    currentBalance: 100_000,
    grossValueUsd: 100_000,
    eligibleReserveValueUsd: 100_000,
    lastValuedAt: NOW_ISO,
    lastUpdatedAt: NOW_ISO,
    haircutPolicy: mockHaircut(),
    custody: {
      custodyType: 'ON_CHAIN_SMART_CONTRACT',
      custodyVenue: 'CanonicalPSM',
      custodyWallet: VALID_ADDR,
      custodyProofSource: 'ON_CHAIN',
      attestationStatus: 'NONE',
      reconciliationStatus: 'NOT_REQUIRED',
    },
    adminNotes: 'Test asset',
    ...overrides,
  };
}

function mockNAVObservation(overrides: Partial<NAVObservation> = {}): NAVObservation {
  return {
    assetId: 'usdc-canonical-psm',
    assetAddress: VALID_ADDR,
    chainId: 42161,
    symbol: 'USDC',
    grossNavPerToken: 1.0,
    quoteCurrency: 'USD',
    decimals: 6,
    timestamp: NOW_ISO,
    sourceName: 'Fixed Peg ($1.00)',
    sourceType: 'FIXED_PEG',
    sourceUrl: null,
    confidenceScore: 99,
    freshnessState: 'FRESH',
    isStale: false,
    isFallback: false,
    isManuallyReviewed: false,
    isUsable: true,
    unusableReason: null,
    ...overrides,
  };
}

// ── 1. OracleSourceRegistry ─────────────────────────────────────────────────

describe('OracleSourceRegistry — load and validate', () => {
  it('loads a non-empty registry', () => {
    const sources = getOracleSourceRegistry();
    expect(sources).toBeDefined();
    expect(Array.isArray(sources)).toBe(true);
    expect(sources.length).toBeGreaterThan(0);
  });

  it('all sources have non-empty id, name, and type', () => {
    const sources = getOracleSourceRegistry();
    for (const s of sources) {
      expect(s.id.length).toBeGreaterThan(0);
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.type.length).toBeGreaterThan(0);
    }
  });

  it('source IDs are unique', () => {
    const sources = getOracleSourceRegistry();
    const ids = sources.map(s => s.id);
    const unique = new Set(ids);
    expect(ids.length).toBe(unique.size);
  });

  it('getOracleSourceById finds FIXED_PEG', () => {
    const src = getOracleSourceById('FIXED_PEG');
    expect(src).toBeDefined();
    expect(src!.type).toBe('FIXED_PEG');
    expect(src!.isPrimary).toBe(true);
  });

  it('getOracleSourceById returns undefined for unknown ID', () => {
    const src = getOracleSourceById('NONEXISTENT_SOURCE');
    expect(src).toBeUndefined();
  });

  it('getActiveOracleSources filters out deprecated sources', () => {
    const active = getActiveOracleSources();
    for (const s of active) {
      expect(s.isDeprecated).toBe(false);
      expect(s.isActive).toBe(true);
    }
  });

  it('FIXED_PEG has maxStalenessSeconds >= 10 years (never stale)', () => {
    const src = getOracleSourceById('FIXED_PEG');
    expect(src!.maxStalenessSeconds).toBeGreaterThanOrEqual(315360000);
  });

  it('ISSUER_NAV_API is not active (Phase 3 stub)', () => {
    const src = getOracleSourceById('ISSUER_NAV_API');
    expect(src).toBeDefined();
    expect(src!.isActive).toBe(false);
  });

  it('DEX_TWAP is not a primary source', () => {
    const src = getOracleSourceById('DEX_TWAP');
    expect(src!.isPrimary).toBe(false);
  });
});

// ── 2. assertNotDexTwapPrimary ───────────────────────────────────────────────

describe('assertNotDexTwapPrimary — enforcement', () => {
  it('throws for TOKENIZED_TBILL with DEX_TWAP', () => {
    expect(() => assertNotDexTwapPrimary('DEX_TWAP', 'TOKENIZED_TBILL')).toThrow();
  });

  it('throws for TOKENIZED_TREASURY_FUND with DEX_TWAP', () => {
    expect(() => assertNotDexTwapPrimary('DEX_TWAP', 'TOKENIZED_TREASURY_FUND')).toThrow();
  });

  it('throws for TOKENIZED_GOVERNMENT_MONEY_MARKET with DEX_TWAP', () => {
    expect(() => assertNotDexTwapPrimary('DEX_TWAP', 'TOKENIZED_GOVERNMENT_MONEY_MARKET')).toThrow();
  });

  it('does NOT throw for USDC_PSM with DEX_TWAP', () => {
    expect(() => assertNotDexTwapPrimary('DEX_TWAP', 'USDC_PSM')).not.toThrow();
  });

  it('does NOT throw for CHAINLINK on any sleeve', () => {
    expect(() => assertNotDexTwapPrimary('CHAINLINK', 'TOKENIZED_TBILL')).not.toThrow();
  });

  it('does NOT throw for FIXED_PEG on any sleeve', () => {
    expect(() => assertNotDexTwapPrimary('FIXED_PEG', 'TOKENIZED_TBILL')).not.toThrow();
  });
});

// ── 3. ValuationPolicy registry ──────────────────────────────────────────────

describe('ValuationPolicy registry', () => {
  it('getAllValuationPolicies returns all 7 Phase 2 registry assets', () => {
    const policies = getAllValuationPolicies();
    expect(policies.length).toBe(7);
  });

  it('USDC policy: primarySourceId is FIXED_PEG', () => {
    const p = getValuationPolicy('usdc-canonical-psm');
    expect(p).toBeDefined();
    expect(p!.primarySourceId).toBe('FIXED_PEG');
    expect(p!.eligibleWhenStale).toBe(true);
  });

  it('thBILL policy: eligibleWhenStale is false (PLANNED)', () => {
    const p = getValuationPolicy('thbill-theo-market-planned');
    expect(p!.eligibleWhenStale).toBe(false);
    expect(p!.eligibleWhenFallback).toBe(false);
  });

  it('PAXG policy: attestationRequired is true', () => {
    const p = getValuationPolicy('paxg-tokenized-gold-planned');
    expect(p!.attestationRequired).toBe(true);
  });

  it('WETH policy: primarySourceId is INTERNAL_ACCOUNTING', () => {
    const p = getValuationPolicy('weth-operator-treasury-internal');
    expect(p!.primarySourceId).toBe('INTERNAL_ACCOUNTING');
  });

  it('AXUSD policy: eligible values are false (circular backing guard)', () => {
    const p = getValuationPolicy('axusd-protocol-holdings-internal');
    expect(p!.eligibleWhenStale).toBe(false);
    expect(p!.eligibleWhenFallback).toBe(false);
  });

  it('getValuationPolicyOrDefault returns a safe-exclusion policy for unknown asset', () => {
    const p = getValuationPolicyOrDefault('completely-unknown-asset', 'UNKNOWN');
    expect(p.haircutExpansionOnStaleBps).toBe(10_000);
    expect(p.eligibleWhenStale).toBe(false);
    expect(p.manualReviewRequired).toBe(true);
  });

  it('all policies have non-empty assetId and symbol', () => {
    for (const p of getAllValuationPolicies()) {
      expect(p.assetId.length).toBeGreaterThan(0);
      expect(p.symbol.length).toBeGreaterThan(0);
    }
  });
});

// ── 4. Freshness state machine ────────────────────────────────────────────────

describe('computeFreshnessState', () => {
  it('returns FRESH for recently updated timestamp', () => {
    const fresh = new Date(Date.now() - 60 * 1000).toISOString(); // 1 min ago
    expect(computeFreshnessState(fresh, 3600)).toBe('FRESH');
  });

  it('returns APPROACHING_STALE for 85% of threshold', () => {
    const approaching = new Date(Date.now() - 3060 * 1000).toISOString(); // 51 min (85% of 60 min)
    expect(computeFreshnessState(approaching, 3600)).toBe('APPROACHING_STALE');
  });

  it('returns STALE for 120% of threshold', () => {
    const stale = new Date(Date.now() - 4400 * 1000).toISOString(); // >3600 but <7200
    expect(computeFreshnessState(stale, 3600)).toBe('STALE');
  });

  it('returns EXPIRED for 250% of threshold (between 200% and 400%)', () => {
    // 9000 seconds = 250% of 3600 → falls in EXPIRED range (200%–400%)
    const expired = new Date(Date.now() - 9000 * 1000).toISOString();
    expect(computeFreshnessState(expired, 3600)).toBe('EXPIRED');
  });

  it('returns UNUSABLE for null timestamp', () => {
    expect(computeFreshnessState(null, 3600)).toBe('UNUSABLE');
  });

  it('returns UNUSABLE for invalid date string', () => {
    expect(computeFreshnessState('not-a-date', 3600)).toBe('UNUSABLE');
  });

  it('FRESH for very short age with large threshold', () => {
    const ts = new Date(Date.now() - 100).toISOString();
    expect(computeFreshnessState(ts, 315360000)).toBe('FRESH');
  });

  it('isFreshnessStale returns true for STALE', () => {
    expect(isFreshnessStale('STALE')).toBe(true);
    expect(isFreshnessStale('FRESH')).toBe(false);
  });

  it('isFreshnessUnusable returns true for UNUSABLE', () => {
    expect(isFreshnessUnusable('UNUSABLE')).toBe(true);
    expect(isFreshnessUnusable('FRESH')).toBe(false);
  });
});

// ── 5. Confidence scoring ────────────────────────────────────────────────────

describe('computeConfidenceScore', () => {
  function baseParams(overrides: Partial<ConfidenceScoreParams> = {}): ConfidenceScoreParams {
    return {
      sourceType: 'FIXED_PEG',
      freshnessState: 'FRESH',
      attestationStatus: 'NONE',
      reconciliationStatus: 'NOT_REQUIRED',
      isFallback: false,
      isManuallyReviewed: false,
      isAssetLive: true,
      attestationRequired: false,
      ...overrides,
    };
  }

  it('FIXED_PEG FRESH = 99', () => {
    expect(computeConfidenceScore(baseParams())).toBe(99);
  });

  it('CHAINLINK FRESH = 92', () => {
    expect(computeConfidenceScore(baseParams({ sourceType: 'CHAINLINK' }))).toBe(92);
  });

  it('DEX_TWAP FRESH = 40', () => {
    expect(computeConfidenceScore(baseParams({ sourceType: 'DEX_TWAP' }))).toBe(40);
  });

  it('stale freshness applies -25 penalty', () => {
    const score = computeConfidenceScore(baseParams({ sourceType: 'CHAINLINK', freshnessState: 'STALE' }));
    expect(score).toBe(92 - 25);
  });

  it('fallback usage applies -10 penalty', () => {
    const score = computeConfidenceScore(baseParams({ sourceType: 'CHAINLINK', isFallback: true }));
    expect(score).toBe(92 - 10);
  });

  it('FAILED attestation applies -30 penalty', () => {
    const score = computeConfidenceScore(baseParams({ sourceType: 'CHAINLINK', attestationStatus: 'FAILED', attestationRequired: true }));
    expect(score).toBe(92 - 30);
  });

  it('NONE attestation when required applies -20 penalty', () => {
    const score = computeConfidenceScore(baseParams({ sourceType: 'CHAINLINK', attestationStatus: 'NONE', attestationRequired: true }));
    expect(score).toBe(92 - 20);
  });

  it('multiple penalties stack', () => {
    const score = computeConfidenceScore(baseParams({
      sourceType: 'CHAINLINK',
      freshnessState: 'STALE',
      isFallback: true,
    }));
    expect(score).toBe(92 - 25 - 10);
  });

  it('score is clamped to 0 on heavy penalties', () => {
    const score = computeConfidenceScore({
      sourceType: 'DEX_TWAP',    // 40
      freshnessState: 'EXPIRED', // -40
      attestationStatus: 'FAILED', // -30
      reconciliationStatus: 'FAILED', // -20
      isFallback: true,          // -10
      isManuallyReviewed: true,  // -5
      isAssetLive: false,        // -10
      attestationRequired: true,
    });
    expect(score).toBe(0);
  });

  it('score is clamped to 100 maximum', () => {
    const score = computeConfidenceScore(baseParams({ sourceType: 'FIXED_PEG' }));
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('all source types in SOURCE_BASE_SCORES', () => {
    const allTypes: Array<keyof typeof SOURCE_BASE_SCORES> = [
      'FIXED_PEG', 'CHAINLINK', 'ERC4626_CONVERT_TO_ASSETS',
      'ISSUER_NAV_API', 'CUSTODIAN_ATTESTATION', 'MANUAL_OPERATOR_INPUT',
      'DEX_TWAP', 'INTERNAL_ACCOUNTING', 'FALLBACK_COMPOSITE',
    ];
    for (const t of allTypes) {
      expect(SOURCE_BASE_SCORES[t]).toBeDefined();
      expect(SOURCE_BASE_SCORES[t]).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── 6. TreasuryNAVOracleService ───────────────────────────────────────────────

describe('TreasuryNAVOracleService', () => {
  const oracle = new TreasuryNAVOracleService();

  it('USDC: returns NAV = 1.0', async () => {
    const obs = await oracle.getNAVWithMetadata('usdc-canonical-psm');
    expect(obs.grossNavPerToken).toBe(1.0);
    expect(obs.isUsable).toBe(true);
    expect(obs.sourceType).toBe('FIXED_PEG');
  });

  it('USDC: confidence is 99', async () => {
    const obs = await oracle.getNAVWithMetadata('usdc-canonical-psm');
    expect(obs.confidenceScore).toBe(99);
  });

  it('USDC: freshnessState is FRESH', async () => {
    const obs = await oracle.getNAVWithMetadata('usdc-canonical-psm');
    expect(obs.freshnessState).toBe('FRESH');
  });

  it('USDC: isStale is false', async () => {
    const obs = await oracle.getNAVWithMetadata('usdc-canonical-psm');
    expect(obs.isStale).toBe(false);
  });

  it('thBILL: returns unusable observation', async () => {
    const obs = await oracle.getNAVWithMetadata('thbill-theo-market-planned');
    expect(obs.isUsable).toBe(false);
    expect(obs.grossNavPerToken).toBeNull();
    expect(obs.freshnessState).toBe('UNUSABLE');
  });

  it('BUIDL: returns unusable observation', async () => {
    const obs = await oracle.getNAVWithMetadata('buidl-tokenized-treasury-planned');
    expect(obs.isUsable).toBe(false);
    expect(obs.grossNavPerToken).toBeNull();
  });

  it('USDY: returns unusable observation', async () => {
    const obs = await oracle.getNAVWithMetadata('ondo-usdy-tokenized-govmmf-planned');
    expect(obs.isUsable).toBe(false);
    expect(obs.grossNavPerToken).toBeNull();
  });

  it('PAXG: returns unusable observation', async () => {
    const obs = await oracle.getNAVWithMetadata('paxg-tokenized-gold-planned');
    expect(obs.isUsable).toBe(false);
    expect(obs.grossNavPerToken).toBeNull();
  });

  it('WETH: returns observation with INTERNAL_ACCOUNTING source', async () => {
    const obs = await oracle.getNAVWithMetadata('weth-operator-treasury-internal');
    expect(obs.sourceType).toBe('INTERNAL_ACCOUNTING');
  });

  it('AXUSD (internal): returns fixed peg observation', async () => {
    const obs = await oracle.getNAVWithMetadata('axusd-protocol-holdings-internal');
    expect(obs.grossNavPerToken).toBe(1.0);
    expect(obs.sourceType).toBe('FIXED_PEG');
  });

  it('Unknown asset: returns unusable observation', async () => {
    const obs = await oracle.getNAVWithMetadata('this-is-not-an-asset');
    expect(obs.isUsable).toBe(false);
  });

  it('getNAV() returns number for USDC', async () => {
    const nav = await oracle.getNAV('usdc-canonical-psm');
    expect(nav).toBe(1.0);
  });

  it('isStale() returns false for USDC', async () => {
    const stale = await oracle.isStale('usdc-canonical-psm');
    expect(stale).toBe(false);
  });

  it('isValuationUsable() returns false for PLANNED assets', async () => {
    const usable = await oracle.isValuationUsable('thbill-theo-market-planned');
    expect(usable).toBe(false);
  });
});

// ── 7. USDC fixed-peg invariant ───────────────────────────────────────────────

describe('USDC fixed-peg invariant', () => {
  it('USDC NAV is always 1.0 regardless of timing', async () => {
    const oracle = getTreasuryNAVOracle();
    const obs = await oracle.getNAVWithMetadata('usdc-canonical-psm');
    expect(obs.grossNavPerToken).toBe(1.0);
  });

  it('USDC has no stale threshold in practice (maxStaleness=10yr)', () => {
    const src = getOracleSourceById('FIXED_PEG');
    expect(src!.maxStalenessSeconds).toBeGreaterThanOrEqual(315360000);
  });

  it('USDC freshness state is always FRESH', async () => {
    const oracle = getTreasuryNAVOracle();
    const obs = await oracle.getNAVWithMetadata('usdc-canonical-psm');
    expect(obs.freshnessState).toBe('FRESH');
  });
});

// ── 8. PLANNED asset NAV invariant ───────────────────────────────────────────

describe('PLANNED asset NAV invariants', () => {
  const PLANNED_IDS = [
    'thbill-theo-market-planned',
    'buidl-tokenized-treasury-planned',
    'ondo-usdy-tokenized-govmmf-planned',
    'paxg-tokenized-gold-planned',
  ];

  it.each(PLANNED_IDS)('%s has unusable NAV observation', async (id) => {
    const oracle = new TreasuryNAVOracleService();
    const obs = await oracle.getNAVWithMetadata(id);
    expect(obs.isUsable).toBe(false);
    expect(obs.grossNavPerToken).toBeNull();
    expect(obs.freshnessState).toBe('UNUSABLE');
    expect(obs.confidenceScore).toBe(0);
  });
});

// ── 9. INTERNAL_ONLY asset NAV routing ───────────────────────────────────────

describe('INTERNAL_ONLY asset NAV routing', () => {
  it('WETH INTERNAL_ACCOUNTING observation is usable for internal purposes', async () => {
    const oracle = new TreasuryNAVOracleService();
    const obs = await oracle.getNAVWithMetadata('weth-operator-treasury-internal');
    expect(obs.sourceType).toBe('INTERNAL_ACCOUNTING');
    expect(obs.isUsable).toBe(true);
  });
});

// ── 10. RWAValuationAdapter — eligibility gate enforcement ────────────────────

describe('RWAValuationAdapter eligibility gates', () => {
  const usdcPolicy = getValuationPolicy('usdc-canonical-psm')!;

  it('PLANNED asset: eligibleReserveValueUsd = 0 regardless of positive NAV', () => {
    const asset = mockAsset({
      id: 'thbill-theo-market-planned',
      assetSymbol: 'thBILL',
      status: 'PLANNED',
      isLive: false,
      isPlanned: true,
      sleeve: 'TOKENIZED_TBILL',
      currentBalance: 1000,
      grossValueUsd: 1000,
      eligibleReserveValueUsd: 0,
    });
    const policy = getValuationPolicy('thbill-theo-market-planned') ?? getValuationPolicyOrDefault(asset.id, asset.assetSymbol);
    const nav = mockNAVObservation({ grossNavPerToken: 1.05 });
    const result = getValuation(asset, policy, nav);
    expect(result.eligibleReserveValueUsd).toBe(0);
    expect(result.exclusionReason).toBe('PLANNED_ASSET');
  });

  it('INTERNAL_ONLY asset: eligibleReserveValueUsd = 0', () => {
    const asset = mockAsset({
      id: 'weth-operator-treasury-internal',
      assetSymbol: 'WETH',
      status: 'INTERNAL_ONLY',
      isLive: false,
      isPlanned: false,
      sleeve: 'OPERATOR_TREASURY',
      currentBalance: 10,
      grossValueUsd: 28000,
      eligibleReserveValueUsd: 0,
    });
    const policy = getValuationPolicy('weth-operator-treasury-internal')!;
    const nav = mockNAVObservation({ grossNavPerToken: 2800 });
    const result = getValuation(asset, policy, nav);
    expect(result.eligibleReserveValueUsd).toBe(0);
    expect(['INTERNAL_ONLY_ASSET', 'OPERATOR_TREASURY_EXCLUDED']).toContain(result.exclusionReason);
  });

  it('OPERATOR_TREASURY sleeve: eligibleReserveValueUsd = 0', () => {
    const asset = mockAsset({
      sleeve: 'OPERATOR_TREASURY',
      currentBalance: 50000,
      grossValueUsd: 50000,
    });
    const nav = mockNAVObservation({ grossNavPerToken: 1.0 });
    const result = getValuation(asset, usdcPolicy, nav);
    expect(result.eligibleReserveValueUsd).toBe(0);
  });

  it('DISABLED asset: eligibleReserveValueUsd = 0', () => {
    const asset = mockAsset({ status: 'DISABLED', isLive: false });
    const nav = mockNAVObservation();
    const result = getValuation(asset, usdcPolicy, nav);
    expect(result.eligibleReserveValueUsd).toBe(0);
  });

  it('emergencyDisabled = true: eligibleReserveValueUsd = 0', () => {
    const asset = mockAsset({ haircutPolicy: mockHaircut({ emergencyDisabled: true }) });
    const nav = mockNAVObservation();
    const result = getValuation(asset, usdcPolicy, nav);
    expect(result.eligibleReserveValueUsd).toBe(0);
    expect(result.exclusionReason).toBe('EMERGENCY_DISABLED');
  });

  it('USDC LIVE with $1.00 peg and 100K balance: eligible = 100K', () => {
    const asset = mockAsset();
    const nav = mockNAVObservation({ grossNavPerToken: 1.0 });
    const result = getValuation(asset, usdcPolicy, nav);
    expect(result.eligibleReserveValueUsd).toBe(100_000);
    expect(result.exclusionReason).toBeNull();
    expect(result.isEligible).toBe(true);
  });

  it('stale valuation + eligibleWhenStale=false: eligible = 0', () => {
    const asset = mockAsset({
      id: 'thbill-theo-market-planned',
      assetSymbol: 'thBILL',
      status: 'LIVE', // Override to LIVE to test stale gate in isolation
      isLive: true,
      isPlanned: false,
      sleeve: 'TOKENIZED_TBILL',
      currentBalance: 1000,
      grossValueUsd: 1000,
      eligibleReserveValueUsd: 0,
    });
    const policy = getValuationPolicy('thbill-theo-market-planned')!;
    const staleNav = mockNAVObservation({
      freshnessState: 'STALE',
      isStale: true,
      grossNavPerToken: 1.05,
    });
    const result = getValuation(asset, policy, staleNav);
    expect(result.eligibleReserveValueUsd).toBe(0);
  });
});

// ── 11. RWAValuationAdapter — haircut expansion ───────────────────────────────

describe('RWAValuationAdapter haircut expansion', () => {
  it('stale valuation expands haircut by haircutExpansionOnStaleBps', () => {
    const policy = getValuationPolicy('usdc-canonical-psm')!;
    const asset = mockAsset();
    const staleNav = mockNAVObservation({ freshnessState: 'STALE', isStale: true });
    const result = getValuation(asset, policy, staleNav);
    // USDC policy: haircutExpansionOnStaleBps = 0, so no expansion for USDC
    expect(result.effectiveHaircutBps).toBe(0);
  });

  it('effectiveHaircutBps >= baseHaircutBps always', () => {
    const policy = getValuationPolicy('thbill-theo-market-planned')!;
    const asset = mockAsset({ id: 'thbill-theo-market-planned', sleeve: 'TOKENIZED_TBILL', status: 'LIVE', isLive: true, isPlanned: false, currentBalance: 1000, grossValueUsd: 1000 });
    const nav = mockNAVObservation({ isFallback: true, freshnessState: 'STALE', isStale: true });
    const result = getValuation(asset, policy, nav, 'USING_FALLBACK');
    expect(result.effectiveHaircutBps).toBeGreaterThanOrEqual(result.baseHaircutBps);
  });

  it('emergencyDisabled forces effectiveHaircutBps to 10000', () => {
    const policy = getValuationPolicy('usdc-canonical-psm')!;
    const asset = mockAsset({ haircutPolicy: mockHaircut({ haircutBps: 50, emergencyDisabled: true }) });
    const nav = mockNAVObservation();
    const result = getValuation(asset, policy, nav);
    expect(result.effectiveHaircutBps).toBe(10_000);
  });

  it('haircut of 100 bps reduces eligible value', () => {
    const policy = getValuationPolicy('usdc-canonical-psm')!;
    const asset = mockAsset({ haircutPolicy: mockHaircut({ haircutBps: 100 }) }); // 1%
    const nav = mockNAVObservation({ grossNavPerToken: 1.0 });
    const result = getValuation(asset, policy, nav);
    expect(result.eligibleReserveValueUsd).toBeCloseTo(99_000, 0);
  });
});

// ── 12. Fallback hierarchy selection ─────────────────────────────────────────

describe('selectValuationSource fallback logic', () => {
  it('PRIMARY_HEALTHY when primary observation is fresh and usable', () => {
    const primary = mockNAVObservation({ isUsable: true, isStale: false, freshnessState: 'FRESH' });
    const result = selectValuationSource(primary, null, null, 70);
    expect(result.fallbackState).toBe('PRIMARY_HEALTHY');
    expect(result.penaltyApplied).toBe(0);
  });

  it('USING_FALLBACK when primary stale but fallback healthy', () => {
    const primary = mockNAVObservation({ isUsable: false, isStale: true, freshnessState: 'STALE' });
    const fallback = mockNAVObservation({ isUsable: true, isStale: false, freshnessState: 'FRESH', sourceType: 'CHAINLINK' });
    const result = selectValuationSource(primary, fallback, null, 70);
    expect(result.fallbackState).toBe('USING_FALLBACK');
    expect(result.observation.isFallback).toBe(true);
    expect(result.penaltyApplied).toBeGreaterThan(0);
  });

  it('BOTH_FAILED when both primary and fallback are unavailable', () => {
    const primary = mockNAVObservation({ isUsable: false, isStale: true, grossNavPerToken: null, freshnessState: 'UNUSABLE' });
    const fallback = mockNAVObservation({ isUsable: false, isStale: true, grossNavPerToken: null, freshnessState: 'UNUSABLE' });
    const result = selectValuationSource(primary, fallback, null, 70);
    expect(result.fallbackState).toBe('BOTH_FAILED');
    expect(result.observation.isUsable).toBe(false);
  });

  it('MANUAL_OVERRIDE_ACTIVE when valid override provided', () => {
    const primary = mockNAVObservation({ isUsable: false, isStale: true, freshnessState: 'UNUSABLE' });
    const override = {
      grossNavPerToken: 1.05,
      confidence: 45,
      setAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      operatorNote: 'Emergency manual override',
    };
    const result = selectValuationSource(primary, null, override, 70);
    expect(result.fallbackState).toBe('MANUAL_OVERRIDE_ACTIVE');
    expect(result.observation.isManuallyReviewed).toBe(true);
  });

  it('MANUAL_OVERRIDE_EXPIRED when override is past expiresAt', () => {
    const primary = mockNAVObservation({ isUsable: false, isStale: true, freshnessState: 'UNUSABLE' });
    const expiredOverride = {
      grossNavPerToken: 1.05,
      confidence: 45,
      setAt: new Date(Date.now() - 200_000 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 100_000 * 1000).toISOString(),
      operatorNote: 'Expired override',
    };
    const result = selectValuationSource(primary, null, expiredOverride, 70);
    expect(result.fallbackState).toBe('MANUAL_OVERRIDE_EXPIRED');
    expect(result.observation.isUsable).toBe(false);
  });
});

// ── 13. Reserve snapshot bucketing ───────────────────────────────────────────

describe('Reserve snapshot bucketing', () => {
  it('LIVE eligible asset goes into LIVE_RESERVE bucket', () => {
    const asset = mockAsset();
    const result: ValuationResult = {
      assetId: asset.id, symbol: asset.assetSymbol, grossValueUsd: 100_000,
      baseHaircutBps: 0, effectiveHaircutBps: 0, eligibleReserveValueUsd: 100_000,
      source: 'FIXED_PEG', valuationTimestamp: NOW_ISO,
      freshnessState: 'FRESH', fallbackState: 'PRIMARY_HEALTHY',
      attestationStatus: 'NONE', reconciliationStatus: 'NOT_REQUIRED',
      isStale: false, isFallback: false, isManuallyReviewed: false,
      isEligible: true, exclusionReason: null, confidenceScore: 99,
    };
    const snap = buildSnapshotAsset(asset, result);
    expect(snap.bucket).toBe('LIVE_RESERVE');
    expect(snap.eligibleValueUsd).toBe(100_000);
  });

  it('PLANNED asset goes into PLANNED bucket', () => {
    const asset = mockAsset({ status: 'PLANNED', isLive: false, isPlanned: true, sleeve: 'TOKENIZED_TBILL' });
    const result: ValuationResult = {
      assetId: asset.id, symbol: asset.assetSymbol, grossValueUsd: 1000,
      baseHaircutBps: 50, effectiveHaircutBps: 50, eligibleReserveValueUsd: 0,
      source: 'ISSUER_NAV_API', valuationTimestamp: null,
      freshnessState: 'UNUSABLE', fallbackState: 'BOTH_FAILED',
      attestationStatus: 'NONE', reconciliationStatus: 'NOT_REQUIRED',
      isStale: true, isFallback: false, isManuallyReviewed: false,
      isEligible: false, exclusionReason: 'PLANNED_ASSET', confidenceScore: 0,
    };
    const snap = buildSnapshotAsset(asset, result);
    expect(snap.bucket).toBe('PLANNED');
    expect(snap.eligibleValueUsd).toBe(0);
  });

  it('OPERATOR_TREASURY asset goes into EXCLUDED_OPERATOR bucket', () => {
    const asset = mockAsset({ sleeve: 'OPERATOR_TREASURY', status: 'INTERNAL_ONLY', isLive: false });
    const result: ValuationResult = {
      assetId: asset.id, symbol: asset.assetSymbol, grossValueUsd: 5000,
      baseHaircutBps: 0, effectiveHaircutBps: 0, eligibleReserveValueUsd: 0,
      source: 'INTERNAL_ACCOUNTING', valuationTimestamp: NOW_ISO,
      freshnessState: 'FRESH', fallbackState: 'PRIMARY_HEALTHY',
      attestationStatus: 'NONE', reconciliationStatus: 'NOT_REQUIRED',
      isStale: false, isFallback: false, isManuallyReviewed: false,
      isEligible: false, exclusionReason: 'OPERATOR_TREASURY_EXCLUDED', confidenceScore: 50,
    };
    const snap = buildSnapshotAsset(asset, result);
    expect(snap.bucket).toBe('EXCLUDED_OPERATOR');
  });

  it('assembleReserveSnapshot separates buckets correctly', () => {
    const liveAsset = mockAsset({ id: 'usdc-canonical-psm', currentBalance: 100_000, grossValueUsd: 100_000 });
    const plannedAsset = mockAsset({ id: 'thbill-theo-market-planned', status: 'PLANNED', isLive: false, isPlanned: true, sleeve: 'TOKENIZED_TBILL', currentBalance: null as any, grossValueUsd: null as any });

    const results: ValuationResult[] = [
      {
        assetId: 'usdc-canonical-psm', symbol: 'USDC', grossValueUsd: 100_000,
        baseHaircutBps: 0, effectiveHaircutBps: 0, eligibleReserveValueUsd: 100_000,
        source: 'FIXED_PEG', valuationTimestamp: NOW_ISO,
        freshnessState: 'FRESH', fallbackState: 'PRIMARY_HEALTHY',
        attestationStatus: 'NONE', reconciliationStatus: 'NOT_REQUIRED',
        isStale: false, isFallback: false, isManuallyReviewed: false,
        isEligible: true, exclusionReason: null, confidenceScore: 99,
      },
      {
        assetId: 'thbill-theo-market-planned', symbol: 'thBILL', grossValueUsd: null,
        baseHaircutBps: 50, effectiveHaircutBps: 50, eligibleReserveValueUsd: 0,
        source: 'ISSUER_NAV_API', valuationTimestamp: null,
        freshnessState: 'UNUSABLE', fallbackState: 'BOTH_FAILED',
        attestationStatus: 'NONE', reconciliationStatus: 'NOT_REQUIRED',
        isStale: true, isFallback: false, isManuallyReviewed: false,
        isEligible: false, exclusionReason: 'PLANNED_ASSET', confidenceScore: 0,
      },
    ];

    const snapshot = assembleReserveSnapshot([liveAsset, plannedAsset], results);
    expect(snapshot.liveReserveAssets.length).toBe(1);
    expect(snapshot.plannedAssets.length).toBe(1);
    expect(snapshot.totalEligibleValueUsd).toBe(100_000);
    expect(snapshot.plannedGrossValueUsd).toBe(0);
  });
});

// ── 14. ReserveManagerSummaryPhase3 extension fields ─────────────────────────

describe('ReserveManagerSummaryPhase3 extension fields', () => {
  it('staleValueUsd, manualReviewValueUsd, fallbackValuedAmountUsd are present', async () => {
    const { getReserveManagerSummary } = await import('../lib/reserves/phase2/reserveManager');
    const summary = await getReserveManagerSummary();
    expect(typeof (summary as any).staleValueUsd).toBe('number');
    expect(typeof (summary as any).manualReviewValueUsd).toBe('number');
    expect(typeof (summary as any).fallbackValuedAmountUsd).toBe('number');
  });

  it('haircutAdjustedReserveValueUsd >= 0', async () => {
    const { getReserveManagerSummary } = await import('../lib/reserves/phase2/reserveManager');
    const summary = await getReserveManagerSummary();
    expect((summary as any).haircutAdjustedReserveValueUsd).toBeGreaterThanOrEqual(0);
  });

  it('valuationResults is an array', async () => {
    const { getReserveManagerSummary } = await import('../lib/reserves/phase2/reserveManager');
    const summary = await getReserveManagerSummary();
    expect(Array.isArray((summary as any).valuationResults)).toBe(true);
  });

  it('navObservations is an object keyed by assetId', async () => {
    const { getReserveManagerSummary } = await import('../lib/reserves/phase2/reserveManager');
    const summary = await getReserveManagerSummary();
    const navObs = (summary as any).navObservations;
    expect(typeof navObs).toBe('object');
    expect(navObs['usdc-canonical-psm']).toBeDefined();
  });

  it('eligibleReserveValueUsd matches haircutAdjustedReserveValueUsd', async () => {
    const { getReserveManagerSummary } = await import('../lib/reserves/phase2/reserveManager');
    const summary = await getReserveManagerSummary();
    expect(summary.eligibleReserveValueUsd).toBe((summary as any).haircutAdjustedReserveValueUsd);
  });
});
