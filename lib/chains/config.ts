/**
 * Axiom Protocol — Canonical Chain Configuration Registry
 *
 * Single source of truth for chain metadata in the updated multi-chain
 * strategic model:
 *
 *   Arbitrum One  → Core execution layer (live today)
 *   Avalanche     → Control / issuance / policy / reserve core (future)
 *   Polygon       → Payments / treasury routing / enterprise settlement (future)
 *   Sui           → Wallet-facing distribution / community / diaspora (future)
 *   Ethereum      → Reserve reference layer (PAXG anchor — no Axiom contracts)
 *
 * ─── Design rules ────────────────────────────────────────────────────────────
 * 1. Arbitrum One is the default for every helper that falls back to a chain.
 * 2. Expansion chain entries are present but return inert values when their
 *    feature flag is disabled.
 * 3. No existing file imports from this module — it is available for new code.
 * 4. Do NOT modify shared/contracts.ts — this module references it, never
 *    replaces it.
 */

import { NETWORK_CONFIG } from '../../shared/contracts';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChainSlug = 'arbitrum' | 'avalanche' | 'polygon' | 'sui' | 'ethereum';

export type EvmChainSlug = Exclude<ChainSlug, 'sui'>;

export type ChainType = 'evm' | 'non_evm';

export type ChainStrategicRole =
  | 'core_execution'         // Arbitrum: live canonical execution + settlement
  | 'reserve_policy_core'    // Avalanche: issuance / policy / reserve logic
  | 'payments_settlement'    // Polygon: payments / treasury routing / enterprise
  | 'distribution_community' // Sui: wallet-facing / community / diaspora
  | 'reserve_reference';     // Ethereum: PAXG L1 anchor — no Axiom contracts

export type ChainLiveStatus = 'live' | 'future';

export interface NativeCurrency {
  name: string;
  symbol: string;
  decimals: number;
}

export interface ChainConfig {
  slug: ChainSlug;
  displayName: string;
  type: ChainType;
  /** Present for EVM chains; null for non-EVM (Sui). */
  chainId: number | null;
  /** Hex form of chainId for wallet_addEthereumChain RPC calls; null for non-EVM. */
  chainIdHex: string | null;
  strategicRole: ChainStrategicRole;
  liveStatus: ChainLiveStatus;
  nativeCurrency: NativeCurrency;
  /**
   * Primary block explorer base URL for this chain.
   * Used by lib/chains/explorers.ts — do not construct URLs directly here.
   */
  blockExplorerUrl: string;
  /**
   * Alchemy network identifier for this chain, if Alchemy supports it.
   * null = Alchemy not used for this chain (use direct RPC instead).
   */
  alchemyNetwork: string | null;
  /**
   * Default public RPC fallback. Used when no Alchemy key or chain-specific
   * RPC override is configured.
   */
  publicRpcFallback: string | null;
  /**
   * Environment variable name for a chain-specific RPC URL override.
   * null = no override possible for this chain.
   */
  rpcUrlEnvVar: string | null;
  /**
   * Whether this chain is currently enabled in the running environment.
   * Evaluated lazily via isChainCapable() in lib/chains/capabilities.ts.
   */
  featureFlagEnvVar: string | null;
}

// ─── Registry ────────────────────────────────────────────────────────────────

export const CHAIN_CONFIGS: Record<ChainSlug, ChainConfig> = {
  arbitrum: {
    slug: 'arbitrum',
    displayName: 'Arbitrum One',
    type: 'evm',
    chainId: NETWORK_CONFIG.chainId,
    chainIdHex: NETWORK_CONFIG.chainIdHex,
    strategicRole: 'core_execution',
    liveStatus: 'live',
    nativeCurrency: NETWORK_CONFIG.nativeCurrency,
    blockExplorerUrl: NETWORK_CONFIG.blockExplorer,
    alchemyNetwork: 'arb-mainnet',
    publicRpcFallback: NETWORK_CONFIG.rpcUrl,
    rpcUrlEnvVar: 'ARBITRUM_RPC_URL',
    featureFlagEnvVar: null, // Always enabled — no flag needed
  },

  avalanche: {
    slug: 'avalanche',
    displayName: 'Avalanche C-Chain',
    type: 'evm',
    chainId: 43114,
    chainIdHex: '0xa86a',
    strategicRole: 'reserve_policy_core',
    liveStatus: 'future',
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
    blockExplorerUrl: 'https://snowtrace.io',
    alchemyNetwork: null, // Alchemy Avalanche requires separate key configuration
    publicRpcFallback: 'https://api.avax.network/ext/bc/C/rpc',
    rpcUrlEnvVar: 'AVALANCHE_RPC_URL',
    featureFlagEnvVar: 'CHAIN_AVALANCHE_ENABLED',
  },

  polygon: {
    slug: 'polygon',
    displayName: 'Polygon',
    type: 'evm',
    chainId: 137,
    chainIdHex: '0x89',
    strategicRole: 'payments_settlement',
    liveStatus: 'future',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    blockExplorerUrl: 'https://polygonscan.com',
    alchemyNetwork: 'polygon-mainnet',
    publicRpcFallback: 'https://polygon-rpc.com',
    rpcUrlEnvVar: 'POLYGON_RPC_URL',
    featureFlagEnvVar: 'CHAIN_POLYGON_ENABLED',
  },

  sui: {
    slug: 'sui',
    displayName: 'Sui',
    type: 'non_evm',
    chainId: null,   // Sui uses object IDs, not EVM chain IDs
    chainIdHex: null,
    strategicRole: 'distribution_community',
    liveStatus: 'future',
    nativeCurrency: { name: 'Sui', symbol: 'SUI', decimals: 9 },
    blockExplorerUrl: 'https://suiscan.xyz',
    alchemyNetwork: null, // Alchemy does not support Sui
    publicRpcFallback: 'https://fullnode.mainnet.sui.io',
    rpcUrlEnvVar: 'SUI_RPC_URL',
    featureFlagEnvVar: 'CHAIN_SUI_ENABLED',
  },

  ethereum: {
    slug: 'ethereum',
    displayName: 'Ethereum Mainnet',
    type: 'evm',
    chainId: 1,
    chainIdHex: '0x1',
    strategicRole: 'reserve_reference',
    liveStatus: 'live',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://etherscan.io',
    alchemyNetwork: 'eth-mainnet',
    publicRpcFallback: 'https://cloudflare-eth.com',
    rpcUrlEnvVar: null, // Ethereum uses the shared ALCHEMY_API_KEY only
    featureFlagEnvVar: null, // Always enabled for PAXG reference
  },
};

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/**
 * Returns the chain config for the given slug, or null if not found.
 */
export function getChainConfig(slug: string): ChainConfig | null {
  return CHAIN_CONFIGS[slug as ChainSlug] ?? null;
}

/**
 * Returns the chain config for the given EVM chain ID, or null.
 * Only EVM chains have numeric chain IDs.
 */
export function getChainConfigByEvmId(chainId: number): ChainConfig | null {
  return (
    Object.values(CHAIN_CONFIGS).find(c => c.chainId === chainId) ?? null
  );
}

/**
 * Returns all chain configs for EVM chains only.
 */
export function getEvmChainConfigs(): ChainConfig[] {
  return Object.values(CHAIN_CONFIGS).filter(c => c.type === 'evm');
}

/**
 * Returns all chain configs with the given live status.
 */
export function getChainsByStatus(status: ChainLiveStatus): ChainConfig[] {
  return Object.values(CHAIN_CONFIGS).filter(c => c.liveStatus === status);
}

/**
 * The canonical default chain for all Axiom operations.
 * Arbitrum One — always available, never feature-flagged.
 */
export const DEFAULT_CHAIN: ChainConfig = CHAIN_CONFIGS.arbitrum;

/**
 * Chain ID for the canonical default chain.
 * Use this constant where a numeric chain ID is required as a safe default.
 */
export const DEFAULT_CHAIN_ID: number = CHAIN_CONFIGS.arbitrum.chainId!;
