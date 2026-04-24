/**
 * Axiom Protocol — Multichain Adapter Interfaces
 *
 * Provider-agnostic contracts for each planned expansion rail.
 * Concrete implementations are created when:
 *   1. SDK source files are gathered and reviewed
 *   2. Architecture decisions are made
 *   3. Partner agreements are in place (where required)
 *
 * Import from this barrel — do not import directly from individual files.
 */

export type {
  StellarPaymentAdapterInterface,
  StellarAsset,
  StellarAccount,
  StellarAnchorStatus,
  PaymentCorridorStatus,
  StellarTransferState,
  StellarPaymentResult,
  StellarNetworkHealth,
  InitiatePaymentOptions,
} from './StellarPaymentAdapterInterface';

export type {
  PolygonIdentityAdapterInterface,
  BridgeDesignMode,
  PolygonCredential,
  CredentialBridgeState,
  PolygonIssuerNodeStatus,
  CredentialBridgeResult,
  RevocationSyncResult,
} from './PolygonIdentityAdapterInterface';

export type {
  AvalancheCapitalAdapterInterface,
  AvaxArchitectureMode,
  AvalancheNetworkHealth,
  CapitalZoneDescriptor,
  CapitalZoneAccessState,
  CapitalDeploymentResult,
  CapitalWithdrawResult,
} from './AvalancheCapitalAdapterInterface';

export type {
  InstitutionalBridgeAdapterInterface,
  InstitutionalNetworkHealth,
  InstitutionalProductDescriptor,
  InstitutionalParticipantStatus,
  BridgeTransactionResult,
  ComplianceVerificationResult,
} from './InstitutionalBridgeAdapterInterface';

export type {
  SovereignChainAdapterInterface,
  CosmosArchitectureMode,
  SovereignChainHealth,
  ValidatorDescriptor,
  IBCChannelDescriptor,
  SovereignAccountState,
  IBCTransferResult,
  GovernanceProposal,
} from './SovereignChainAdapterInterface';
