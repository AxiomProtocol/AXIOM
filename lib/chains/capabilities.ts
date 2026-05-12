/**
 * Axiom Protocol — Chain Capability Flags
 *
 * Feature-flagged chain capability map for the multi-chain strategic model.
 *
 * All expansion chains default to DISABLED. No page, route, or service will
 * exhibit multi-chain behavior unless the relevant env vars are explicitly
 * set to 'true' in that environment.
 *
 * ─── Flag hierarchy ──────────────────────────────────────────────────────────
 * 1. MULTICHAIN_ENABLED must be 'true' for any expansion chain to activate.
 * 2. CHAIN_<CHAIN>_ENABLED must be 'true' for that specific chain to activate.
 * 3. Arbitrum and Ethereum are always active regardless of flags.
 *
 * ─── Relationship to lib/multichain/featureFlags.ts ─────────────────────────
 * This module coexists with (does not replace) lib/multichain/featureFlags.ts.
 * That module uses ENABLE_<CHAIN>_<ROLE> naming for the original expansion model.
 * This module uses MULTICHAIN_ENABLED + CHAIN_<CHAIN>_ENABLED for the updated
 * strategic model (Avalanche reserve/policy core, Polygon payments/settlement,
 * Sui distribution/community).
 *
 * ─── Design rules ────────────────────────────────────────────────────────────
 * 1. isMultichainEnabled() must be checked before any isChainCapable() call.
 * 2. All helpers return false (never throw) when flags are absent or disabled.
 * 3. No existing file imports from this module.
 */

import type { ChainSlug } from './config';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChainCapabilityKey =
  | 'settlement'        // Can settle AXUSD or stablecoin transactions
  | 'reserve'           // Can hold / manage reserve assets
  | 'issuance'          // Can issue or control token supply
  | 'policy'            // Can execute compliance / policy logic
  | 'payments'          // Can route payments to users / enterprises
  | 'treasury'          // Can hold treasury assets / route treasury flows
  | 'identity'          // Can issue or verify identity credentials
  | 'distribution'      // Can distribute tokens to wallets (community / diaspora)
  | 'governance';       // Can participate in protocol governance

export interface ChainCapabilities {
  slug: ChainSlug;
  enabled: boolean;
  capabilities: Record<ChainCapabilityKey, boolean>;
}

// ─── Static capability definitions ───────────────────────────────────────────
// These represent the INTENDED future capability set for each chain.
// They only take effect when the chain is enabled via feature flags.

const ARBITRUM_CAPABILITIES: Record<ChainCapabilityKey, boolean> = {
  settlement: true,
  reserve: true,
  issuance: true,
  policy: true,
  payments: false,    // Payments routed via Increase ACH, not Arbitrum itself
  treasury: true,
  identity: true,
  distribution: false, // Distribution is Sui's strategic role
  governance: true,
};

const AVALANCHE_CAPABILITIES: Record<ChainCapabilityKey, boolean> = {
  settlement: false,   // Arbitrum remains canonical settlement layer
  reserve: true,       // Reserve logic core for capital zones
  issuance: true,      // Permissioned issuance in capital environments
  policy: true,        // Compliance-aware policy enforcement
  payments: false,     // Not Avalanche's role
  treasury: true,      // Capital zone treasury operations
  identity: false,     // Identity is Arbitrum-canonical (ERC-3643)
  distribution: false,
  governance: false,   // Governance remains on Arbitrum
};

const POLYGON_CAPABILITIES: Record<ChainCapabilityKey, boolean> = {
  settlement: true,    // Enterprise settlement layer
  reserve: false,      // Not Polygon's role
  issuance: false,     // Issuance is Arbitrum/Avalanche
  policy: false,       // Policy enforcement is Arbitrum/Avalanche
  payments: true,      // Primary payments / treasury routing role
  treasury: true,      // Treasury routing for enterprise flows
  identity: true,      // Polygon ID credential delivery (attested, not canonical)
  distribution: false,
  governance: false,
};

const SUI_CAPABILITIES: Record<ChainCapabilityKey, boolean> = {
  settlement: false,   // Not Sui's role
  reserve: false,
  issuance: false,     // Issuance is Arbitrum/Avalanche canonical
  policy: false,
  payments: false,     // Payments via Polygon / Stellar
  treasury: false,
  identity: false,     // Identity attestation only (read from Arbitrum)
  distribution: true,  // Primary distribution / community / diaspora role
  governance: false,
};

const ETHEREUM_CAPABILITIES: Record<ChainCapabilityKey, boolean> = {
  settlement: false,
  reserve: true,       // PAXG reserve asset lives on Ethereum
  issuance: false,
  policy: false,
  payments: false,
  treasury: false,
  identity: false,
  distribution: false,
  governance: false,
};

const STATIC_CAPABILITIES: Record<ChainSlug, Record<ChainCapabilityKey, boolean>> = {
  arbitrum: ARBITRUM_CAPABILITIES,
  avalanche: AVALANCHE_CAPABILITIES,
  polygon: POLYGON_CAPABILITIES,
  sui: SUI_CAPABILITIES,
  ethereum: ETHEREUM_CAPABILITIES,
};

// ─── Flag evaluation ──────────────────────────────────────────────────────────

/**
 * Returns true if multi-chain expansion is globally enabled.
 * Defaults to false — existing behavior is fully preserved when absent.
 */
export function isMultichainEnabled(): boolean {
  return process.env.MULTICHAIN_ENABLED === 'true';
}

/**
 * Returns true if a specific expansion chain is enabled.
 * Arbitrum and Ethereum are always enabled (no flag required).
 * All other chains require both MULTICHAIN_ENABLED=true and their own flag.
 */
export function isChainEnabled(slug: ChainSlug): boolean {
  // Core chains are always available
  if (slug === 'arbitrum' || slug === 'ethereum') return true;

  // Global gate must be open first
  if (!isMultichainEnabled()) return false;

  // Chain-specific flag
  const envVarMap: Partial<Record<ChainSlug, string>> = {
    avalanche: 'CHAIN_AVALANCHE_ENABLED',
    polygon: 'CHAIN_POLYGON_ENABLED',
    sui: 'CHAIN_SUI_ENABLED',
  };

  const envVar = envVarMap[slug];
  if (!envVar) return false;

  return process.env[envVar] === 'true';
}

/**
 * Returns true if a specific chain has a specific capability AND is enabled.
 * Always returns false for disabled chains — never throws.
 */
export function isChainCapable(slug: ChainSlug, capability: ChainCapabilityKey): boolean {
  if (!isChainEnabled(slug)) return false;
  return STATIC_CAPABILITIES[slug]?.[capability] ?? false;
}

/**
 * Returns the full capability descriptor for a chain.
 * The `enabled` field reflects the current feature flag state.
 */
export function getChainCapabilities(slug: ChainSlug): ChainCapabilities {
  const enabled = isChainEnabled(slug);
  const capabilities = STATIC_CAPABILITIES[slug] ?? ({} as Record<ChainCapabilityKey, boolean>);
  return { slug, enabled, capabilities };
}

/**
 * Returns all chains that are currently enabled.
 * Arbitrum and Ethereum are always included.
 */
export function getEnabledChains(): ChainSlug[] {
  const all: ChainSlug[] = ['arbitrum', 'ethereum', 'avalanche', 'polygon', 'sui'];
  return all.filter(isChainEnabled);
}

/**
 * Returns a snapshot of all flag states for admin dashboards or system maps.
 */
export function getAllCapabilityFlags(): {
  multichainEnabled: boolean;
  chains: Record<ChainSlug, { enabled: boolean; flagEnvVar: string | null }>;
} {
  return {
    multichainEnabled: isMultichainEnabled(),
    chains: {
      arbitrum: { enabled: true, flagEnvVar: null },
      ethereum: { enabled: true, flagEnvVar: null },
      avalanche: { enabled: isChainEnabled('avalanche'), flagEnvVar: 'CHAIN_AVALANCHE_ENABLED' },
      polygon: { enabled: isChainEnabled('polygon'), flagEnvVar: 'CHAIN_POLYGON_ENABLED' },
      sui: { enabled: isChainEnabled('sui'), flagEnvVar: 'CHAIN_SUI_ENABLED' },
    },
  };
}
