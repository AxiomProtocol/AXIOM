/**
 * lib/reserves/phase3/treasuryNAVOracle.ts
 *
 * Phase 4 — TreasuryNAVOracleService (LIVE feeds activated)
 *
 * Routes each registry asset to its correct oracle source and returns a
 * structured NAVObservation. Phase 4 replaces stubs with live data:
 *
 * USDC:   FIXED_PEG   — $1.00, confidence 99, never stale.
 * PAXG:   CHAINLINK XAU/USD (Arbitrum) + BitGo attestation — live price.
 * thBILL: ISSUER_NAV_API (Theo Market) → ERC-4626 fallback.
 * BUIDL:  ISSUER_NAV_API (BlackRock) → ERC-4626 on-chain fallback.
 * USDY:   ISSUER_NAV_API (Ondo Finance) → ERC-4626 on Arbitrum fallback.
 * WETH:   INTERNAL_ACCOUNTING — always zero eligible (OPERATOR_TREASURY).
 * AXUSD:  INTERNAL_ACCOUNTING — always zero eligible (circular backing).
 *
 * Observations are served from navObservationCache. If the cache is empty
 * for a PLANNED asset, the oracle triggers a one-time background fetch and
 * returns the result. Subsequent calls return cached data until TTL expires.
 */

import type { NAVObservation, OracleSourceType, ValuationFreshnessState } from './types';
import { computeFreshnessState, computeConfidenceScore } from './valuationConfidence';
import { getValuationPolicy } from './assetValuationPolicy';
import {
  getObservationFromCache,
  isCacheEntryFresh,
  setObservationCache,
} from './navObservationCache';
import { fetchChainlinkXauUsd } from './feeds/chainlinkXauUsd';
import { fetchBitGoAttestation, mapAttestationToValuationStatus } from './feeds/bitgoAttestationFetcher';
import { fetchIssuerNav } from './feeds/issuerNavFetcher';

// ── Interface ─────────────────────────────────────────────────────────────────

export interface ITreasuryNAVOracle {
  getNAV(assetId: string): Promise<number | null>;
  getNAVWithMetadata(assetId: string): Promise<NAVObservation>;
  getLastUpdated(assetId: string): Promise<string | null>;
  getValuationSource(assetId: string): OracleSourceType;
  getConfidenceScore(assetId: string): Promise<number>;
  isStale(assetId: string): Promise<boolean>;
  isValuationUsable(assetId: string): Promise<boolean>;
}

// ── Fixed-peg NAV builder ─────────────────────────────────────────────────────

function buildFixedPegObservation(assetId: string, symbol: string): NAVObservation {
  const now = new Date().toISOString();
  return {
    assetId,
    assetAddress: '',
    chainId: 42161,
    symbol,
    grossNavPerToken: 1.0,
    quoteCurrency: 'USD',
    decimals: 6,
    timestamp: now,
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
  };
}

// ── Internal accounting builder ───────────────────────────────────────────────

function buildInternalAccountingObservation(
  assetId: string,
  symbol: string,
  assetAddress: string,
  decimals: number,
): NAVObservation {
  const now = new Date().toISOString();
  const policy = getValuationPolicy(assetId);
  const freshnessState: ValuationFreshnessState = 'FRESH';
  const confidence = computeConfidenceScore({
    sourceType: 'INTERNAL_ACCOUNTING',
    freshnessState,
    attestationStatus: 'NONE',
    reconciliationStatus: 'NOT_REQUIRED',
    isFallback: false,
    isManuallyReviewed: false,
    isAssetLive: false,
    attestationRequired: policy?.attestationRequired ?? false,
  });
  return {
    assetId,
    assetAddress,
    chainId: 42161,
    symbol,
    grossNavPerToken: null,
    quoteCurrency: 'USD',
    decimals,
    timestamp: now,
    sourceName: 'Internal Accounting',
    sourceType: 'INTERNAL_ACCOUNTING',
    sourceUrl: null,
    confidenceScore: confidence,
    freshnessState,
    isStale: false,
    isFallback: false,
    isManuallyReviewed: false,
    isUsable: true,
    unusableReason: null,
  };
}

// ── Fallback UNUSABLE observation ─────────────────────────────────────────────

function buildUnusableObservation(
  assetId: string,
  symbol: string,
  sourceType: OracleSourceType,
  sourceName: string,
  reason: string,
  assetAddress = '',
  chainId = 42161,
  decimals = 18,
): NAVObservation {
  return {
    assetId,
    assetAddress,
    chainId,
    symbol,
    grossNavPerToken: null,
    quoteCurrency: 'USD',
    decimals,
    timestamp: new Date().toISOString(),
    sourceName,
    sourceType,
    sourceUrl: null,
    confidenceScore: 0,
    freshnessState: 'UNUSABLE',
    isStale: true,
    isFallback: false,
    isManuallyReviewed: false,
    isUsable: false,
    unusableReason: reason,
  };
}

// ── PAXG live fetch ───────────────────────────────────────────────────────────

async function fetchPaxgObservation(): Promise<NAVObservation> {
  const assetId = 'paxg-tokenized-gold-planned';
  const maxStaleness = 3600;

  const [chainlinkData, attestation] = await Promise.allSettled([
    fetchChainlinkXauUsd(),
    fetchBitGoAttestation(),
  ]);

  const round = chainlinkData.status === 'fulfilled' ? chainlinkData.value : null;
  const attest = attestation.status === 'fulfilled' ? attestation.value : null;

  if (!round) {
    const reason = chainlinkData.status === 'rejected'
      ? `Chainlink XAU/USD fetch failed: ${(chainlinkData as PromiseRejectedResult).reason}`
      : 'Chainlink XAU/USD returned no data';

    return buildUnusableObservation(
      assetId, 'PAXG', 'CHAINLINK',
      'Chainlink XAU/USD (Arbitrum One)',
      reason,
      '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429',
      42161, 18,
    );
  }

  const attestationStatus = attest
    ? mapAttestationToValuationStatus(attest)
    : 'NONE';

  const freshnessState = computeFreshnessState(round.updatedAt.toISOString(), maxStaleness);
  const isStale =
    freshnessState === 'STALE' ||
    freshnessState === 'EXPIRED' ||
    freshnessState === 'MANUAL_REVIEW_REQUIRED';

  const confidenceScore = computeConfidenceScore({
    sourceType: 'CHAINLINK',
    freshnessState,
    attestationStatus,
    reconciliationStatus: 'CURRENT',
    isFallback: false,
    isManuallyReviewed: false,
    isAssetLive: true, // LIVE — Phase 4 admitted AXUSD TOKENIZED_GOLD sleeve
    attestationRequired: true,
  });

  const obs: NAVObservation = {
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
      ? `Chainlink round stale — last update: ${round.updatedAt.toISOString()}`
      : null,
  };

  setObservationCache(assetId, obs);
  return obs;
}

// ── Issuer NAV live fetch ─────────────────────────────────────────────────────

const ISSUER_ASSET_CONFIG: Record<string, {
  symbol: string;
  address: string;
  chainId: number;   // per-asset chain — do NOT default all to 42161
  decimals: number;
  sourceName: string;
  maxStaleness: number;
}> = {
  'thbill-theo-market-planned': {
    symbol: 'thBILL',
    address: '0x0000000000000000000000000000000000000001',
    chainId: 42161, // Arbitrum One (placeholder address until Theo Market deploys)
    decimals: 18,
    sourceName: 'Theo Market Issuer NAV API',
    maxStaleness: 86400,
  },
  'buidl-tokenized-treasury-planned': {
    symbol: 'BUIDL',
    address: '0x7712c34205737192402172409a8F7ccef8aA2AEc',
    chainId: 1,     // Ethereum mainnet — BUIDL ERC-4626 is NOT on Arbitrum
    decimals: 6,
    sourceName: 'BlackRock BUIDL / On-Chain ERC-4626',
    maxStaleness: 86400,
  },
  'ondo-usdy-tokenized-govmmf-planned': {
    symbol: 'USDY',
    address: '0x35e050d3C0eC2d29D269a8EcEa763a183bDF9A9D',
    chainId: 42161, // Arbitrum One
    decimals: 18,
    sourceName: 'Ondo Finance USDY Issuer NAV API',
    maxStaleness: 86400,
  },
};

async function fetchIssuerNAVObservation(assetId: string): Promise<NAVObservation> {
  const config = ISSUER_ASSET_CONFIG[assetId];
  if (!config) {
    return buildUnusableObservation(assetId, assetId, 'ISSUER_NAV_API', 'Unknown', `No config for ${assetId}`);
  }

  const result = await fetchIssuerNav(assetId);

  if (!result) {
    const obs = buildUnusableObservation(
      assetId, config.symbol, 'ISSUER_NAV_API', config.sourceName,
      'Issuer NAV API and on-chain ERC-4626 fallback both unavailable',
      config.address, config.chainId, config.decimals, // per-asset chain (BUIDL=1, others=42161)
    );
    setObservationCache(assetId, obs);
    return obs;
  }

  const sourceType = result.source === 'ISSUER_API'
    ? 'ISSUER_NAV_API' as const
    : 'ERC4626_CONVERT_TO_ASSETS' as const;

  const freshnessState = computeFreshnessState(result.fetchedAt, config.maxStaleness);
  const isStale =
    freshnessState === 'STALE' ||
    freshnessState === 'EXPIRED' ||
    freshnessState === 'MANUAL_REVIEW_REQUIRED';

  const confidenceScore = computeConfidenceScore({
    sourceType,
    freshnessState,
    attestationStatus: 'PENDING',
    reconciliationStatus: 'CURRENT',
    isFallback: result.isFallback,
    isManuallyReviewed: false,
    isAssetLive: false, // PLANNED
    attestationRequired: true,
  });

  const obs: NAVObservation = {
    assetId,
    assetAddress: config.address,
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
      ? 'Issuer NAV data stale — operator review required before reserve eligibility'
      : null,
  };

  setObservationCache(assetId, obs);
  return obs;
}

// ── TreasuryNAVOracleService ──────────────────────────────────────────────────

export class TreasuryNAVOracleService implements ITreasuryNAVOracle {

  async getNAVWithMetadata(assetId: string): Promise<NAVObservation> {
    switch (assetId) {

      case 'usdc-canonical-psm':
        return buildFixedPegObservation(assetId, 'USDC');

      case 'paxg-tokenized-gold-planned': {
        // Serve from cache if fresh; otherwise fetch live
        const cached = getObservationFromCache(assetId);
        if (cached && isCacheEntryFresh(assetId)) return cached;
        return fetchPaxgObservation();
      }

      case 'thbill-theo-market-planned':
      case 'buidl-tokenized-treasury-planned':
      case 'ondo-usdy-tokenized-govmmf-planned': {
        const cached = getObservationFromCache(assetId);
        if (cached && isCacheEntryFresh(assetId)) return cached;
        return fetchIssuerNAVObservation(assetId);
      }

      case 'weth-operator-treasury-internal':
        return buildInternalAccountingObservation(
          assetId, 'WETH', '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', 18,
        );

      case 'axusd-protocol-holdings-internal':
        return buildInternalAccountingObservation(
          assetId, 'AXUSD', '0x0000000000000000000000000000000000000000', 18,
        );

      default:
        return buildUnusableObservation(
          assetId, assetId, 'INTERNAL_ACCOUNTING',
          'Unknown Asset Source',
          `No oracle configured for asset: ${assetId}`,
        );
    }
  }

  async getNAV(assetId: string): Promise<number | null> {
    const obs = await this.getNAVWithMetadata(assetId);
    return obs.grossNavPerToken;
  }

  async getLastUpdated(assetId: string): Promise<string | null> {
    const obs = await this.getNAVWithMetadata(assetId);
    return obs.isUsable ? obs.timestamp : null;
  }

  getValuationSource(assetId: string): OracleSourceType {
    const policy = getValuationPolicy(assetId);
    if (!policy) return 'INTERNAL_ACCOUNTING';
    const typeMap: Record<string, OracleSourceType> = {
      FIXED_PEG:                  'FIXED_PEG',
      CHAINLINK_USDC_USD:         'CHAINLINK',
      CHAINLINK_XAU_USD:          'CHAINLINK',
      ERC4626_CONVERT_TO_ASSETS:  'ERC4626_CONVERT_TO_ASSETS',
      ISSUER_NAV_API:             'ISSUER_NAV_API',
      CUSTODIAN_ATTESTATION:      'CUSTODIAN_ATTESTATION',
      MANUAL_OPERATOR_INPUT:      'MANUAL_OPERATOR_INPUT',
      DEX_TWAP:                   'DEX_TWAP',
      INTERNAL_ACCOUNTING:        'INTERNAL_ACCOUNTING',
      FALLBACK_COMPOSITE:         'FALLBACK_COMPOSITE',
    };
    return typeMap[policy.primarySourceId] ?? 'INTERNAL_ACCOUNTING';
  }

  async getConfidenceScore(assetId: string): Promise<number> {
    const obs = await this.getNAVWithMetadata(assetId);
    return obs.confidenceScore;
  }

  async isStale(assetId: string): Promise<boolean> {
    const obs = await this.getNAVWithMetadata(assetId);
    return obs.isStale;
  }

  async isValuationUsable(assetId: string): Promise<boolean> {
    const obs = await this.getNAVWithMetadata(assetId);
    return obs.isUsable;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _oracle: TreasuryNAVOracleService | null = null;

export function getTreasuryNAVOracle(): TreasuryNAVOracleService {
  if (!_oracle) {
    _oracle = new TreasuryNAVOracleService();
  }
  return _oracle;
}
