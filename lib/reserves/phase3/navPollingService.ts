/**
 * lib/reserves/phase3/navPollingService.ts
 *
 * Phase 4 — NAV observation polling orchestrator.
 *
 * Coordinates all oracle feed fetchers and writes results to the cache.
 * Can be triggered:
 *   - Manually via POST /api/axusd/oracles/refresh
 *   - On Next.js server startup (via pages/api/axusd/oracles/refresh hot-start)
 *   - Via Vercel Cron Job (cron.json) on schedule
 *
 * Polling intervals:
 *   PAXG (Chainlink):   every 5 min — guarded by cache TTL
 *   T-Bill / BUIDL / USDY:  every 60 min
 *
 * Each poll writes a NAVObservation to navObservationCache. If a fetch fails,
 * the stale cache entry is retained so the oracle can report STALE instead of UNUSABLE.
 */

import type { NAVObservation } from './types';
import { setObservationCache, isCacheEntryFresh } from './navObservationCache';
import { fetchChainlinkXauUsd } from './feeds/chainlinkXauUsd';
import { fetchBitGoAttestation, mapAttestationToValuationStatus } from './feeds/bitgoAttestationFetcher';
import { fetchIssuerNav } from './feeds/issuerNavFetcher';
import { computeFreshnessState, computeConfidenceScore } from './valuationConfidence';

export interface PollResult {
  assetId: string;
  success: boolean;
  source: string;
  nav: number | null;
  confidenceScore: number;
  fetchedAt: string;
  error?: string;
}

export interface PollSummary {
  startedAt: string;
  completedAt: string;
  durationMs: number;
  results: PollResult[];
  successCount: number;
  failureCount: number;
}

// ── PAXG — Chainlink XAU/USD + BitGo attestation ──────────────────────────────

async function pollPaxg(): Promise<PollResult> {
  const assetId = 'paxg-tokenized-gold-planned';
  const fetchedAt = new Date().toISOString();

  const [chainlinkData, attestation] = await Promise.allSettled([
    fetchChainlinkXauUsd(),
    fetchBitGoAttestation(),
  ]);

  const round = chainlinkData.status === 'fulfilled' ? chainlinkData.value : null;
  const attest = attestation.status === 'fulfilled' ? attestation.value : null;

  if (!round) {
    return {
      assetId,
      success: false,
      source: 'CHAINLINK_XAU_USD',
      nav: null,
      confidenceScore: 0,
      fetchedAt,
      error: chainlinkData.status === 'rejected'
        ? String((chainlinkData as PromiseRejectedResult).reason)
        : 'Chainlink fetch returned null',
    };
  }

  const attestationStatus = attest
    ? mapAttestationToValuationStatus(attest)
    : 'NONE';

  // Determine freshness based on Chainlink round age
  const paxgMaxStaleness = 3600; // 1hr per policy
  const freshnessState = computeFreshnessState(round.updatedAt.toISOString(), paxgMaxStaleness);
  const isStale = freshnessState === 'STALE' || freshnessState === 'EXPIRED' || freshnessState === 'MANUAL_REVIEW_REQUIRED';

  const confidenceScore = computeConfidenceScore({
    sourceType: 'CHAINLINK',
    freshnessState,
    attestationStatus,
    reconciliationStatus: 'CURRENT',
    isFallback: false,
    isManuallyReviewed: false,
    isAssetLive: true, // LIVE — Phase 4 admitted TOKENIZED_GOLD sleeve
    attestationRequired: true,
  });

  const observation: NAVObservation = {
    assetId,
    assetAddress: '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429',
    chainId: 42161,
    symbol: 'PAXG',
    grossNavPerToken: round.price,
    quoteCurrency: 'USD',
    decimals: 18,
    timestamp: round.updatedAt.toISOString(),
    sourceName: 'Chainlink XAU/USD (Arbitrum One)',
    sourceType: 'CHAINLINK',
    sourceUrl: 'https://data.chain.link/arbitrum/mainnet/commodities/xau-usd',
    confidenceScore,
    freshnessState,
    // Propagate live BitGo attestation result so rwaValuationAdapter gates on
    // the dynamic on-chain result, not the static registry custody field.
    liveAttestationStatus: attestationStatus,
    isStale,
    isFallback: false,
    isManuallyReviewed: false,
    isUsable: !isStale,
    unusableReason: isStale
      ? `Chainlink round stale (updated ${round.updatedAt.toISOString()})`
      : null,
  };

  setObservationCache(assetId, observation);

  return {
    assetId,
    success: true,
    source: 'CHAINLINK_XAU_USD',
    nav: round.price,
    confidenceScore,
    fetchedAt,
  };
}

// ── Issuer NAV assets ──────────────────────────────────────────────────────────

const ISSUER_ASSETS: Array<{
  assetId: string;
  symbol: string;
  assetAddress: string;
  decimals: number;
  chainId: number;   // per-asset chain — do NOT default all to 42161
  sourceName: string;
  maxStalenessSeconds: number;
}> = [
  {
    assetId: 'thbill-theo-market-planned',
    symbol: 'thBILL',
    assetAddress: '0x0000000000000000000000000000000000000001',
    chainId: 42161, // Arbitrum One (placeholder until Theo Market deploys)
    decimals: 18,
    sourceName: 'Theo Market Issuer NAV API',
    maxStalenessSeconds: 86400,
  },
  {
    assetId: 'buidl-tokenized-treasury-planned',
    symbol: 'BUIDL',
    assetAddress: '0x7712c34205737192402172409a8F7ccef8aA2AEc',
    chainId: 1,     // Ethereum mainnet — BUIDL ERC-4626 is NOT on Arbitrum
    decimals: 6,
    sourceName: 'BlackRock BUIDL Issuer NAV / On-Chain',
    maxStalenessSeconds: 86400,
  },
  {
    assetId: 'ondo-usdy-tokenized-govmmf-planned',
    symbol: 'USDY',
    assetAddress: '0x35e050d3C0eC2d29D269a8EcEa763a183bDF9A9D',
    chainId: 42161, // Arbitrum One
    decimals: 18,
    sourceName: 'Ondo USDY Issuer NAV API',
    maxStalenessSeconds: 86400,
  },
];

async function pollIssuerAsset(config: typeof ISSUER_ASSETS[number]): Promise<PollResult> {
  const fetchedAt = new Date().toISOString();
  const result = await fetchIssuerNav(config.assetId);

  if (!result) {
    return {
      assetId: config.assetId,
      success: false,
      source: 'ISSUER_NAV_API',
      nav: null,
      confidenceScore: 0,
      fetchedAt,
      error: 'Issuer NAV API and on-chain fallback both failed',
    };
  }

  const sourceType = result.source === 'ISSUER_API'
    ? 'ISSUER_NAV_API' as const
    : 'ERC4626_CONVERT_TO_ASSETS' as const;

  const freshnessState = computeFreshnessState(result.fetchedAt, config.maxStalenessSeconds);
  const isStale = freshnessState === 'STALE' || freshnessState === 'EXPIRED' || freshnessState === 'MANUAL_REVIEW_REQUIRED';

  const confidenceScore = computeConfidenceScore({
    sourceType,
    freshnessState,
    attestationStatus: 'PENDING', // Issuer API data is pending operator review
    reconciliationStatus: 'CURRENT',
    isFallback: result.isFallback,
    isManuallyReviewed: false,
    isAssetLive: false, // PLANNED
    attestationRequired: true,
  });

  const observation: NAVObservation = {
    assetId: config.assetId,
    assetAddress: config.assetAddress,
    chainId: config.chainId, // per-asset chain (BUIDL=1, others=42161)
    symbol: config.symbol,
    grossNavPerToken: result.nav,
    quoteCurrency: 'USD',
    decimals: config.decimals,
    timestamp: result.fetchedAt,
    sourceName: config.sourceName,
    sourceType,
    sourceUrl: null,
    confidenceScore,
    freshnessState,
    isStale,
    isFallback: result.isFallback,
    isManuallyReviewed: false,
    isUsable: !isStale && result.nav > 0,
    unusableReason: isStale
      ? 'Issuer NAV data is stale — manual review required before reserve eligibility'
      : null,
  };

  setObservationCache(config.assetId, observation);

  return {
    assetId: config.assetId,
    success: true,
    source: sourceType,
    nav: result.nav,
    confidenceScore,
    fetchedAt,
  };
}

// ── Polling orchestrator ───────────────────────────────────────────────────────

let _lastPollSummary: PollSummary | null = null;

/**
 * Refreshes all PLANNED asset oracle observations.
 * Skips assets whose cache entry is still fresh unless `force=true`.
 */
export async function refreshAllObservations(options: { force?: boolean } = {}): Promise<PollSummary> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const { force = false } = options;

  const tasks: Promise<PollResult>[] = [];

  // PAXG — only refresh if cache is stale or forced
  if (force || !isCacheEntryFresh('paxg-tokenized-gold-planned')) {
    tasks.push(pollPaxg());
  }

  // Issuer NAV assets
  for (const asset of ISSUER_ASSETS) {
    if (force || !isCacheEntryFresh(asset.assetId)) {
      tasks.push(pollIssuerAsset(asset));
    }
  }

  const results = await Promise.all(tasks);
  const completedAt = new Date().toISOString();

  const summary: PollSummary = {
    startedAt,
    completedAt,
    durationMs: Date.now() - t0,
    results,
    successCount: results.filter(r => r.success).length,
    failureCount: results.filter(r => !r.success).length,
  };

  _lastPollSummary = summary;
  return summary;
}

export function getLastPollSummary(): PollSummary | null {
  return _lastPollSummary;
}
