/**
 * Axiom Protocol — lib/chains barrel export
 *
 * Import from this barrel for all chain infrastructure access:
 *
 *   import { getChainConfig, DEFAULT_CHAIN } from '@/lib/chains';
 *   import { isChainEnabled, isChainCapable } from '@/lib/chains';
 *   import { getArbitrumRpcUrl, getChainRpcUrl } from '@/lib/chains';
 *   import { getTxUrl, getAddressUrl } from '@/lib/chains';
 *   import { getContractAddress } from '@/lib/chains';
 *
 * ─── What this module provides ────────────────────────────────────────────────
 * config.ts      — Chain metadata registry (chain IDs, names, explorers, etc.)
 * capabilities.ts — Feature-flagged capability map (all expansion chains off by default)
 * providers.ts   — RPC URL factory (Arbitrum always resolves; others return null)
 * explorers.ts   — Block explorer URL helpers (Arbitrum default fallback)
 * contracts.ts   — Contract address registry (Arbitrum live; others null until deployed)
 *
 * ─── What this module does NOT do ────────────────────────────────────────────
 * - Does not modify any existing file
 * - Does not replace lib/multichain/ (that module remains in place)
 * - Does not replace shared/contracts.ts (that remains the Arbitrum source of truth)
 * - Does not add any new required environment variables
 */

export * from './config';
export * from './capabilities';
export * from './providers';
export * from './explorers';
export * from './contracts';
