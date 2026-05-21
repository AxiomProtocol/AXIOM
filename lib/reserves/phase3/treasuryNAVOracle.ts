/**
 * lib/reserves/phase3/treasuryNAVOracle.ts
 *
 * Phase 3 — TreasuryNAVOracleService
 *
 * Routes each registry asset to the correct oracle source.
 * Replaces Phase 2 stubs (fetchTbillNAV, fetchOraclePrice) with
 * structured NAVObservation objects.
 *
 * USDC:   FIXED_PEG   — returns $1.00, confidence 99, never stale.
 * thBILL: ISSUER_NAV_API stub — unusable (Phase 3 API not connected).
 * BUIDL:  ISSUER_NAV_API stub — unusable.
 * USDY:   ISSUER_NAV_API stub — unusable.
 * PAXG:   CHAINLINK_XAU_USD + CUSTODIAN_ATTESTATION stub — unusable.
 * WETH:   INTERNAL_ACCOUNTING — always zero eligible (OPERATOR_TREASURY).
 * AXUSD:  INTERNAL_ACCOUNTING — always zero eligible (circular backing).
 */

import type { NAVObservation, OracleSourceType, ValuationFreshnessState } from './types';
import { computeFreshnessState, computeConfidenceScore } from './valuationConfidence';
import { getValuationPolicy } from './assetValuationPolicy';

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

// ── Stub builder for unconnected sources ──────────────────────────────────────

function buildUnconnectedObservation(
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
    isAssetLive: false, // INTERNAL_ONLY assets are not live for AXUSD purposes
    attestationRequired: policy?.attestationRequired ?? false,
  });
  return {
    assetId,
    assetAddress,
    chainId: 42161,
    symbol,
    grossNavPerToken: null, // Balances fetched externally via AxiomTreasuryVault
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
    isUsable: true, // Usable for internal accounting; eligibleValue will be 0
    unusableReason: null,
  };
}

// ── TreasuryNAVOracleService ──────────────────────────────────────────────────

export class TreasuryNAVOracleService implements ITreasuryNAVOracle {

  async getNAVWithMetadata(assetId: string): Promise<NAVObservation> {
    switch (assetId) {

      case 'usdc-canonical-psm':
        return buildFixedPegObservation(assetId, 'USDC');

      case 'thbill-theo-market-planned':
        return buildUnconnectedObservation(
          assetId,
          'thBILL',
          'ISSUER_NAV_API',
          'Theo Market Issuer NAV API',
          'Phase 3 NAV API not yet connected — thBILL integration pending',
          '0x0000000000000000000000000000000000000001',
          42161,
          18,
        );

      case 'buidl-tokenized-treasury-planned':
        return buildUnconnectedObservation(
          assetId,
          'BUIDL',
          'ISSUER_NAV_API',
          'BlackRock BUIDL Issuer NAV API',
          'Phase 3 NAV API not yet connected — BUIDL integration pending',
          '0x0000000000000000000000000000000000000000',
          42161,
          6,
        );

      case 'ondo-usdy-tokenized-govmmf-planned':
        return buildUnconnectedObservation(
          assetId,
          'USDY',
          'ISSUER_NAV_API',
          'Ondo USDY Issuer NAV API',
          'Phase 3 NAV API not yet connected — USDY integration pending',
          '0x0000000000000000000000000000000000000000',
          42161,
          18,
        );

      case 'paxg-tokenized-gold-planned':
        return buildUnconnectedObservation(
          assetId,
          'PAXG',
          'CHAINLINK',
          'Chainlink XAU/USD + BitGo Attestation',
          'Phase 3 Chainlink XAU/USD and BitGo attestation not yet connected — PAXG integration pending',
          '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429',
          42161,
          18,
        );

      case 'weth-operator-treasury-internal':
        return buildInternalAccountingObservation(
          assetId,
          'WETH',
          '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          18,
        );

      case 'axusd-protocol-holdings-internal':
        // INTERNAL_ACCOUNTING: AXUSD is the liability being covered, not a reserve asset.
        // Circular backing guard permanently excludes this via RWAValuationAdapter.
        return buildInternalAccountingObservation(
          assetId,
          'AXUSD',
          '0x0000000000000000000000000000000000000000', // placeholder — no external balance needed
          18,
        );

      default:
        return buildUnconnectedObservation(
          assetId,
          assetId,
          'INTERNAL_ACCOUNTING',
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
    const sourceId = policy.primarySourceId;
    // Map policy source ID to OracleSourceType
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
    return typeMap[sourceId] ?? 'INTERNAL_ACCOUNTING';
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
