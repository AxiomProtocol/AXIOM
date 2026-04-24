/**
 * Axiom Protocol — Avalanche Capital Adapter Interface
 *
 * Provider-agnostic contract for Avalanche capital zone integration.
 * A concrete implementation will be created after the architecture
 * decision (C-Chain only vs custom Subnet) is made and the
 * AvalancheJS SDK is reviewed.
 *
 * Role clarity:
 *   Avalanche = compliance-aware capital deployment environment
 *   Arbitrum  = core execution layer (NOT replaced by Avalanche)
 *   AXUSD     = internal settlement layer (NOT replaced by Avalanche)
 *   Avalanche capital zones are additive product environments for
 *   institutional capital allocation in permissioned settings.
 */

// ─── Value types ──────────────────────────────────────────────────────────────

export type AvaxArchitectureMode = 'c_chain' | 'custom_subnet';

export interface AvalancheNetworkHealth {
  network: 'mainnet' | 'fuji_testnet';
  architecture: AvaxArchitectureMode | null;
  rpcReachable: boolean;
  latencyMs: number | null;
  currentBlockHeight: number | null;
  subnetId: string | null;
  asOf: string;
}

export interface CapitalZoneDescriptor {
  zoneId: string;
  zoneName: string;
  architecture: AvaxArchitectureMode;
  subnetId: string | null;
  chainId: number;
  complianceModel: 'allowlist_precompile' | 'onchain_kyc' | 'external_kyc';
  status: 'live' | 'configured' | 'planned' | 'researching';
  minParticipationUsd: number | null;
  maxParticipationUsd: number | null;
  permissionedAccess: boolean;
  notes: string;
}

export interface CapitalZoneAccessState {
  walletAddress: string;
  zoneId: string;
  hasAccess: boolean;
  grantedAt: string | null;
  expiresAt: string | null;
  complianceStatus: 'approved' | 'pending' | 'rejected' | 'not_applied';
  notes: string | null;
}

export interface CapitalDeploymentResult {
  success: boolean;
  zoneId: string;
  walletAddress: string;
  transactionHash: string | null;
  amountDeployed: string | null;
  error: string | null;
}

export interface CapitalWithdrawResult {
  success: boolean;
  zoneId: string;
  walletAddress: string;
  transactionHash: string | null;
  amountWithdrawn: string | null;
  error: string | null;
}

// ─── Interface contract ───────────────────────────────────────────────────────

export interface AvalancheCapitalAdapterInterface {
  /**
   * True only when AvalancheJS SDK is installed, architecture is decided,
   * and the adapter is connected to a live Avalanche endpoint.
   */
  readonly isLive: boolean;

  /**
   * The architecture mode chosen (C-Chain or Subnet).
   * Must be decided before implementation can proceed.
   */
  readonly architectureMode: AvaxArchitectureMode | null;

  /**
   * Returns health of the Avalanche network connection.
   */
  getNetworkHealth(): Promise<AvalancheNetworkHealth>;

  /**
   * Returns all capital zones configured for this adapter.
   */
  getAllZones(): Promise<CapitalZoneDescriptor[]>;

  /**
   * Returns a specific capital zone by ID.
   */
  getZone(zoneId: string): Promise<CapitalZoneDescriptor | null>;

  /**
   * Returns the access state for a wallet in a given capital zone.
   */
  getAccessState(walletAddress: string, zoneId: string): Promise<CapitalZoneAccessState>;

  /**
   * Grants a wallet access to a capital zone (for permissioned zones).
   * Requires compliance verification from the Axiom identity layer.
   */
  grantAccess(
    walletAddress: string,
    zoneId: string,
    complianceToken: string
  ): Promise<{ success: boolean; error: string | null }>;

  /**
   * Deploys capital from Axiom's internal layer (AXUSD on Arbitrum)
   * into an Avalanche capital zone.
   */
  deployCapital(
    walletAddress: string,
    zoneId: string,
    amountUsd: string,
    dryRun: boolean
  ): Promise<CapitalDeploymentResult>;

  /**
   * Withdraws capital from an Avalanche capital zone back to Arbitrum.
   */
  withdrawCapital(
    walletAddress: string,
    zoneId: string,
    amountUsd: string,
    dryRun: boolean
  ): Promise<CapitalWithdrawResult>;
}
