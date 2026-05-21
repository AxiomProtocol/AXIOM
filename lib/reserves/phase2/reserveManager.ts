/**
 * lib/reserves/phase2/reserveManager.ts
 *
 * Phase 2 — ReserveManager (updated for Phase 3 oracle integration)
 *
 * Phase 3 changes:
 *   - fetchTbillNAV() and fetchOraclePrice() stubs replaced by
 *     TreasuryNAVOracleService.getNAVWithMetadata() calls
 *   - enrichWithLiveBalances() also enriches non-USDC assets with NAVObservation
 *   - ReserveManagerSummary extended with:
 *       staleValueUsd, manualReviewValueUsd, fallbackValuedAmountUsd,
 *       haircutAdjustedReserveValueUsd
 *   - All Phase 2 governance invariants remain strictly enforced
 *
 * Governance separation (unchanged from Phase 2):
 *   CanonicalPSM    → live USDC mint/redeem backing source
 *   ReserveManager  → reserve accounting and asset eligibility layer
 *   AxiomTreasuryVault → internal operator capital (excluded from AXUSD backing)
 */

import { ethers } from 'ethers';
import {
  getApprovedReserveAssetRegistry,
  getLiveReserveAssets,
  getPlannedReserveAssets,
  getOperatorTreasuryAssets,
  computeEligibleValue,
} from './approvedReserveAssetRegistry';
import {
  RESERVE_SLEEVE_LABELS,
  AXUSD_ELIGIBLE_SLEEVES,
  type ApprovedReserveAsset,
  type ReserveSleeve,
  type ReserveSleeveAggregate,
  type ReserveManagerSummary,
  type ReserveCoverageResult,
  type AttestationStatusSummary,
} from './types';
import { getTreasuryNAVOracle } from '../phase3/treasuryNAVOracle';
import { getValuationPolicy } from '../phase3/assetValuationPolicy';
import { getValuation } from '../phase3/rwaValuationAdapter';
import { selectValuationSource } from '../phase3/fallbackHierarchy';
import { assembleReserveSnapshot } from '../phase3/reserveSnapshot';
import type { NAVObservation, ValuationResult, ReserveSnapshot } from '../phase3/types';

// ── RPC / contract constants ──────────────────────────────────────────────────

const ALCHEMY_KEY   = process.env.ALCHEMY_API_KEY ?? '';
const ARBITRUM_RPC  = ALCHEMY_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const CANONICAL_PSM_ADDRESS =
  process.env.NEXT_PUBLIC_CANONICAL_PSM_ADDRESS ??
  (process.env.CANONICAL_PSM_ADDRESS ?? '');

const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const AXUSD_ADDRESS = process.env.NEXT_PUBLIC_AXUSD_ADDRESS ?? '';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
] as const;

const FETCH_TIMEOUT_MS = 12_000;

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// ── Phase 4 stubs: mint / redeem inputs ──────────────────────────────────────
export function prepareMintInput(_assetSymbol: string, _amount: number): never {
  throw new Error(
    'prepareMintInput is a Phase 4 feature. ' +
    'ReserveManager does not mint AXUSD in Phase 2/3.'
  );
}
export function prepareRedeemInput(_assetSymbol: string, _amount: number): never {
  throw new Error(
    'prepareRedeemInput is a Phase 4 feature. ' +
    'ReserveManager does not redeem AXUSD in Phase 2/3.'
  );
}

// ── Live balance fetch ────────────────────────────────────────────────────────

interface LiveBalances {
  usdcInPsm: number;
  axusdTotalSupply: number;
}

async function fetchLiveBalances(): Promise<LiveBalances> {
  if (!CANONICAL_PSM_ADDRESS || !USDC_ADDRESS || !AXUSD_ADDRESS) {
    return { usdcInPsm: 0, axusdTotalSupply: 0 };
  }

  try {
    const req = new ethers.FetchRequest(ARBITRUM_RPC);
    req.timeout = 5_000;
    const provider = new ethers.JsonRpcProvider(req);
    const usdc   = new ethers.Contract(USDC_ADDRESS,   ERC20_ABI, provider);
    const axusd  = new ethers.Contract(AXUSD_ADDRESS,  ERC20_ABI, provider);

    const [usdcRaw, supplyRaw] = await withTimeout(
      Promise.all([
        (usdc.balanceOf(CANONICAL_PSM_ADDRESS) as Promise<bigint>).catch(() => 0n),
        (axusd.totalSupply() as Promise<bigint>).catch(() => 0n),
      ]),
      FETCH_TIMEOUT_MS,
      [0n, 0n],
    );

    return {
      usdcInPsm:         Number(ethers.formatUnits(usdcRaw, 6)),
      axusdTotalSupply:  Number(ethers.formatUnits(supplyRaw, 18)),
    };
  } catch {
    return { usdcInPsm: 0, axusdTotalSupply: 0 };
  }
}

// ── Phase 3: Enrich registry with NAV observations ────────────────────────────

export async function enrichWithPhase3Valuations(
  registry: ApprovedReserveAsset[],
  live: LiveBalances,
  fetchedAt: string,
): Promise<{ enrichedAssets: ApprovedReserveAsset[]; valuationResults: ValuationResult[]; navObservations: Map<string, NAVObservation> }> {
  const oracle = getTreasuryNAVOracle();
  const navMap = new Map<string, NAVObservation>();
  const valuationResults: ValuationResult[] = [];

  // Fetch all NAV observations in parallel
  await Promise.all(
    registry.map(async asset => {
      const nav = await oracle.getNAVWithMetadata(asset.id);
      navMap.set(asset.id, nav);
    })
  );

  const enrichedAssets = registry.map(asset => {
    const nav = navMap.get(asset.id);
    if (!nav) return asset;

    // Resolve policy (required for all code paths below)
    const policy = getValuationPolicy(asset.id);

    // For USDC PSM: use live balance, fixed $1.00 peg
    if (asset.id === 'usdc-canonical-psm' && asset.status === 'LIVE') {
      const balance    = live.usdcInPsm;
      const grossValue = balance * 1.0;
      const eligible   = computeEligibleValue(
        asset.assetAddress, grossValue, asset.haircutPolicy, asset.isLive, asset.sleeve
      );
      const enriched: ApprovedReserveAsset = {
        ...asset,
        currentBalance:          balance,
        grossValueUsd:           grossValue,
        eligibleReserveValueUsd: eligible,
        lastValuedAt:            fetchedAt,
        custody: { ...asset.custody, custodyWallet: CANONICAL_PSM_ADDRESS },
      };
      if (policy) {
        // Run fallback hierarchy to determine source health and fallback state
        // (For USDC fixed peg, fallback is always null — always PRIMARY_HEALTHY)
        const selection = selectValuationSource(nav, null, null, policy.minConfidenceScore);
        const result = getValuation(enriched, policy, selection.observation, selection.fallbackState);
        valuationResults.push(result);
      }
      return enriched;
    }

    // For all other assets: run through fallback hierarchy before valuation
    if (!policy) return asset;

    // Phase 3 fallback hierarchy: for assets with a fallbackSourceId, a secondary
    // NAVObservation would be fetched here (Phase 4). For now, fallback is null
    // (all secondary oracle connections are Phase 4 work). selectValuationSource
    // will return BOTH_FAILED for PLANNED/unusable primary observations.
    const fallbackNav = null;
    const selection   = selectValuationSource(nav, fallbackNav, null, policy.minConfidenceScore);

    const result = getValuation(asset, policy, selection.observation, selection.fallbackState);
    valuationResults.push(result);

    // Return asset enriched with Phase 3 valuation data (balance remains null for planned/internal)
    return asset;
  });

  return { enrichedAssets, valuationResults, navObservations: navMap };
}

// ── Sleeve descriptors ────────────────────────────────────────────────────────

const SLEEVE_DESCRIPTIONS: Record<ReserveSleeve, string> = {
  USDC_PSM:
    'Live CanonicalPSM-backed USDC reserve sleeve. Primary AXUSD backing source. ' +
    '1:1 mint and redeem via ERC-3643 PSM.',
  TOKENIZED_TBILL:
    'Planned tokenized U.S. Treasury Bill sleeve. Assets must be LIVE and oracle-connected ' +
    'before counting toward AXUSD reserves. Phase 3 requirement.',
  TOKENIZED_TREASURY_FUND:
    'Planned tokenized Treasury fund sleeve (e.g. BlackRock BUIDL). ' +
    'Phase 3 + 4 requirement before activation.',
  TOKENIZED_GOVERNMENT_MONEY_MARKET:
    'Planned tokenized government money market fund sleeve (e.g. Ondo USDY). ' +
    'Phase 3 + 4 requirement before activation.',
  TOKENIZED_GOLD:
    'Future tokenized gold commodity sleeve (PAXG or equivalent). ' +
    'Separate from AXAU reserve instrument. Requires governance approval.',
  CASH_EQUIVALENT:
    'Live fiat or stablecoin equivalent sleeve. Currently empty — future fiat rail integration.',
  OPERATOR_TREASURY:
    'Internal AxiomTreasuryVault yield-strategy positions. ' +
    'EXCLUDED from AXUSD public reserve backing by governance invariant. ' +
    'Assets in this sleeve may NOT count toward AXUSD coverage under any circumstances.',
  OTHER_RWA:
    'Future approved real-world asset collateral sleeve. Not yet active.',
};

const SLEEVE_CAUTIONS: Partial<Record<ReserveSleeve, string>> = {
  TOKENIZED_TBILL:
    'Planned infrastructure only. No tokenized T-bills currently count as AXUSD reserves. ' +
    'Live Treasury integration is a Phase 3+ objective.',
  TOKENIZED_TREASURY_FUND:
    'Planned infrastructure only. No tokenized Treasury funds currently count as AXUSD reserves.',
  TOKENIZED_GOVERNMENT_MONEY_MARKET:
    'Planned infrastructure only. No tokenized government MMF assets currently count as AXUSD reserves.',
  TOKENIZED_GOLD:
    'Future sleeve — pending governance approval and oracle integration.',
  OPERATOR_TREASURY:
    'Internal operator capital management infrastructure. ' +
    'Not counted as AXUSD backing. Not a public investment product.',
  OTHER_RWA:
    'Future infrastructure. No RWA assets currently count as AXUSD reserves.',
};

// ── Sleeve aggregator ─────────────────────────────────────────────────────────

function aggregateSleeve(
  sleeve: ReserveSleeve,
  assets: ApprovedReserveAsset[],
): ReserveSleeveAggregate {
  const sleeveAssets = assets.filter(a => a.sleeve === sleeve);
  const isEligible   = AXUSD_ELIGIBLE_SLEEVES.includes(sleeve);

  const liveAssets     = sleeveAssets.filter(a => a.isLive && a.status === 'LIVE');
  const plannedAssets  = sleeveAssets.filter(a => a.status === 'PLANNED');
  const excludedAssets = sleeveAssets.filter(
    a => a.status === 'DISABLED' || a.status === 'DEPRECATED' || a.status === 'INTERNAL_ONLY'
  );

  const grossValueUsd           = liveAssets.reduce((s, a) => s + (a.grossValueUsd ?? 0), 0);
  const eligibleReserveValueUsd = liveAssets.reduce((s, a) => s + a.eligibleReserveValueUsd, 0);

  return {
    sleeve,
    sleeveName:               RESERVE_SLEEVE_LABELS[sleeve],
    sleeveDescription:        SLEEVE_DESCRIPTIONS[sleeve],
    isEligibleForAxusdBacking: isEligible,
    assets:                   sleeveAssets,
    grossValueUsd,
    eligibleReserveValueUsd:  isEligible ? eligibleReserveValueUsd : 0,
    liveAssetCount:           liveAssets.length,
    plannedAssetCount:        plannedAssets.length,
    excludedAssetCount:       excludedAssets.length,
    publicLabel:              RESERVE_SLEEVE_LABELS[sleeve],
    disclosureCaution:        SLEEVE_CAUTIONS[sleeve],
  };
}

// ── Extended summary type ─────────────────────────────────────────────────────

export interface ReserveManagerSummaryPhase3 extends ReserveManagerSummary {
  /** Assets with stale valuation (excluded from eligible reserve). */
  staleValueUsd: number;
  /** Assets in manual review state. */
  manualReviewValueUsd: number;
  /** Value of assets currently valued via fallback oracle. */
  fallbackValuedAmountUsd: number;
  /** Eligible reserve value after effective haircuts (same as eligibleReserveValueUsd for Phase 3). */
  haircutAdjustedReserveValueUsd: number;
  /** Phase 3 valuation results per asset. */
  valuationResults: ValuationResult[];
  /** Phase 3 NAV observations per asset (keyed by assetId). */
  navObservations: Record<string, NAVObservation>;
}

// ── Main: getReserveManagerSummary ───────────────────────────────────────────

export async function getReserveManagerSummary(): Promise<ReserveManagerSummaryPhase3> {
  const fetchedAt = new Date().toISOString();
  const warnings: string[] = [];

  // 1. Fetch live on-chain balances
  const live = await fetchLiveBalances();
  if (live.usdcInPsm === 0 && live.axusdTotalSupply === 0) {
    warnings.push('Live balance fetch returned zero — RPC may be unavailable. Data may be stale.');
  }

  // 2. Enrich registry with Phase 3 valuations
  const rawRegistry = getApprovedReserveAssetRegistry();
  const { enrichedAssets: registry, valuationResults, navObservations: navMap } =
    await enrichWithPhase3Valuations(rawRegistry, live, fetchedAt);

  // 3. Build sleeve aggregates
  const allSleeves: ReserveSleeve[] = [
    'USDC_PSM',
    'TOKENIZED_TBILL',
    'TOKENIZED_TREASURY_FUND',
    'TOKENIZED_GOVERNMENT_MONEY_MARKET',
    'TOKENIZED_GOLD',
    'CASH_EQUIVALENT',
    'OPERATOR_TREASURY',
    'OTHER_RWA',
  ];
  const sleeves = allSleeves.map(s => aggregateSleeve(s, registry));

  // 4. Compute summary values
  const liveAssets         = registry.filter(a => a.isLive && a.status === 'LIVE');
  const plannedAssets      = registry.filter(a => a.status === 'PLANNED');
  const operatorAssets     = registry.filter(a => a.sleeve === 'OPERATOR_TREASURY');
  const excludedAssets     = registry.filter(
    a => a.status === 'DISABLED' || a.status === 'DEPRECATED'
  );
  const internalOnlyAssets = registry.filter(a => a.status === 'INTERNAL_ONLY');

  const totalGrossValueUsd        = registry.reduce((s, a) => s + (a.grossValueUsd ?? 0), 0);
  const liveGrossValueUsd         = liveAssets.reduce((s, a) => s + (a.grossValueUsd ?? 0), 0);
  const eligibleReserveValueUsd   = sleeves
    .filter(s => s.isEligibleForAxusdBacking)
    .reduce((s, sl) => s + sl.eligibleReserveValueUsd, 0);
  const canonicalPsmReserveUsd    = sleeves.find(s => s.sleeve === 'USDC_PSM')?.eligibleReserveValueUsd ?? 0;
  const plannedGrossValueUsd      = plannedAssets.reduce((s, a) => s + (a.grossValueUsd ?? 0), 0);
  const operatorTreasuryValueUsd  = operatorAssets.reduce((s, a) => s + (a.grossValueUsd ?? 0), 0);
  const excludedValueUsd          = excludedAssets.reduce((s, a) => s + (a.grossValueUsd ?? 0), 0);

  // Phase 3 additional metrics
  const staleValueUsd = valuationResults
    .filter(r => r.isStale && r.exclusionReason === 'STALE_VALUATION')
    .reduce((s, r) => s + (r.grossValueUsd ?? 0), 0);
  const manualReviewValueUsd = valuationResults
    .filter(r => r.isManuallyReviewed)
    .reduce((s, r) => s + (r.grossValueUsd ?? 0), 0);
  const fallbackValuedAmountUsd = valuationResults
    .filter(r => r.isFallback)
    .reduce((s, r) => s + (r.grossValueUsd ?? 0), 0);

  // 5. Invariant warnings
  if (plannedGrossValueUsd > 0) {
    warnings.push(
      `PLANNED assets have a gross value of $${plannedGrossValueUsd.toFixed(2)} ` +
      'but are correctly excluded from eligible reserve coverage.'
    );
  }
  if (operatorTreasuryValueUsd > 0) {
    warnings.push(
      `OPERATOR_TREASURY assets have a value of $${operatorTreasuryValueUsd.toFixed(2)} ` +
      'and are excluded from AXUSD backing per governance invariant.'
    );
  }
  if (staleValueUsd > 0) {
    warnings.push(
      `$${staleValueUsd.toFixed(2)} in assets have stale valuations and are excluded.`
    );
  }

  const navObservations: Record<string, NAVObservation> = {};
  navMap.forEach((obs, id) => { navObservations[id] = obs; });

  return {
    fetchedAt,
    totalGrossValueUsd,
    liveGrossValueUsd,
    eligibleReserveValueUsd,
    canonicalPsmReserveUsd,
    plannedGrossValueUsd,
    operatorTreasuryValueUsd,
    excludedValueUsd,
    sleeves,
    totalAssetCount:         registry.length,
    liveAssetCount:          liveAssets.length,
    plannedAssetCount:       plannedAssets.length,
    excludedAssetCount:      excludedAssets.length + internalOnlyAssets.length,
    internalOnlyAssetCount:  internalOnlyAssets.length,
    coverageInputs: {
      eligibleReserveValueUsd,
      denominatorNote:
        'Coverage denominator must come from AXUSD.totalSupply() (circulating supply), ' +
        'NOT from any value in this registry.',
    },
    methodology:
      'AXUSD eligible reserve value = sum of (grossValueUsd × (1 − effectiveHaircutBps/10000)) ' +
      'for all LIVE assets in AXUSD-eligible sleeves (USDC_PSM, CASH_EQUIVALENT). ' +
      'PLANNED, OPERATOR_TREASURY, DISABLED, DEPRECATED, and INTERNAL_ONLY assets excluded. ' +
      'Phase 3: effective haircut expanded on stale or fallback valuations per ValuationPolicy. ' +
      'Coverage ratio = eligibleReserveValueUsd / AXUSD.totalSupply().',
    warnings,
    // Phase 3 extensions
    staleValueUsd,
    manualReviewValueUsd,
    fallbackValuedAmountUsd,
    haircutAdjustedReserveValueUsd: eligibleReserveValueUsd,
    valuationResults,
    navObservations,
  };
}

// ── getReserveCoverage ────────────────────────────────────────────────────────

export async function getReserveCoverage(): Promise<ReserveCoverageResult> {
  const fetchedAt = new Date().toISOString();
  const warnings: string[] = [];

  const [summary, live] = await Promise.all([
    getReserveManagerSummary(),
    fetchLiveBalances(),
  ]);

  const supply   = live.axusdTotalSupply > 0 ? live.axusdTotalSupply : null;
  const eligible = summary.eligibleReserveValueUsd;
  const ratio    = supply && supply > 0 ? eligible / supply : null;

  const tbillSleeve = summary.sleeves.find(s => s.sleeve === 'TOKENIZED_TBILL');
  const fundSleeve  = summary.sleeves.find(s => s.sleeve === 'TOKENIZED_TREASURY_FUND');
  const opSleeve    = summary.sleeves.find(s => s.sleeve === 'OPERATOR_TREASURY');

  if (tbillSleeve && tbillSleeve.grossValueUsd > 0) {
    warnings.push('PLANNED T-Bill sleeve has gross value but is correctly excluded from coverage ratio.');
  }
  if (!supply) {
    warnings.push('AXUSD circulating supply is zero or unavailable — coverage ratio is null.');
  }
  warnings.push(...summary.warnings);

  return {
    fetchedAt,
    eligibleReserveValueUsd: eligible,
    axusdCirculatingSupply:  supply,
    coverageRatio:           ratio,
    coverageRatioFormatted:  ratio !== null ? `${(ratio * 100).toFixed(2)}%` : 'N/A',
    breakdown: {
      canonicalPsmUsd:        summary.canonicalPsmReserveUsd,
      plannedTbillUsd:        tbillSleeve?.grossValueUsd ?? 0,
      plannedTreasuryFundUsd: fundSleeve?.grossValueUsd ?? 0,
      operatorTreasuryUsd:    opSleeve?.grossValueUsd ?? 0,
      excludedUsd:            summary.excludedValueUsd,
    },
    warnings,
    methodology: summary.methodology,
  };
}

// ── getAttestationStatusSummary ───────────────────────────────────────────────

export async function getAttestationStatusSummary(): Promise<AttestationStatusSummary> {
  const fetchedAt = new Date().toISOString();
  const registry  = getApprovedReserveAssetRegistry();

  const entries = registry.map(a => ({
    assetSymbol:                  a.assetSymbol,
    sleeve:                       a.sleeve,
    status:                       a.status,
    attestationStatus:            a.custody.attestationStatus,
    reconciliationStatus:         a.custody.reconciliationStatus,
    attestationTimestamp:         a.custody.attestationTimestamp ?? null,
    lastReconciliationTimestamp:  a.custody.lastReconciliationTimestamp ?? null,
    custodyVenue:                 a.custody.custodyVenue,
    notes: a.isLive
      ? `LIVE — ${a.custody.custodyVenue}`
      : a.isPlanned
        ? `PLANNED — attestation infrastructure not yet deployed`
        : `INTERNAL_ONLY — no public attestation`,
  }));

  const summary = entries.reduce(
    (acc, e) => {
      const key = e.attestationStatus.toLowerCase().replace('_', '') as keyof typeof acc;
      const mapped: Record<string, keyof typeof acc> = {
        none: 'none', pending: 'pending', current: 'current',
        stale: 'stale', failed: 'failed', manualreview: 'manualReview',
      };
      const k = mapped[key];
      if (k) acc[k]++;
      return acc;
    },
    { current: 0, pending: 0, stale: 0, failed: 0, manualReview: 0, none: 0 }
  );

  return { fetchedAt, assets: entries, summary };
}

// ── getReserveSnapshot (Phase 3) ──────────────────────────────────────────────

export async function getReserveSnapshotPhase3(): Promise<ReserveSnapshot> {
  const live = await fetchLiveBalances();
  const rawRegistry = getApprovedReserveAssetRegistry();
  const fetchedAt = new Date().toISOString();

  const { enrichedAssets: registry, valuationResults } =
    await enrichWithPhase3Valuations(rawRegistry, live, fetchedAt);

  return assembleReserveSnapshot(registry, valuationResults);
}
