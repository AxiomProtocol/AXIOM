/**
 * Axiom Protocol — Stellar Payment Adapter (Stub)
 *
 * Non-live stub implementation of StellarPaymentAdapterInterface.
 * This stub satisfies the interface contract, logs all method calls,
 * and returns structured "not-yet-live" responses for every operation.
 *
 * ═══════════════════════════════════════════════════════════════
 * THIS IS A STUB — NO STELLAR SDK IS INSTALLED. NO LIVE CALLS.
 * ═══════════════════════════════════════════════════════════════
 *
 * To activate this adapter:
 *   1. npm install @stellar/stellar-sdk
 *   2. Select an anchor partner (business decision — see ANCHOR_CANDIDATES)
 *   3. Replace all STUB_RESPONSE returns with real Stellar SDK calls
 *   4. Set ENABLE_STELLAR_PAYMENTS_RAIL=true
 *   5. Update expansion_rail_integrations table via admin API
 *
 * Pattern for implementers:
 *   - Search for "STUB:" to find every method requiring implementation
 *   - Each STUB block shows what the real implementation must return
 *   - The isLive flag gates all real network calls
 */

import type {
  StellarPaymentAdapterInterface,
  StellarAsset,
  StellarAccount,
  StellarAnchorStatus,
  PaymentCorridorStatus,
  StellarTransferState,
  StellarPaymentResult,
  StellarNetworkHealth,
  InitiatePaymentOptions,
} from '../adapters/StellarPaymentAdapterInterface';
import {
  STELLAR_PLANNED_CORRIDORS,
  STELLAR_NETWORK_CONFIGS,
  ANCHOR_CANDIDATES,
  STELLAR_KNOWN_ASSETS,
  type StellarNetworkId,
} from './types';
import { isExpansionEnabled } from '../featureFlags';

const NOT_LIVE_ERROR = 'Stellar payment rail is not yet live. SDK not installed, anchor partner not selected.';

export class StellarPaymentAdapter implements StellarPaymentAdapterInterface {
  readonly isLive: boolean;
  private readonly networkId: StellarNetworkId;

  constructor(networkId: StellarNetworkId = 'mainnet') {
    this.networkId = networkId;
    this.isLive = isExpansionEnabled('STELLAR_PAYMENTS_RAIL');
    if (this.isLive) {
      console.warn(
        '[StellarPaymentAdapter] ENABLE_STELLAR_PAYMENTS_RAIL is true but ' +
        'the Stellar SDK is not yet installed. Set isLive=false until SDK is ready.'
      );
    }
  }

  // ─── Network health ──────────────────────────────────────────────────────────

  async getNetworkHealth(): Promise<StellarNetworkHealth> {
    if (!this.isLive) {
      // STUB: Real implementation calls Stellar Horizon /
      return {
        networkId: this.networkId,
        horizonReachable: false,
        latencyMs: null,
        currentLedger: null,
        currentFeeStroops: null,
        asOf: new Date().toISOString(),
      };
    }
    // STUB: Replace with: const server = new StellarSdk.Horizon.Server(horizonUrl); const ledger = await server.ledgers().order('desc').limit(1).call();
    throw new Error('Stellar SDK not installed. Install @stellar/stellar-sdk first.');
  }

  // ─── Corridors ───────────────────────────────────────────────────────────────

  async getAllCorridors(): Promise<PaymentCorridorStatus[]> {
    // STUB: Return planned corridors with "unavailable" status until anchor is selected
    return STELLAR_PLANNED_CORRIDORS.map(c => ({
      corridorId: c.corridorId,
      sourceNetwork: c.sourceNetwork,
      destinationCurrency: c.destinationCurrency,
      destinationCountry: c.destinationCountry,
      anchorId: c.anchorId ?? 'not_selected',
      status: 'pending_anchor' as const,
      estimatedSettlementMinutes: c.estimatedSettlementMinutes,
      minAmountUsd: c.minAmountUsd,
      maxAmountUsd: c.maxAmountUsd,
      feeEstimatePercent: null,
      notes: `Planned corridor. Blockers: ${c.blockers.join('; ')}`,
    }));
  }

  async getCorridorStatus(corridorId: string): Promise<PaymentCorridorStatus> {
    const all = await this.getAllCorridors();
    const found = all.find(c => c.corridorId === corridorId);
    if (found) return found;
    return {
      corridorId,
      sourceNetwork: 'unknown',
      destinationCurrency: 'unknown',
      destinationCountry: 'unknown',
      anchorId: 'not_selected',
      status: 'unknown',
      estimatedSettlementMinutes: null,
      minAmountUsd: null,
      maxAmountUsd: null,
      feeEstimatePercent: null,
      notes: 'Corridor not found in registry.',
    };
  }

  // ─── Anchor ──────────────────────────────────────────────────────────────────

  async getAnchorStatus(anchorId: string): Promise<StellarAnchorStatus> {
    const candidate = ANCHOR_CANDIDATES.find(a => a.anchorId === anchorId);
    // STUB: Real implementation calls anchor's SEP-1 TOML and SEP-24 info endpoint
    return {
      anchorId,
      anchorName: candidate?.anchorName ?? anchorId,
      isReachable: false,
      sep24Supported: candidate?.sep24Support ?? false,
      sep31Supported: candidate?.sep31Support ?? false,
      supportedAssets: [],
      corridors: [],
      lastCheckedAt: new Date().toISOString(),
    };
  }

  // ─── Account ─────────────────────────────────────────────────────────────────

  async getAccountInfo(publicKey: string): Promise<StellarAccount> {
    if (!this.isLive) {
      // STUB: Real implementation: await server.loadAccount(publicKey)
      return {
        publicKey,
        exists: false,
        balances: [],
        sequenceNumber: null,
      };
    }
    throw new Error('Stellar SDK not installed.');
  }

  // ─── Payments ────────────────────────────────────────────────────────────────

  async initiatePayment(options: InitiatePaymentOptions): Promise<StellarPaymentResult> {
    if (options.dryRun) {
      return {
        success: false,
        transferId: null,
        stellarTransactionHash: null,
        error: NOT_LIVE_ERROR,
        state: null,
      };
    }
    if (!this.isLive) {
      return {
        success: false,
        transferId: null,
        stellarTransactionHash: null,
        error: NOT_LIVE_ERROR,
        state: null,
      };
    }
    // STUB: Real implementation builds and submits a Stellar transaction
    // using @stellar/stellar-sdk, SEP-24 flow, and selected anchor partner.
    throw new Error('Stellar SDK not installed. Cannot initiate live payment.');
  }

  async getTransferState(transferId: string): Promise<StellarTransferState | null> {
    if (!this.isLive) {
      // STUB: Real implementation calls anchor's SEP-24 GET /transaction?id=...
      return null;
    }
    throw new Error('Stellar SDK not installed.');
  }

  async cancelPayment(transferId: string): Promise<boolean> {
    if (!this.isLive) {
      return false;
    }
    // STUB: Real implementation calls anchor's refund/cancel endpoint if available
    throw new Error('Stellar SDK not installed.');
  }

  // ─── Assets ──────────────────────────────────────────────────────────────────

  async getSupportedAssets(): Promise<StellarAsset[]> {
    // Return known assets — this is static until SDK is live
    return STELLAR_KNOWN_ASSETS.map(a => ({
      code: a.code,
      issuer: a.issuer,
      isNative: a.isNative,
    }));
  }
}

// ─── Singleton factory ────────────────────────────────────────────────────────

let _instance: StellarPaymentAdapter | null = null;

export function getStellarPaymentAdapter(networkId: StellarNetworkId = 'mainnet'): StellarPaymentAdapter {
  if (!_instance) {
    _instance = new StellarPaymentAdapter(networkId);
  }
  return _instance;
}
