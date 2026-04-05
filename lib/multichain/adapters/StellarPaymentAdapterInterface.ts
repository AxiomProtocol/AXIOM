/**
 * Axiom Protocol — Stellar Payment Adapter Interface
 *
 * Provider-agnostic contract for any Stellar payments rail integration.
 * A concrete implementation will be created when the Stellar SDK is
 * installed and the anchor partner is selected.
 *
 * All methods must:
 *   - Never throw unhandled errors — return structured result types
 *   - Include status fields indicating whether the network call was live
 *   - Support dry-run/simulation mode (isLive: false) for testing
 *
 * Role clarity:
 *   Stellar = external payments and remittance rail
 *   AXUSD   = internal settlement layer (Arbitrum) — NOT replaced by Stellar
 *   This adapter bridges FROM AXUSD to the Stellar payments rail.
 */

// ─── Shared value types ───────────────────────────────────────────────────────

export interface StellarAsset {
  code: string;
  issuer: string | null;
  isNative: boolean;
}

export interface StellarAccount {
  publicKey: string;
  exists: boolean;
  balances: { asset: StellarAsset; balance: string }[];
  sequenceNumber: string | null;
}

export interface StellarAnchorStatus {
  anchorId: string;
  anchorName: string;
  isReachable: boolean;
  sep24Supported: boolean;
  sep31Supported: boolean;
  supportedAssets: StellarAsset[];
  corridors: { from: string; to: string; currency: string }[];
  lastCheckedAt: string;
}

export interface PaymentCorridorStatus {
  corridorId: string;
  sourceNetwork: string;
  destinationCurrency: string;
  destinationCountry: string;
  anchorId: string;
  status: 'available' | 'degraded' | 'unavailable' | 'pending_anchor' | 'unknown';
  estimatedSettlementMinutes: number | null;
  minAmountUsd: number | null;
  maxAmountUsd: number | null;
  feeEstimatePercent: number | null;
  notes: string;
}

export interface StellarTransferState {
  transferId: string;
  externalId: string | null;
  status:
    | 'pending_user_transfer_start'
    | 'pending_external'
    | 'pending_anchor'
    | 'pending_stellar'
    | 'pending_trust'
    | 'completed'
    | 'error'
    | 'refunded';
  stellarTransactionId: string | null;
  amount: string;
  asset: StellarAsset;
  destinationCurrency: string;
  destinationAmount: string | null;
  fee: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  updatedAt: string;
}

export interface StellarPaymentResult {
  success: boolean;
  transferId: string | null;
  stellarTransactionHash: string | null;
  error: string | null;
  state: StellarTransferState | null;
}

export interface StellarNetworkHealth {
  networkId: 'mainnet' | 'testnet';
  horizonReachable: boolean;
  latencyMs: number | null;
  currentLedger: number | null;
  currentFeeStroops: number | null;
  asOf: string;
}

// ─── Options types ────────────────────────────────────────────────────────────

export interface InitiatePaymentOptions {
  sourceAxusdAmount: string;
  destinationCurrency: string;
  destinationCountry: string;
  destinationAccount: string;
  corridorId: string;
  senderWalletAddress: string;
  complianceToken: string | null;
  memo: string | null;
  dryRun: boolean;
}

// ─── Interface contract ───────────────────────────────────────────────────────

export interface StellarPaymentAdapterInterface {
  /**
   * True only when the Stellar SDK is installed, configured, and the
   * adapter is connected to a live Horizon endpoint. Must be checked
   * before any network calls are attempted.
   */
  readonly isLive: boolean;

  /**
   * Returns the health of the Stellar network connection.
   * Safe to call even when isLive is false — returns appropriate degraded state.
   */
  getNetworkHealth(): Promise<StellarNetworkHealth>;

  /**
   * Returns current status for a specific payment corridor.
   * Corridor availability depends on anchor partner readiness.
   */
  getCorridorStatus(corridorId: string): Promise<PaymentCorridorStatus>;

  /**
   * Returns all payment corridors this adapter supports.
   */
  getAllCorridors(): Promise<PaymentCorridorStatus[]>;

  /**
   * Returns the status of the anchor partner integration.
   * Anchor partner must be selected and integrated before this returns live data.
   */
  getAnchorStatus(anchorId: string): Promise<StellarAnchorStatus>;

  /**
   * Returns information about a Stellar account (balances, sequence number).
   * Used to verify destination account trustlines before payment.
   */
  getAccountInfo(publicKey: string): Promise<StellarAccount>;

  /**
   * Initiates a payment from AXUSD (Arbitrum) to a Stellar payment corridor.
   * When dryRun is true, returns a simulation without executing.
   * Returns StellarPaymentResult — never throws.
   */
  initiatePayment(options: InitiatePaymentOptions): Promise<StellarPaymentResult>;

  /**
   * Returns the current state of an in-progress or completed transfer.
   */
  getTransferState(transferId: string): Promise<StellarTransferState | null>;

  /**
   * Cancels a payment if still in a cancellable state.
   * Returns false if cancellation is not possible.
   */
  cancelPayment(transferId: string): Promise<boolean>;

  /**
   * Returns the asset support matrix for this adapter.
   * Indicates which assets can be sent, received, or used as intermediary.
   */
  getSupportedAssets(): Promise<StellarAsset[]>;
}
