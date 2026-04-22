/**
 * Axiom Protocol — Institutional Bridge Adapter Interface
 *
 * Provider-agnostic contract for institutional finance bridge integrations.
 * The first concrete implementation target is the Canton Network.
 * Future targets may include other enterprise finance networks.
 *
 * Role clarity:
 *   Canton = institutional-grade privacy/enterprise finance bridge
 *   Arbitrum = core execution layer (NOT replaced)
 *   AXUSD   = internal settlement layer (NOT replaced)
 *   This bridge provides Axiom with access to enterprise financial institutions
 *   operating on Canton for private market product connectivity.
 *
 * Prerequisites for Canton implementation:
 *   - Canton participant agreement with Digital Asset (required)
 *   - DAML SDK installed and reviewed (required)
 *   - DAML development expertise available (required)
 */

// ─── Value types ──────────────────────────────────────────────────────────────

export interface InstitutionalNetworkHealth {
  networkId: string;
  networkName: string;
  participantNodeReachable: boolean;
  participantNodeUrl: string | null;
  agreementStatus: 'none' | 'pending' | 'signed' | 'active';
  latencyMs: number | null;
  asOf: string;
}

export interface InstitutionalProductDescriptor {
  productId: string;
  productName: string;
  productType: 'private_credit' | 'private_equity' | 'structured_product' | 'repo' | 'other';
  networkId: string;
  issuer: string;
  status: 'available' | 'restricted' | 'unavailable';
  minSubscriptionUsd: number | null;
  maxSubscriptionUsd: number | null;
  complianceRequirements: string[];
  notes: string;
}

export interface InstitutionalParticipantStatus {
  walletAddress: string;
  networkId: string;
  participantId: string | null;
  verificationStatus: 'verified' | 'pending' | 'rejected' | 'not_submitted';
  accessibleProducts: string[];
  complianceLevel: 'institutional' | 'accredited' | 'retail' | 'none';
  notes: string | null;
}

export interface BridgeTransactionResult {
  success: boolean;
  transactionId: string | null;
  networkTransactionRef: string | null;
  productId: string | null;
  amount: string | null;
  error: string | null;
}

export interface ComplianceVerificationResult {
  walletAddress: string;
  networkId: string;
  verified: boolean;
  verificationLevel: string | null;
  error: string | null;
}

// ─── Interface contract ───────────────────────────────────────────────────────

export interface InstitutionalBridgeAdapterInterface {
  /**
   * True only when:
   *   - Partner agreement is signed
   *   - SDK is installed and participant node is configured
   *   - DAML/network expertise is available (Canton)
   */
  readonly isLive: boolean;

  /**
   * The institutional network this adapter targets (e.g. 'canton').
   */
  readonly networkId: string;

  /**
   * Returns the health of the institutional network connection.
   */
  getNetworkHealth(): Promise<InstitutionalNetworkHealth>;

  /**
   * Returns available institutional products visible to Axiom
   * through this bridge. Requires active participant agreement.
   */
  getAvailableProducts(): Promise<InstitutionalProductDescriptor[]>;

  /**
   * Returns the participation status for a wallet on the institutional network.
   */
  getParticipantStatus(walletAddress: string): Promise<InstitutionalParticipantStatus>;

  /**
   * Verifies a wallet's compliance for access to institutional products.
   * Must integrate with Axiom's existing ERC-3643 identity layer.
   */
  verifyCompliance(walletAddress: string): Promise<ComplianceVerificationResult>;

  /**
   * Initiates a subscription or allocation to an institutional product.
   * When dryRun is true, simulates without executing.
   */
  initiateSubscription(
    walletAddress: string,
    productId: string,
    amountUsd: string,
    complianceToken: string,
    dryRun: boolean
  ): Promise<BridgeTransactionResult>;

  /**
   * Returns the status of an existing institutional transaction.
   */
  getTransactionStatus(transactionId: string): Promise<{
    transactionId: string;
    status: string;
    error: string | null;
    updatedAt: string;
  } | null>;
}
