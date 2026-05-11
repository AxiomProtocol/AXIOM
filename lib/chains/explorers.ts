/**
 * Axiom Protocol — Chain Explorer URL Registry
 *
 * Canonical explorer URL helpers for all supported chains.
 *
 * ─── Design rules ────────────────────────────────────────────────────────────
 * 1. Unknown or unconfigured chains fall back to the Arbitrum Blockscout URL.
 * 2. This module does NOT modify lib/property/explorerLinks.ts — that file
 *    continues to serve live property payment receipt flows unchanged.
 * 3. No existing file imports from this module — for new code only.
 *
 * ─── Arbitrum default ────────────────────────────────────────────────────────
 * The canonical Arbitrum explorer is Blockscout (arbitrum.blockscout.com),
 * matching shared/contracts.ts NETWORK_CONFIG.blockExplorer.
 * Arbiscan (arbiscan.io) is the secondary explorer (used by explorerLinks.ts).
 */

import type { ChainSlug } from './config';
import { CHAIN_CONFIGS } from './config';

// ─── Explorer base URL map ────────────────────────────────────────────────────

const EXPLORER_BASE_URLS: Record<ChainSlug, string> = {
  arbitrum: 'https://arbitrum.blockscout.com',  // Matches NETWORK_CONFIG.blockExplorer
  ethereum: 'https://etherscan.io',
  avalanche: 'https://snowtrace.io',
  polygon: 'https://polygonscan.com',
  sui: 'https://suiexplorer.com',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the block explorer base URL for the given chain slug.
 * Falls back to the Arbitrum Blockscout URL for unknown slugs.
 */
export function getExplorerBaseUrl(slug: string): string {
  return (
    EXPLORER_BASE_URLS[slug as ChainSlug] ??
    CHAIN_CONFIGS.arbitrum.blockExplorerUrl
  );
}

/**
 * Returns the block explorer base URL for the given EVM chain ID.
 * Falls back to the Arbitrum Blockscout URL for unknown chain IDs.
 *
 * Note: Sui has no EVM chain ID — use getExplorerBaseUrl('sui') for Sui.
 */
export function getExplorerBaseUrlByChainId(chainId: number | null | undefined): string {
  if (chainId == null) return CHAIN_CONFIGS.arbitrum.blockExplorerUrl;

  const entry = Object.values(CHAIN_CONFIGS).find(c => c.chainId === chainId);
  return entry?.blockExplorerUrl ?? CHAIN_CONFIGS.arbitrum.blockExplorerUrl;
}

/**
 * Returns a transaction URL for the given chain and tx hash.
 * Falls back to Arbitrum Blockscout for unknown chains.
 *
 * @param slug     Chain slug ('arbitrum', 'polygon', etc.) or null/undefined
 * @param txHash   Transaction hash (with or without 0x prefix)
 */
export function getTxUrl(
  slug: string | null | undefined,
  txHash: string,
): string {
  const base = slug ? getExplorerBaseUrl(slug) : CHAIN_CONFIGS.arbitrum.blockExplorerUrl;
  const hash = ensure0x(txHash);
  return `${base}/tx/${hash}`;
}

/**
 * Returns an address URL for the given chain and address.
 * Falls back to Arbitrum Blockscout for unknown chains.
 */
export function getAddressUrl(
  slug: string | null | undefined,
  address: string,
): string {
  const base = slug ? getExplorerBaseUrl(slug) : CHAIN_CONFIGS.arbitrum.blockExplorerUrl;
  const addr = ensure0x(address);
  return `${base}/address/${addr}`;
}

/**
 * Returns a token URL for the given chain and contract address.
 * Falls back to Arbitrum Blockscout for unknown chains.
 */
export function getTokenUrl(
  slug: string | null | undefined,
  contractAddress: string,
): string {
  const base = slug ? getExplorerBaseUrl(slug) : CHAIN_CONFIGS.arbitrum.blockExplorerUrl;
  const addr = ensure0x(contractAddress);
  return `${base}/token/${addr}`;
}

/**
 * Variant of getTxUrl that accepts a numeric EVM chain ID instead of a slug.
 * Falls back to Arbitrum Blockscout for unknown chain IDs.
 * Useful when only the numeric chain ID is available.
 */
export function getTxUrlByChainId(
  chainId: number | null | undefined,
  txHash: string,
): string {
  const base = getExplorerBaseUrlByChainId(chainId);
  return `${base}/tx/${ensure0x(txHash)}`;
}

/**
 * Variant of getAddressUrl that accepts a numeric EVM chain ID.
 */
export function getAddressUrlByChainId(
  chainId: number | null | undefined,
  address: string,
): string {
  const base = getExplorerBaseUrlByChainId(chainId);
  return `${base}/address/${ensure0x(address)}`;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function ensure0x(value: string): string {
  return value.startsWith('0x') ? value : `0x${value}`;
}
