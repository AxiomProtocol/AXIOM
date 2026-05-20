/**
 * lib/reserves/phase2/reserveManager.ts
 *
 * Phase 2 — ReserveManager
 *
 * Aggregates the ApprovedReserveAssetRegistry and the live CanonicalPSM balance
 * to produce reserve accounting data for:
 *   - API responses (reserve-assets, reserve-sleeves, reserve-manager/*)
 *   - Operator dashboard
 *   - Future Phase 3 oracle integration
 *   - Future Phase 4 mint/redeem module
 *
 * Governance separation (must remain strict):
 *   CanonicalPSM    → live USDC mint/redeem backing source (unchanged from Phase 1)
 *   ReserveManager  → reserve accounting and asset eligibility layer (Phase 2)
 *   AxiomTreasuryVault → internal operator capital (excluded from AXUSD backing)
 *
 * Phase 2 does NOT:
 *   - Mint or burn AXUSD
 *   - Deploy new contracts to mainnet
 *   - Grant or revoke production roles
 *   - Connect live T-Bill NAV valuation (placeholder interfaces only)
 *
 * Phase 3 hooks (stubs prepared here):
 *   - fetchTbillNAV()   — placeholder, returns null
 *   - fetchOraclePrice() — placeholder, returns null
 *
 * Phase 4 hooks (stubs prepared here):
 *   - prepareMintInput()   — not implemented
 *   - prepareRedeemInput() — not implemented
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

// ── Phase 3 stub: T-Bill NAV oracle ──────────────────────────────────────────
// Replace with real oracle call in Phase 3.
async function fetchTbillNAV(_assetAddress: string): Promise<number | null> {
  return null; // Phase 3: connect to NAV oracle
}

// ── Phase 3 stub: generic oracle price ───────────────────────────────────────
async function fetchOraclePrice(_assetAddress: string): Promise<number | null> {
  return null; // Phase 3: connect to Chainlink or NAV oracle
}

// ── Phase 4 stubs: mint / redeem inputs ──────────────────────────────────────
// These prepare the interface for the future mint/redeem module.
// Do NOT implement mint or burn logic here.
export function prepareMintInput(_assetSymbol: string, _amount: number): never {
  throw new Error(
    'prepareMintInput is a Phase 4 feature. ' +
    'ReserveManager does not mint AXUSD in Phase 2.'
  );
}
export function prepareRedeemInput(_assetSymbol: string, _amount: number): never {
  throw new Error(
    'prepareRedeemInput is a Phase 4 feature. ' +
    'ReserveManager does not redeem AXUSD in Phase 2.'
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

// ── Enrich registry with live balances ───────────────────────────────────────

function enrichWithLiveBalances(
  registry: ApprovedReserveAsset[],
  live: LiveBalances,
  fetchedAt: string,
): ApprovedReserveAsset[] {
  return registry.map(asset => {
    if (asset.id === 'usdc-canonical-psm' && asset.status === 'LIVE') {
      const balance      = live.usdcInPsm;
      const grossValue   = balance * 1.0;
      const eligible     = computeEligibleValue(
        asset.assetAddress, grossValue, asset.haircutPolicy, asset.isLive, asset.sleeve
      );
      return {
        ...asset,
        currentBalance:          balance,
        grossValueUsd:           grossValue,
        eligibleReserveValueUsd: eligible,
        lastValuedAt:            fetchedAt,
        custody: {
          ...asset.custody,
          custodyWallet: CANONICAL_PSM_ADDRESS,
        },
      };
    }
    return asset;
  });
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

  const grossValueUsd            = liveAssets.reduce((s, a) => s + (a.grossValueUsd ?? 0), 0);
  const eligibleReserveValueUsd  = liveAssets.reduce((s, a) => s + a.eligibleReserveValueUsd, 0);

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

// ── Main: getReserveManagerSummary ───────────────────────────────────────────

export async function getReserveManagerSummary(): Promise<ReserveManagerSummary> {
  const fetchedAt = new Date().toISOString();
  const warnings: string[] = [];

  // 1. Fetch live on-chain balances
  const live = await fetchLiveBalances();
  if (live.usdcInPsm === 0 && live.axusdTotalSupply === 0) {
    warnings.push('Live balance fetch returned zero — RPC may be unavailable. Data may be stale.');
  }

  // 2. Enrich registry with live balances
  const rawRegistry = getApprovedReserveAssetRegistry();
  const registry    = enrichWithLiveBalances(rawRegistry, live, fetchedAt);

  // 3. Build sleeve aggregates across all known sleeves
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
  const liveAssets             = registry.filter(a => a.isLive && a.status === 'LIVE');
  const plannedAssets          = registry.filter(a => a.status === 'PLANNED');
  const operatorAssets         = registry.filter(a => a.sleeve === 'OPERATOR_TREASURY');
  const excludedAssets         = registry.filter(
    a => a.status === 'DISABLED' || a.status === 'DEPRECATED'
  );
  const internalOnlyAssets     = registry.filter(a => a.status === 'INTERNAL_ONLY');

  const totalGrossValueUsd         = registry.reduce((s, a) => s + (a.grossValueUsd ?? 0), 0);
  const liveGrossValueUsd          = liveAssets.reduce((s, a) => s + (a.grossValueUsd ?? 0), 0);
  const eligibleReserveValueUsd    = sleeves
    .filter(s => s.isEligibleForAxusdBacking)
    .reduce((s, sl) => s + sl.eligibleReserveValueUsd, 0);
  const canonicalPsmReserveUsd     = sleeves.find(s => s.sleeve === 'USDC_PSM')?.eligibleReserveValueUsd ?? 0;
  const plannedGrossValueUsd       = plannedAssets.reduce((s, a) => s + (a.grossValueUsd ?? 0), 0);
  const operatorTreasuryValueUsd   = operatorAssets.reduce((s, a) => s + (a.grossValueUsd ?? 0), 0);
  const excludedValueUsd           = excludedAssets.reduce((s, a) => s + (a.grossValueUsd ?? 0), 0);

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
    totalAssetCount:       registry.length,
    liveAssetCount:        liveAssets.length,
    plannedAssetCount:     plannedAssets.length,
    excludedAssetCount:    excludedAssets.length + internalOnlyAssets.length,
    internalOnlyAssetCount: internalOnlyAssets.length,
    coverageInputs: {
      eligibleReserveValueUsd,
      denominatorNote:
        'Coverage denominator must come from AXUSD.totalSupply() (circulating supply), ' +
        'NOT from any value in this registry. See getCanonicalReserveSnapshot.ts.',
    },
    methodology:
      'AXUSD eligible reserve value = sum of (grossValueUsd × (1 − haircutBps/10000)) ' +
      'for all LIVE assets in AXUSD-eligible sleeves (USDC_PSM, CASH_EQUIVALENT). ' +
      'PLANNED assets, OPERATOR_TREASURY assets, DISABLED, DEPRECATED, and INTERNAL_ONLY ' +
      'assets are all excluded from the eligible reserve value. ' +
      'Coverage ratio = eligibleReserveValueUsd / AXUSD.totalSupply().',
    warnings,
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
    warnings.push(
      'PLANNED T-Bill sleeve has gross value but is correctly excluded from coverage ratio.'
    );
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
      canonicalPsmUsd:       summary.canonicalPsmReserveUsd,
      plannedTbillUsd:       tbillSleeve?.grossValueUsd ?? 0,
      plannedTreasuryFundUsd: fundSleeve?.grossValueUsd ?? 0,
      operatorTreasuryUsd:   opSleeve?.grossValueUsd ?? 0,
      excludedUsd:           summary.excludedValueUsd,
    },
    warnings,
    methodology:             summary.methodology,
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
