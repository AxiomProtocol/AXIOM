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
 *
 * SEP protocols implemented:
 *   SEP-0010: Stellar Web Authentication
 *   SEP-0024: Interactive Anchor Specification
 *   SEP-0031: Cross-Border Payments (direct, non-interactive)
 *   SEP-0038: Anchor RFQ (Request for Quote)
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

// ─── SEP-38 types (Anchor RFQ) ────────────────────────────────────────────────

export interface Sep38AssetEntry {
  asset: string;
  countryCodes?: string[];
  sellDeliveryMethods?: { name: string; description: string }[];
  buyDeliveryMethods?: { name: string; description: string }[];
}

export interface Sep38InfoResponse {
  assets: Sep38AssetEntry[];
  anchorQuoteServer: string;
  anchorId: string;
}

export interface Sep38BuyAssetQuote {
  asset: string;
  price: string;
  decimals: number;
}

export interface Sep38PricesResponse {
  buyAssets: Sep38BuyAssetQuote[];
  sellAsset: string;
  sellAmount: string;
  anchorId: string;
}

export interface Sep38Fee {
  total: string;
  asset: string;
  details?: { name: string; description?: string; amount: string }[];
}

export interface Sep38QuoteResponse {
  id: string;
  expiresAt: string;
  totalPrice: string;
  price: string;
  sellAsset: string;
  sellAmount: string;
  buyAsset: string;
  buyAmount: string;
  fee: Sep38Fee;
  anchorId: string;
}

// ─── SEP-38 options types ─────────────────────────────────────────────────────

export interface Sep38PricesOptions {
  sellAsset: string;
  sellAmount: string;
  countryCode?: string;
  buyDeliveryMethod?: string;
  sellDeliveryMethod?: string;
}

export interface Sep38QuoteOptions {
  sellAsset: string;
  buyAsset: string;
  sellAmount?: string;
  buyAmount?: string;
  expireAfter?: string;
  countryCode?: string;
  buyDeliveryMethod?: string;
  sellDeliveryMethod?: string;
  stellarPublicKey: string;
  stellarSecretKey: string;
}

// ─── SEP-31 types (Cross-Border Payments) ────────────────────────────────────

export interface Sep31FieldSpec {
  description: string;
  optional?: boolean;
  choices?: string[];
}

export interface Sep31AssetSpec {
  enabled: boolean;
  feeFixed?: number;
  feePercent?: number;
  minAmount?: number;
  maxAmount?: number;
  fields?: { transaction?: Record<string, Sep31FieldSpec> };
}

export interface Sep31InfoResponse {
  receive: Record<string, Sep31AssetSpec>;
  directPaymentServer: string;
  anchorId: string;
}

export interface Sep31InitiateOptions {
  assetCode: string;
  assetIssuer: string;
  amount: string;
  transactionFields: Record<string, string>;
  quoteId?: string;
  corridorId: string;
  senderWalletAddress: string;
  stellarPublicKey: string;
  stellarSecretKey: string;
}

export interface Sep31InitiateResponse {
  sep31TransactionId: string;
  stellarAccountId: string;
  stellarMemoType: string;
  stellarMemo: string;
  requiresManualStellarPayment: boolean;
  dbTransferId: string;
}

export interface Sep31StatusResponse {
  id: string;
  status: string;
  statusEta?: number | null;
  amountIn?: string;
  amountInAsset?: string;
  amountOut?: string;
  amountOutAsset?: string;
  amountFee?: string;
  amountFeeAsset?: string;
  stellarAccountId?: string;
  stellarMemo?: string;
  stellarMemoType?: string;
  startedAt: string;
  completedAt?: string | null;
  stellarTransactionId?: string | null;
  message?: string | null;
  requiredInfoMessage?: string | null;
  requiredInfoUpdates?: Record<string, Sep31FieldSpec> | null;
  dbTransferId: string | null;
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

  // ─── SEP-38: Anchor RFQ ──────────────────────────────────────────────────

  /**
   * Returns all assets the active anchor supports for quoting.
   * Resolves ANCHOR_QUOTE_SERVER from stellar.toml (ANCHOR_QUOTE_SERVER field)
   * or from the registry sep38BaseUrl. No auth required.
   */
  getSep38Info(): Promise<Sep38InfoResponse>;

  /**
   * Returns indicative exchange rates for all buy assets against a given sell asset.
   * Public endpoint — no SEP-10 auth required.
   */
  getSep38Prices(options: Sep38PricesOptions): Promise<Sep38PricesResponse>;

  /**
   * Requests a firm, time-bound quote from the anchor.
   * Requires SEP-10 authentication (caller provides keypair).
   * Quote ID can be used in SEP-31 initiation.
   */
  requestSep38Quote(options: Sep38QuoteOptions): Promise<Sep38QuoteResponse>;

  // ─── SEP-31: Cross-Border Payments ──────────────────────────────────────

  /**
   * Returns the anchor's supported receiving assets and required transaction
   * fields for SEP-31. Resolves DIRECT_PAYMENT_SERVER from stellar.toml
   * (DIRECT_PAYMENT_SERVER field) or from the registry sep31BaseUrl.
   * No auth required.
   */
  getSep31Info(): Promise<Sep31InfoResponse>;

  /**
   * Initiates a direct (non-interactive) cross-border payment via SEP-31.
   * Authenticates via SEP-10, then POSTs to the anchor's /transactions endpoint.
   * If STELLAR_SENDER_SECRET_KEY is set, also submits the Stellar payment automatically.
   * Otherwise returns requiresManualStellarPayment: true with account + memo details.
   */
  initiateSep31Payment(options: Sep31InitiateOptions): Promise<Sep31InitiateResponse>;

  /**
   * Polls the anchor for the current status of a SEP-31 transaction.
   * Requires SEP-10 authentication (caller provides keypair).
   */
  getSep31TransactionStatus(
    sep31TransactionId: string,
    stellarPublicKey: string,
    stellarSecretKey: string
  ): Promise<Sep31StatusResponse>;
}
