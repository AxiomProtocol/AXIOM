/**
 * Axiom Protocol — Polygon Identity Adapter Interface
 *
 * Provider-agnostic contract for the Polygon identity bridge integration.
 * A concrete implementation will be created when the Polygon ID SDK is
 * installed and the bridge design decision (ZK vs mirror vs allowlist) is made.
 *
 * Role clarity:
 *   This adapter extends Axiom's existing ERC-3643 identity layer on Arbitrum.
 *   It does NOT replace the IdentityBridgeService (lib/services/IdentityBridgeService.ts).
 *   It does NOT move assets. It propagates identity credentials to Polygon.
 *
 * Prerequisite: lib/services/IdentityBridgeService.ts must remain stable.
 * This adapter is additive — it reads from Arbitrum identity state and
 * propagates it to the Polygon ID system.
 */

// ─── Value types ──────────────────────────────────────────────────────────────

export type BridgeDesignMode = 'polygon_id_zk' | 'onchainid_mirror' | 'allowlist_sync';

export interface PolygonCredential {
  credentialId: string;
  walletAddress: string;
  claimTopics: number[];
  issuedAt: string;
  expiresAt: string | null;
  credentialType: string;
  proofType: 'zk_proof' | 'onchain_attestation' | 'allowlist_entry';
  status: 'active' | 'revoked' | 'expired';
}

export interface CredentialBridgeState {
  walletAddress: string;
  arbitrumIdentityId: string | null;
  polygonCredentialId: string | null;
  status: 'synced' | 'pending_sync' | 'not_bridged' | 'revoked' | 'error';
  lastSyncedAt: string | null;
  claimTopics: number[];
  error: string | null;
}

export interface PolygonIssuerNodeStatus {
  nodeUrl: string;
  isReachable: boolean;
  issuerDid: string | null;
  supportedSchemas: string[];
  lastHealthCheckAt: string;
}

export interface CredentialBridgeResult {
  success: boolean;
  walletAddress: string;
  credentialId: string | null;
  polygonTransactionHash: string | null;
  proofType: string | null;
  error: string | null;
}

export interface RevocationSyncResult {
  walletAddress: string;
  revoked: boolean;
  polygonRevocationHash: string | null;
  error: string | null;
}

// ─── Interface contract ───────────────────────────────────────────────────────

export interface PolygonIdentityAdapterInterface {
  /**
   * True only when Polygon ID SDK is installed, issuer node is configured,
   * and the bridge design decision has been implemented.
   */
  readonly isLive: boolean;

  /**
   * The bridge design chosen (ZK, mirror, or allowlist).
   * Must be set before implementation begins.
   */
  readonly bridgeMode: BridgeDesignMode | null;

  /**
   * Returns the health of the Polygon ID issuer node connection.
   */
  getIssuerNodeStatus(): Promise<PolygonIssuerNodeStatus>;

  /**
   * Bridges ERC-3643 credentials for a wallet from Arbitrum to Polygon.
   * Reads from existing IdentityBridgeService and translates to Polygon format.
   * Returns a structured result — never throws.
   */
  bridgeCredential(walletAddress: string): Promise<CredentialBridgeResult>;

  /**
   * Returns the bridge state for a wallet — whether its credentials are
   * synced, pending, or not yet bridged.
   */
  getBridgeState(walletAddress: string): Promise<CredentialBridgeState>;

  /**
   * Propagates a revocation from Arbitrum ERC-3643 to the Polygon credential.
   * Must be called any time a KYC claim is revoked on Arbitrum.
   */
  revokeCredential(walletAddress: string): Promise<RevocationSyncResult>;

  /**
   * Returns a Polygon ID credential by wallet address.
   * Returns null if no credential exists for this wallet.
   */
  getCredential(walletAddress: string): Promise<PolygonCredential | null>;

  /**
   * Verifies that a Polygon credential is still valid and not revoked.
   * Used for access control checks on Polygon-based products.
   */
  verifyCredential(walletAddress: string): Promise<{ valid: boolean; reason: string | null }>;

  /**
   * Runs a full sync across all bridged wallets — reconciles Arbitrum state
   * with Polygon credential state. Used for ops maintenance.
   */
  syncAll(): Promise<{ total: number; synced: number; errors: number }>;
}
