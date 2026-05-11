/**
 * Axiom Protocol — Chain Provider Factory
 *
 * Non-breaking centralized RPC provider configuration for all supported chains.
 *
 * ─── Design rules ────────────────────────────────────────────────────────────
 * 1. Arbitrum One always returns a valid RPC URL — existing behavior preserved.
 * 2. Expansion chain helpers return null when not configured — never throw.
 * 3. Callers must handle null responses for expansion chains.
 * 4. This module does NOT modify existing inline provider construction in
 *    lib/config.ts, lib/services/ERC3643Service.ts, or other existing files.
 *    It is for NEW code only.
 * 5. No existing file imports from this module.
 *
 * ─── Environment variables read ──────────────────────────────────────────────
 * ALCHEMY_API_KEY           — Shared Alchemy key (Arbitrum + Ethereum)
 * ARBITRUM_RPC_URL          — Override for Arbitrum RPC (existing var)
 * AVALANCHE_RPC_URL         — Avalanche RPC override (new, optional)
 * POLYGON_RPC_URL           — Polygon RPC override (new, optional)
 * SUI_RPC_URL               — Sui RPC override (new, optional)
 * AVALANCHE_ALCHEMY_NETWORK — Alchemy network for Avalanche (new, optional)
 * POLYGON_ALCHEMY_NETWORK   — Alchemy network for Polygon (new, optional)
 */

import type { ChainSlug } from './config';
import { CHAIN_CONFIGS } from './config';
import { isChainEnabled } from './capabilities';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChainProviderConfig {
  slug: ChainSlug;
  rpcUrl: string;
  isAlchemy: boolean;
  isFallback: boolean;
}

// ─── Arbitrum (primary — always available) ────────────────────────────────────

/**
 * Returns the Arbitrum One RPC URL.
 *
 * Resolution order:
 *   1. Alchemy URL if ALCHEMY_API_KEY is set
 *   2. ARBITRUM_RPC_URL env override
 *   3. Public fallback (arb1.arbitrum.io/rpc)
 *
 * This mirrors the existing logic in lib/config.ts getArbitrumRpcUrl().
 * Both can coexist — this version is the canonical reference for new code.
 */
export function getArbitrumRpcUrl(): string {
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (alchemyKey) {
    return `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`;
  }
  return (
    process.env.ARBITRUM_RPC_URL ||
    CHAIN_CONFIGS.arbitrum.publicRpcFallback ||
    'https://arb1.arbitrum.io/rpc'
  );
}

/**
 * Returns the Ethereum Mainnet RPC URL.
 * Used only for PAXG reserve reference — not for Axiom contract deployments.
 */
export function getEthereumRpcUrl(): string {
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (alchemyKey) {
    return `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`;
  }
  return CHAIN_CONFIGS.ethereum.publicRpcFallback || 'https://cloudflare-eth.com';
}

// ─── Expansion chain providers (return null when not configured) ──────────────

/**
 * Returns the Avalanche RPC URL, or null if not configured.
 * Returns null if CHAIN_AVALANCHE_ENABLED is not 'true'.
 */
export function getAvalancheRpcUrl(): string | null {
  if (!isChainEnabled('avalanche')) return null;

  // Check explicit override first
  if (process.env.AVALANCHE_RPC_URL) return process.env.AVALANCHE_RPC_URL;

  // Alchemy Avalanche (requires separate ALCHEMY_API_KEY + correct network slug)
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  const alchemyNetwork = process.env.AVALANCHE_ALCHEMY_NETWORK;
  if (alchemyKey && alchemyNetwork) {
    return `https://${alchemyNetwork}.g.alchemy.com/v2/${alchemyKey}`;
  }

  // Public fallback
  return CHAIN_CONFIGS.avalanche.publicRpcFallback;
}

/**
 * Returns the Polygon RPC URL, or null if not configured.
 * Returns null if CHAIN_POLYGON_ENABLED is not 'true'.
 */
export function getPolygonRpcUrl(): string | null {
  if (!isChainEnabled('polygon')) return null;

  if (process.env.POLYGON_RPC_URL) return process.env.POLYGON_RPC_URL;

  const alchemyKey = process.env.ALCHEMY_API_KEY;
  const alchemyNetwork =
    process.env.POLYGON_ALCHEMY_NETWORK || 'polygon-mainnet';
  if (alchemyKey) {
    return `https://${alchemyNetwork}.g.alchemy.com/v2/${alchemyKey}`;
  }

  return CHAIN_CONFIGS.polygon.publicRpcFallback;
}

/**
 * Returns the Sui RPC URL, or null if not configured.
 * Returns null if CHAIN_SUI_ENABLED is not 'true'.
 *
 * Note: Sui is non-EVM. The URL format is for Sui's JSON-RPC API,
 * not an EVM-compatible endpoint. Do not pass to ethers.JsonRpcProvider.
 */
export function getSuiRpcUrl(): string | null {
  if (!isChainEnabled('sui')) return null;

  if (process.env.SUI_RPC_URL) return process.env.SUI_RPC_URL;

  return CHAIN_CONFIGS.sui.publicRpcFallback;
}

// ─── Unified accessor ─────────────────────────────────────────────────────────

/**
 * Returns the RPC URL for the given chain slug, or null for unconfigured chains.
 *
 * Arbitrum and Ethereum always return a valid URL.
 * Expansion chains return null if disabled or not configured.
 */
export function getChainRpcUrl(slug: ChainSlug): string | null {
  switch (slug) {
    case 'arbitrum':
      return getArbitrumRpcUrl();
    case 'ethereum':
      return getEthereumRpcUrl();
    case 'avalanche':
      return getAvalancheRpcUrl();
    case 'polygon':
      return getPolygonRpcUrl();
    case 'sui':
      return getSuiRpcUrl();
    default:
      return null;
  }
}

/**
 * Returns a full provider config for the given chain, or null if unavailable.
 * Useful for admin dashboards and system health checks.
 */
export function getChainProviderConfig(slug: ChainSlug): ChainProviderConfig | null {
  const rpcUrl = getChainRpcUrl(slug);
  if (!rpcUrl) return null;

  const alchemyKey = process.env.ALCHEMY_API_KEY;
  const isAlchemy = !!alchemyKey && rpcUrl.includes('alchemy.com');
  const chainConfig = CHAIN_CONFIGS[slug];
  const isFallback =
    !isAlchemy &&
    rpcUrl === chainConfig?.publicRpcFallback;

  return { slug, rpcUrl, isAlchemy, isFallback };
}
