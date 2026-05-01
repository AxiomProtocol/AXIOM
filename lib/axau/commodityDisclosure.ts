/**
 * AXAU Phase 2C — Commodity Disclosure Aggregator
 *
 * Read-only aggregator that combines reserve, NAV, oracle, liquidity,
 * mint/redeem, and solvency-snapshot health into a single disclosure surface.
 *
 * Data sources (NO new external services, NO internal HTTP):
 *   - getAXAUSystemState()       — on-chain NAVEngine, controller, oracle
 *   - getAXAULiquidityState()    — Phase 2B liquidity engine (read-only)
 *   - getXauOraclePolicyState()  — oracle freshness with policy threshold
 *   - getVaultBuffer()           — PAXG/AXAU operational buffer
 *   - neon (PostgreSQL)          — solvency_snapshots freshness
 *
 * Constraints (per Phase 2C spec):
 *   • No swaps, no contract writes, no banking-rail imports.
 *   • No ACH / wires / fiat redemption.
 *   • Returns deterministic JSON for both /api/axau/commodity-disclosure
 *     (public) and the operator-facing /axau-disclosure page.
 */

import { neon } from '@neondatabase/serverless';
import {
  getAXAUSystemState,
  type AXAUSystemState,
} from '../services/AXAUContractService';
import {
  getXauOraclePolicyState,
  getVaultBuffer,
  type VaultBufferState,
} from '../services/AXAUFulfillmentService';
import {
  getAXAULiquidityState,
  type AXAULiquidityState,
} from './liquidityEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskLabel = 'HEALTHY' | 'WATCH' | 'DEGRADED' | 'CRITICAL';

export interface SectionStatus {
  label: RiskLabel;
  notes: string[];
}

export interface BackingReserveSection extends SectionStatus {
  totalSupply:              string | null;
  backingNavPerToken:       string | null;
  totalBackingUsd:          string | null;
  coverageRatioBps:         number | null;
  coverageRatioPct:         string | null;
  isSolvent:                boolean | null;
  goldReserveAsset:         string | null;
  goldTotalUnits:           string | null;
  goldValueUsd:             string | null;
  paxgBufferBalance:        string | null;
  paxgBufferCapacity:       'SUFFICIENT' | 'PARTIAL' | 'DEPLETED' | null;
  pendingPaxgRequired:      string | null;
}

export interface NavEngineSection extends SectionStatus {
  navEngineDegraded:        boolean | null;
  navEngineDegradedReason:  string | null;
  mintNavPerToken:          string | null;
  backingNavPerToken:       string | null;
}

export interface OracleSection extends SectionStatus {
  isStale:           boolean | null;
  ageSec:            number | null;
  maxStalenessSec:   number | null;
  thresholdSource:   'env' | 'default' | null;
  lastUpdatedAtIso:  string | null;
  priceUsd:          number | null;
}

export interface LiquiditySection extends SectionStatus {
  axauPriceUsd:        number | null;
  goldPriceUsd:        number | null;
  priceDeviationBps:   number | null;
  arbitrageOpportunity: boolean | null;
  arbitrageDirection:  'MINT' | 'REDEEM' | 'NONE' | null;
  liquidityHealth:     'HEALTHY' | 'THIN' | 'CRITICAL' | null;
  simulationOnly:      true;
  slippageMode:        'not_modeled';
  depthMode:           'not_modeled';
}

export interface MintRedeemSection extends SectionStatus {
  mintPaused:    boolean | null;
  redeemPaused:  boolean | null;
  mintFeeBps:    number | null;
  redeemFeeBps:  number | null;
  totalMinted:   string | null;
  totalRedeemed: string | null;
}

export interface SolvencySnapshotSection extends SectionStatus {
  latestSnapshotAt:        string | null;
  latestSnapshotAgeMinutes: number | null;
  maxAgeMinutes:           number;
  latestChecksum:          string | null;
  totalSnapshots72h:       number;
}

export interface CommodityDisclosure {
  schemaVersion: 'axau-commodity-disclosure-v1';
  generatedAt:   string;
  overall:       SectionStatus;
  sections: {
    backingReserve:    BackingReserveSection;
    navEngine:         NavEngineSection;
    oracle:            OracleSection;
    liquidity:         LiquiditySection;
    mintRedeem:        MintRedeemSection;
    solvencySnapshot:  SolvencySnapshotSection;
  };
  knownLimitations: string[];
  deferredRails: {
    headline: string;
    items:    string[];
  };
  disclaimers: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SNAPSHOT_FRESH_MIN     = 20;   // matches Phase 2A
const SNAPSHOT_WATCH_MIN     = 60;
const SNAPSHOT_DEGRADED_MIN  = 180;
const COVERAGE_HEALTHY_BPS   = 10_500;  // 105%
const COVERAGE_DEGRADED_BPS  = 10_000;  // 100%
const ORACLE_WATCH_RATIO     = 0.5;
const ORACLE_DEGRADED_RATIO  = 0.8;

const RISK_RANK: Record<RiskLabel, number> = {
  HEALTHY:  0,
  WATCH:    1,
  DEGRADED: 2,
  CRITICAL: 3,
};

function worst(labels: RiskLabel[]): RiskLabel {
  return labels.reduce<RiskLabel>(
    (acc, l) => (RISK_RANK[l] > RISK_RANK[acc] ? l : acc),
    'HEALTHY',
  );
}

// ─── Section builders ────────────────────────────────────────────────────────

function buildBackingReserve(
  state: AXAUSystemState | null,
  buffer: VaultBufferState | null,
  systemErr: string | null,
  bufferErr: string | null,
): BackingReserveSection {
  const notes: string[] = [];

  if (!state || systemErr) {
    notes.push(systemErr
      ? `Cannot read AXAU system state: ${systemErr}`
      : 'AXAU system state unavailable.');
    return {
      label: 'CRITICAL',
      notes,
      totalSupply: null,
      backingNavPerToken: null,
      totalBackingUsd: null,
      coverageRatioBps: null,
      coverageRatioPct: null,
      isSolvent: null,
      goldReserveAsset: null,
      goldTotalUnits: null,
      goldValueUsd: null,
      paxgBufferBalance: null,
      paxgBufferCapacity: null,
      pendingPaxgRequired: null,
    };
  }

  let label: RiskLabel = 'HEALTHY';

  if (state.navEngineDegraded) {
    label = 'CRITICAL';
    notes.push('NAVEngine degraded — backing figures cannot be trusted.');
  } else if (!state.isSolvent || state.coverageRatioBps < COVERAGE_DEGRADED_BPS) {
    label = 'CRITICAL';
    notes.push(`Coverage ratio ${state.coverageRatioBps} bps is below 100% — protocol is undercollateralized.`);
  } else if (state.coverageRatioBps < COVERAGE_HEALTHY_BPS) {
    label = 'DEGRADED';
    notes.push(`Coverage ratio ${state.coverageRatioBps} bps is below the 105% target.`);
  }

  if (state.goldFrozen) {
    label = worst([label, 'DEGRADED']);
    notes.push('Gold vault is FROZEN — gold reserve is not currently spendable.');
  }

  // Buffer signal layered onto the same section since it backs mint flow
  if (bufferErr || !buffer) {
    label = worst([label, 'WATCH']);
    notes.push(bufferErr
      ? `Cannot read PAXG/AXAU buffer: ${bufferErr}`
      : 'PAXG/AXAU buffer unavailable.');
  } else {
    if (buffer.bufferCapacity === 'DEPLETED') {
      label = worst([label, 'CRITICAL']);
      notes.push('Operational buffer DEPLETED — no PAXG or AXAU available to fulfil pending demand.');
    } else if (buffer.bufferCapacity === 'PARTIAL') {
      label = worst([label, 'WATCH']);
      notes.push('Operational buffer PARTIAL — some pending mints may queue until refill.');
    }
  }

  return {
    label,
    notes,
    totalSupply:          state.totalSupplyFormatted,
    backingNavPerToken:   state.backingNavPerToken,
    totalBackingUsd:      state.totalBackingUsdFormatted,
    coverageRatioBps:     state.coverageRatioBps,
    coverageRatioPct:     state.coverageRatioPct,
    isSolvent:            state.isSolvent,
    goldReserveAsset:     state.goldReserveAsset,
    goldTotalUnits:       state.goldTotalUnits,
    goldValueUsd:         state.goldValueUsd,
    paxgBufferBalance:    buffer?.paxgBalanceFormatted ?? null,
    paxgBufferCapacity:   buffer?.bufferCapacity ?? null,
    pendingPaxgRequired:  buffer?.pendingPaxgRequired ?? null,
  };
}

function buildNavEngine(
  state: AXAUSystemState | null,
  systemErr: string | null,
): NavEngineSection {
  const notes: string[] = [];

  if (!state || systemErr) {
    notes.push(systemErr
      ? `NAVEngine unreadable: ${systemErr}`
      : 'NAVEngine state unavailable.');
    return {
      label: 'CRITICAL',
      notes,
      navEngineDegraded: null,
      navEngineDegradedReason: null,
      mintNavPerToken: null,
      backingNavPerToken: null,
    };
  }

  let label: RiskLabel = 'HEALTHY';
  if (state.navEngineDegraded) {
    label = 'CRITICAL';
    notes.push(state.navEngineDegradedReason
      ? `NAVEngine degraded: ${state.navEngineDegradedReason}`
      : 'NAVEngine degraded — on-chain reads failing.');
  } else {
    notes.push('NAVEngine reads succeeded; backing and mint NAV are live.');
  }

  return {
    label,
    notes,
    navEngineDegraded:       state.navEngineDegraded,
    navEngineDegradedReason: state.navEngineDegradedReason,
    mintNavPerToken:         state.mintNavPerToken,
    backingNavPerToken:      state.backingNavPerToken,
  };
}

function buildOracle(
  oracle: Awaited<ReturnType<typeof getXauOraclePolicyState>> | null,
  oracleErr: string | null,
): OracleSection {
  const notes: string[] = [];

  if (!oracle || oracleErr) {
    notes.push(oracleErr
      ? `Cannot read XAU/USD oracle: ${oracleErr}`
      : 'XAU/USD oracle unavailable.');
    return {
      label: 'CRITICAL',
      notes,
      isStale: null,
      ageSec: null,
      maxStalenessSec: null,
      thresholdSource: null,
      lastUpdatedAtIso: null,
      priceUsd: null,
    };
  }

  let label: RiskLabel = 'HEALTHY';
  if (oracle.isStale) {
    label = 'CRITICAL';
    notes.push(`XAU/USD oracle STALE — ${oracle.ageSec}s old, max ${oracle.policy.maxStalenessSec}s.`);
  } else if (oracle.ageSec >= 0 && oracle.policy.maxStalenessSec > 0) {
    const ratio = oracle.ageSec / oracle.policy.maxStalenessSec;
    if (ratio >= ORACLE_DEGRADED_RATIO) {
      label = 'DEGRADED';
      notes.push(`Oracle age ${oracle.ageSec}s is at ${(ratio * 100).toFixed(0)}% of staleness budget.`);
    } else if (ratio >= ORACLE_WATCH_RATIO) {
      label = 'WATCH';
      notes.push(`Oracle age ${oracle.ageSec}s is at ${(ratio * 100).toFixed(0)}% of staleness budget.`);
    } else {
      notes.push(`Oracle fresh (${oracle.ageSec}s old, threshold ${oracle.policy.maxStalenessSec}s).`);
    }
  }

  return {
    label,
    notes,
    isStale:          oracle.isStale,
    ageSec:           oracle.ageSec,
    maxStalenessSec:  oracle.policy.maxStalenessSec,
    thresholdSource:  oracle.policy.source,
    lastUpdatedAtIso: oracle.lastUpdatedAt > 0
      ? new Date(oracle.lastUpdatedAt * 1000).toISOString()
      : null,
    priceUsd:         oracle.priceUsd,
  };
}

function buildLiquidity(
  liq: AXAULiquidityState | null,
  liqErr: string | null,
): LiquiditySection {
  const notes: string[] = [];

  if (!liq || liqErr) {
    notes.push(liqErr
      ? `Liquidity engine error: ${liqErr}`
      : 'Liquidity engine unavailable.');
    return {
      label: 'CRITICAL',
      notes,
      axauPriceUsd: null,
      goldPriceUsd: null,
      priceDeviationBps: null,
      arbitrageOpportunity: null,
      arbitrageDirection: null,
      liquidityHealth: null,
      simulationOnly: true,
      slippageMode: 'not_modeled',
      depthMode: 'not_modeled',
    };
  }

  // Map Phase 2B health → Phase 2C 4-tier label.
  // THIN is the most ambiguous: route is still runnable but spread is non-trivial,
  // so map THIN → WATCH unless additional flags warrant DEGRADED.
  let label: RiskLabel;
  if (liq.liquidityHealth === 'CRITICAL')      label = 'CRITICAL';
  else if (liq.liquidityHealth === 'THIN')     label = 'WATCH';
  else                                          label = 'HEALTHY';

  if (liq.arbitrageOpportunity && label === 'WATCH') {
    label = 'DEGRADED';
    notes.push(`Arbitrage opportunity present (deviation ${liq.priceDeviationBps} bps, action ${liq.arbitrageDirection}).`);
  } else if (liq.arbitrageOpportunity) {
    notes.push(`Arbitrage opportunity present (deviation ${liq.priceDeviationBps} bps, action ${liq.arbitrageDirection}).`);
  }

  for (const n of liq.notes) notes.push(n);

  return {
    label,
    notes,
    axauPriceUsd:         liq.axauPriceUsd,
    goldPriceUsd:         liq.goldPriceUsd,
    priceDeviationBps:    liq.priceDeviationBps,
    arbitrageOpportunity: liq.arbitrageOpportunity,
    arbitrageDirection:   liq.arbitrageDirection,
    liquidityHealth:      liq.liquidityHealth,
    simulationOnly:       true,
    slippageMode:         'not_modeled',
    depthMode:            'not_modeled',
  };
}

function buildMintRedeem(
  state: AXAUSystemState | null,
  systemErr: string | null,
): MintRedeemSection {
  const notes: string[] = [];

  if (!state || systemErr) {
    notes.push(systemErr
      ? `Cannot read mint/redeem state: ${systemErr}`
      : 'Mint/redeem state unavailable.');
    return {
      label: 'CRITICAL',
      notes,
      mintPaused: null,
      redeemPaused: null,
      mintFeeBps: null,
      redeemFeeBps: null,
      totalMinted: null,
      totalRedeemed: null,
    };
  }

  let label: RiskLabel = 'HEALTHY';
  if (state.mintPaused && state.redeemPaused) {
    label = 'CRITICAL';
    notes.push('BOTH mint and redeem are PAUSED — no user issuance or redemption available.');
  } else if (state.mintPaused) {
    label = 'DEGRADED';
    notes.push('Mint is PAUSED — new AXAU issuance is suspended; redeem still available.');
  } else if (state.redeemPaused) {
    label = 'DEGRADED';
    notes.push('Redeem is PAUSED — AXAU holders cannot currently redeem; mint still available.');
  } else {
    notes.push('Mint and redeem are both LIVE.');
  }

  return {
    label,
    notes,
    mintPaused:    state.mintPaused,
    redeemPaused:  state.redeemPaused,
    mintFeeBps:    state.mintFeeBps,
    redeemFeeBps:  state.redeemFeeBps,
    totalMinted:   state.totalMinted,
    totalRedeemed: state.totalRedeemed,
  };
}

async function buildSolvencySnapshot(): Promise<SolvencySnapshotSection> {
  const notes: string[] = [];
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    notes.push('DATABASE_URL not configured — cannot read solvency snapshot history.');
    return {
      label: 'CRITICAL',
      notes,
      latestSnapshotAt: null,
      latestSnapshotAgeMinutes: null,
      maxAgeMinutes: SNAPSHOT_FRESH_MIN,
      latestChecksum: null,
      totalSnapshots72h: 0,
    };
  }

  try {
    const sql = neon(dbUrl);
    const rows = (await sql`
      SELECT
        id,
        EXTRACT(EPOCH FROM as_of_utc)::bigint  AS epoch_sec,
        checksum,
        EXTRACT(EPOCH FROM created_at)::bigint AS created_epoch
      FROM solvency_snapshots
      WHERE created_at > NOW() - INTERVAL '72 hours'
      ORDER BY created_at DESC
    `) as Array<{
      id: string;
      epoch_sec: number | string | null;
      checksum: string | null;
      created_epoch: number | string;
    }>;

    const latest = rows[0] ?? null;
    const epochSec = latest ? Number(latest.epoch_sec ?? latest.created_epoch) : null;
    const latestAt = epochSec ? new Date(epochSec * 1000) : null;
    const ageMin = latestAt ? (Date.now() - latestAt.getTime()) / 60_000 : null;

    let label: RiskLabel = 'HEALTHY';
    if (rows.length === 0 || ageMin === null) {
      label = 'CRITICAL';
      notes.push('No solvency snapshots in the last 72 hours.');
    } else if (ageMin > SNAPSHOT_DEGRADED_MIN) {
      label = 'CRITICAL';
      notes.push(`Latest snapshot is ${ageMin.toFixed(1)} min old (>${SNAPSHOT_DEGRADED_MIN} min).`);
    } else if (ageMin > SNAPSHOT_WATCH_MIN) {
      label = 'DEGRADED';
      notes.push(`Latest snapshot is ${ageMin.toFixed(1)} min old (>${SNAPSHOT_WATCH_MIN} min).`);
    } else if (ageMin > SNAPSHOT_FRESH_MIN) {
      label = 'WATCH';
      notes.push(`Latest snapshot is ${ageMin.toFixed(1)} min old (>${SNAPSHOT_FRESH_MIN} min target).`);
    } else {
      notes.push(`Latest snapshot is ${ageMin.toFixed(1)} min old (within ${SNAPSHOT_FRESH_MIN} min target).`);
    }

    return {
      label,
      notes,
      latestSnapshotAt:         latestAt ? latestAt.toISOString() : null,
      latestSnapshotAgeMinutes: ageMin !== null ? Math.round(ageMin * 10) / 10 : null,
      maxAgeMinutes:            SNAPSHOT_FRESH_MIN,
      latestChecksum:           latest?.checksum ?? null,
      totalSnapshots72h:        rows.length,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      label: 'CRITICAL',
      notes: [`Solvency snapshot query failed: ${msg}`],
      latestSnapshotAt: null,
      latestSnapshotAgeMinutes: null,
      maxAgeMinutes: SNAPSHOT_FRESH_MIN,
      latestChecksum: null,
      totalSnapshots72h: 0,
    };
  }
}

// ─── Public aggregator ───────────────────────────────────────────────────────

export async function getCommodityDisclosure(): Promise<CommodityDisclosure> {
  // Run all reads in parallel; convert rejections into per-section error notes
  // so one bad subsystem cannot blank the whole disclosure.
  const settled = await Promise.allSettled([
    getAXAUSystemState(),
    getXauOraclePolicyState(),
    getVaultBuffer(),
    getAXAULiquidityState(),
  ]);

  const [systemRes, oracleRes, bufferRes, liqRes] = settled;

  const state     = systemRes.status === 'fulfilled' ? systemRes.value : null;
  const oracle    = oracleRes.status === 'fulfilled' ? oracleRes.value : null;
  const buffer    = bufferRes.status === 'fulfilled' ? bufferRes.value : null;
  const liquidity = liqRes.status    === 'fulfilled' ? liqRes.value    : null;

  const systemErr = systemRes.status === 'rejected' ? errMsg(systemRes.reason) : null;
  const oracleErr = oracleRes.status === 'rejected' ? errMsg(oracleRes.reason) : null;
  const bufferErr = bufferRes.status === 'rejected' ? errMsg(bufferRes.reason) : null;
  const liqErr    = liqRes.status    === 'rejected' ? errMsg(liqRes.reason)    : null;

  const sections = {
    backingReserve:   buildBackingReserve(state, buffer, systemErr, bufferErr),
    navEngine:        buildNavEngine(state, systemErr),
    oracle:           buildOracle(oracle, oracleErr),
    liquidity:        buildLiquidity(liquidity, liqErr),
    mintRedeem:       buildMintRedeem(state, systemErr),
    solvencySnapshot: await buildSolvencySnapshot(),
  };

  const overallLabel = worst([
    sections.backingReserve.label,
    sections.navEngine.label,
    sections.oracle.label,
    sections.liquidity.label,
    sections.mintRedeem.label,
    sections.solvencySnapshot.label,
  ]);

  const overallNotes: string[] = [];
  for (const [k, v] of Object.entries(sections)) {
    if (v.label !== 'HEALTHY') overallNotes.push(`${k}: ${v.label}`);
  }
  if (overallNotes.length === 0) overallNotes.push('All AXAU subsystems HEALTHY.');

  return {
    schemaVersion: 'axau-commodity-disclosure-v1',
    generatedAt:   new Date().toISOString(),
    overall: { label: overallLabel, notes: overallNotes },
    sections,
    knownLimitations: [
      'Liquidity route outputs are simulations only. Slippage and pool depth are not modeled.',
      'PAXG buffer reflects deployer wallet balance — not a separately custodied reserve account.',
      'Coverage ratio derives from on-chain NAVEngine reads; if NAVEngine reverts, this disclosure flags CRITICAL rather than guessing.',
      'Solvency snapshot freshness depends on the off-chain cron writing into solvency_snapshots; a stalled cron will surface as DEGRADED/CRITICAL here.',
      'Oracle staleness threshold is enforced from ORACLE_STALE_THRESHOLD_SECONDS (or default); a CRITICAL oracle disables the implied price reading.',
    ],
    deferredRails: {
      headline: 'Rails NOT in scope for the AXAU launch:',
      items: [
        'ACH transfers',
        'Wire transfers',
        'Virtual bank accounts',
        'Direct deposit',
        'Rent collection',
        'Payroll',
        'Fiat redemption / bank payout (redemption returns PAXG, not USD)',
      ],
    },
    disclaimers: [
      'AXAU is a crypto-native instrument. There is no ACH, wire, or virtual-bank-account redemption path. Stripe and Coinbase Onramp support card-to-crypto fiat entry only.',
      'Redemption returns PAXG (paxos-gold), not USD. Holders convert PAXG to fiat through a third-party venue at their own risk.',
      'ACH, wires, and fiat redemption are deferred and are not part of the current AXAU launch scope.',
      'Liquidity route outputs surfaced here are SIMULATIONS, not executable swap quotes. Slippage and on-chain pool depth are not modeled.',
      'Mint and redeem availability depends on oracle freshness and reserve buffer state. A stale XAU/USD oracle or a depleted PAXG buffer can pause issuance even when contracts are otherwise live.',
    ],
  };
}

function errMsg(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  return String(reason);
}
