/**
 * Axiom Protocol — Multi-Chain Contract Address Registry
 *
 * Typed structure for contract addresses across supported chains.
 *
 * ─── Design rules ────────────────────────────────────────────────────────────
 * 1. This module does NOT duplicate addresses from shared/contracts.ts.
 *    Arbitrum contract addresses are referenced from there by import.
 * 2. Expansion chain sections (Avalanche, Polygon, Sui) are empty/null until
 *    contracts are deployed on those chains.
 * 3. getContractAddress() returns null (never throws) for unconfigured chains.
 * 4. No existing file imports from this module — for new code only.
 *
 * ─── Arbitrum (source of truth: shared/contracts.ts) ────────────────────────
 * The Arbitrum section references selected addresses from shared/contracts.ts.
 * Do not add addresses here that are not already in shared/contracts.ts.
 * shared/contracts.ts remains the authoritative source for Arbitrum.
 *
 * ─── Expansion chains ────────────────────────────────────────────────────────
 * Placeholder entries are included for Avalanche, Polygon, and Sui.
 * All values are null until contracts are deployed and addresses are known.
 * When addresses are known, add them here and remove the null.
 */

import { ERC3643_CONTRACTS } from '../../shared/contracts-3643';
import { CORE_CONTRACTS as SHARED_CORE } from '../../shared/contracts';
import type { ChainSlug } from './config';
import { isChainEnabled } from './capabilities';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Core token/protocol contract addresses per chain.
 * All fields are optional — null means not yet deployed on that chain.
 */
export interface CoreContractAddresses {
  /** Primary Axiom stablecoin. Arbitrum: AXUSD (ERC-3643 GENIUS-compliant). */
  axusd: string | null;
  /** Reserve token backed by PAXG. Arbitrum-canonical. */
  axau: string | null;
  /** Protocol governance/utility token. */
  axm: string | null;
  /** Identity compliance hub (ERC-3643 ONCHAINID). Arbitrum-canonical. */
  identityCompliance: string | null;
  /** Treasury and revenue hub. */
  treasuryHub: string | null;
  /** Staking and emissions hub. */
  stakingHub: string | null;
}

export interface ContractRegistryEntry {
  slug: ChainSlug;
  core: CoreContractAddresses;
  /** True if at least one contract address is populated for this chain. */
  hasDeployments: boolean;
}

// ─── Arbitrum (live — references shared/contracts.ts) ────────────────────────

const ARBITRUM_CORE: CoreContractAddresses = {
  axusd: ERC3643_CONTRACTS?.AXUSD_TOKEN ?? null,
  axau: null, // AXAU contract address from shared/contracts.ts axau-specific exports
  axm: SHARED_CORE.AXM_TOKEN,
  identityCompliance: SHARED_CORE.IDENTITY_COMPLIANCE,
  treasuryHub: SHARED_CORE.TREASURY_REVENUE,
  stakingHub: SHARED_CORE.STAKING_EMISSIONS,
};

// ─── Avalanche (future — all null until deployed) ─────────────────────────────

const AVALANCHE_CORE: CoreContractAddresses = {
  axusd: null,           // Not yet deployed — reserved for future issuance module
  axau: null,            // Not yet deployed — reserved for future reserve zone
  axm: null,             // Not yet deployed
  identityCompliance: null,  // Identity remains canonical on Arbitrum
  treasuryHub: null,
  stakingHub: null,
};

// ─── Polygon (future — all null until deployed) ───────────────────────────────

const POLYGON_CORE: CoreContractAddresses = {
  axusd: null,           // Not yet deployed — reserved for future settlement layer
  axau: null,            // Not Polygon's role
  axm: null,             // Distribution TBD
  identityCompliance: null,  // Polygon ID adapter address TBD
  treasuryHub: null,
  stakingHub: null,
};

// ─── Sui (future — all null until deployed) ───────────────────────────────────
// Sui uses object IDs (32-byte) not EVM addresses. These fields will hold
// Sui package IDs and object IDs when Sui integration is built.

const SUI_CORE: CoreContractAddresses = {
  axusd: null,           // Future: Sui Move package object ID
  axau: null,
  axm: null,             // Future: Sui token object ID for community distribution
  identityCompliance: null,
  treasuryHub: null,
  stakingHub: null,
};

// ─── Registry ─────────────────────────────────────────────────────────────────

const CONTRACT_REGISTRY: Record<ChainSlug, ContractRegistryEntry> = {
  arbitrum: {
    slug: 'arbitrum',
    core: ARBITRUM_CORE,
    hasDeployments: true,
  },
  avalanche: {
    slug: 'avalanche',
    core: AVALANCHE_CORE,
    hasDeployments: false,
  },
  polygon: {
    slug: 'polygon',
    core: POLYGON_CORE,
    hasDeployments: false,
  },
  sui: {
    slug: 'sui',
    core: SUI_CORE,
    hasDeployments: false,
  },
  ethereum: {
    slug: 'ethereum',
    core: {
      axusd: null,
      axau: null,
      axm: null,
      identityCompliance: null,
      treasuryHub: null,
      stakingHub: null,
    },
    hasDeployments: false, // Ethereum is reserve-reference only — no Axiom contracts
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the full contract registry entry for a chain, or null if the chain
 * is not enabled or not found.
 *
 * Arbitrum always returns a valid entry regardless of feature flags.
 */
export function getChainContractRegistry(
  slug: ChainSlug,
): ContractRegistryEntry | null {
  if (slug !== 'arbitrum' && slug !== 'ethereum' && !isChainEnabled(slug)) {
    return null;
  }
  return CONTRACT_REGISTRY[slug] ?? null;
}

/**
 * Returns a specific contract address for a chain and key, or null if:
 *   - The chain is not enabled
 *   - The chain has no deployment for that contract
 *   - The chain is not in the registry
 *
 * Never throws. Callers must handle null.
 */
export function getContractAddress(
  slug: ChainSlug,
  key: keyof CoreContractAddresses,
): string | null {
  const registry = getChainContractRegistry(slug);
  if (!registry) return null;
  return registry.core[key] ?? null;
}

/**
 * Returns all chains that have at least one deployed contract address.
 */
export function getChainsWithDeployments(): ContractRegistryEntry[] {
  return Object.values(CONTRACT_REGISTRY).filter(
    entry => entry.hasDeployments && (
      entry.slug === 'arbitrum' ||
      entry.slug === 'ethereum' ||
      isChainEnabled(entry.slug)
    ),
  );
}
