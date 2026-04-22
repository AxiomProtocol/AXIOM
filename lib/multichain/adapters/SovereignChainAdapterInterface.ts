/**
 * Axiom Protocol — Sovereign Chain Adapter Interface
 *
 * Provider-agnostic contract for Axiom's sovereign chain layer.
 * The first concrete implementation target is the Cosmos SDK
 * (either as an Axiom-native appchain or IBC hub integration).
 *
 * Role clarity:
 *   Cosmos = long-term sovereign infrastructure for Axiom
 *   Arbitrum = core execution layer (NOT replaced — remains live throughout)
 *   AXUSD   = internal settlement layer (cross-chain settlement model
 *             with Arbitrum ↔ Cosmos must be designed separately)
 *
 * Prerequisites for Cosmos implementation:
 *   - Architecture decision: appchain vs IBC hub (required — blocks all else)
 *   - Go development expertise (required for appchain path)
 *   - Cosmos SDK documentation reviewed
 *   - AXM validator economics designed
 *   - IBC module selected
 *
 * This is a long-horizon interface (18-36 month implementation window).
 * It exists now to define the contract so future architecture stays consistent.
 */

// ─── Value types ──────────────────────────────────────────────────────────────

export type CosmosArchitectureMode = 'appchain' | 'ibc_hub_integration';

export interface SovereignChainHealth {
  chainId: string | null;
  architecture: CosmosArchitectureMode | null;
  rpcReachable: boolean;
  latencyMs: number | null;
  currentBlockHeight: number | null;
  ibcEnabled: boolean;
  validatorCount: number | null;
  asOf: string;
}

export interface ValidatorDescriptor {
  validatorAddress: string;
  moniker: string;
  votingPowerPercent: number;
  commission: number;
  status: 'active' | 'inactive' | 'jailed';
}

export interface IBCChannelDescriptor {
  channelId: string;
  counterpartyChainId: string;
  counterpartyChannelId: string;
  portId: string;
  status: 'open' | 'closed' | 'init';
  transfersEnabled: boolean;
}

export interface SovereignAccountState {
  walletAddress: string;
  accountNumber: number | null;
  sequenceNumber: number | null;
  balances: { denom: string; amount: string }[];
  delegations: { validatorAddress: string; amount: string }[];
}

export interface IBCTransferResult {
  success: boolean;
  sourceChain: string;
  destinationChain: string;
  channelId: string;
  transactionHash: string | null;
  sequence: number | null;
  amount: string | null;
  denom: string | null;
  error: string | null;
}

export interface GovernanceProposal {
  proposalId: number;
  title: string;
  description: string;
  status: 'deposit_period' | 'voting_period' | 'passed' | 'rejected' | 'failed';
  submitTime: string;
  votingEndTime: string;
  yesPercent: number | null;
  noPercent: number | null;
}

// ─── Interface contract ───────────────────────────────────────────────────────

export interface SovereignChainAdapterInterface {
  /**
   * True only when Cosmos SDK chain exists, architecture is decided,
   * and this adapter is connected to a live RPC endpoint.
   * Expected to be false for 18-36 months minimum.
   */
  readonly isLive: boolean;

  /**
   * The architecture mode for this sovereign chain.
   * Null until the architecture decision is made.
   */
  readonly architectureMode: CosmosArchitectureMode | null;

  /**
   * Returns the health of the sovereign chain connection.
   */
  getChainHealth(): Promise<SovereignChainHealth>;

  /**
   * Returns the active validator set for the sovereign chain.
   */
  getValidators(): Promise<ValidatorDescriptor[]>;

  /**
   * Returns all active IBC channels connecting this chain
   * to external chains (including Arbitrum bridge if applicable).
   */
  getIBCChannels(): Promise<IBCChannelDescriptor[]>;

  /**
   * Returns account state for a wallet on the sovereign chain.
   */
  getAccountState(address: string): Promise<SovereignAccountState | null>;

  /**
   * Initiates an IBC transfer to or from the sovereign chain.
   * Requires IBC channel to be open and functional.
   */
  initiateIBCTransfer(options: {
    sourceAddress: string;
    destinationAddress: string;
    destinationChainId: string;
    channelId: string;
    amount: string;
    denom: string;
    timeoutSeconds: number;
    dryRun: boolean;
  }): Promise<IBCTransferResult>;

  /**
   * Returns active governance proposals on the sovereign chain.
   */
  getGovernanceProposals(status?: string): Promise<GovernanceProposal[]>;

  /**
   * Casts a governance vote from a validator or delegator wallet.
   */
  castGovernanceVote(
    walletAddress: string,
    proposalId: number,
    vote: 'yes' | 'no' | 'abstain' | 'no_with_veto'
  ): Promise<{ success: boolean; transactionHash: string | null; error: string | null }>;
}
