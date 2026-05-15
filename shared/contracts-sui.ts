/**
 * Axiom Protocol — Sui Contract / Object Registry
 *
 * Placeholder registry for the Sui distribution / community layer.
 *
 * ─── Current status ──────────────────────────────────────────────────────────
 * Phase 4 (foundation): NO Axiom packages are deployed on Sui.
 * All Axiom object-ID fields below are null until a future deployment phase.
 * No well-known third-party Sui object IDs are included at this time.
 *
 * ─── Sui vs EVM distinction ──────────────────────────────────────────────────
 * Sui is NOT EVM-compatible. Key differences that affect this file:
 *
 *   • No EVM addresses (0x...). Sui uses 32-byte object IDs.
 *   • Contracts are Move packages, identified by a package object ID.
 *   • Tokens are Coin<T> types, identified by a type tag (package::module::Type).
 *   • There is no chain ID integer. Sui identifies networks by genesis hash.
 *   • Do NOT pass Sui RPC URLs to ethers.JsonRpcProvider — incompatible.
 *   • The Mysten Labs SDK (@mysten/sui) must be used for all Sui operations.
 *     This SDK is NOT yet installed in the Axiom project (Phase 4 scope).
 *
 * ─── What this file is ───────────────────────────────────────────────────────
 * Source of truth for Sui object IDs and package IDs, analogous to:
 *   shared/contracts.ts          (Arbitrum — canonical source)
 *   shared/contracts-polygon.ts  (Polygon — Phase 5)
 *   shared/contracts-avalanche.ts (Avalanche — phase-deployed)
 *
 * ─── Design rules ────────────────────────────────────────────────────────────
 * 1. Arbitrum canonical contracts are NOT duplicated here.
 * 2. All Axiom-deployed object-ID fields start as null — add when deployed.
 * 3. This file must not be imported by any live production route until
 *    CHAIN_SUI_ENABLED=true is approved for that environment.
 * 4. isChainEnabled('sui') (lib/chains/capabilities.ts) must be checked
 *    before any value is used.
 * 5. SUI_RPC_URL is optional. When absent, public fallback is used.
 *    Missing this var must NOT break the build.
 *
 * ─── Sui network info ────────────────────────────────────────────────────────
 * Chain type:        Non-EVM (Move VM)
 * Chain ID (EVM):    None — uses genesis hash for network identification
 * Native currency:   SUI (9 decimals)
 * Block explorer:    https://suiscan.xyz
 * Public RPC:        https://fullnode.mainnet.sui.io
 * Strategic role:    Distribution / Community / Diaspora
 */

// ─── Network configuration ────────────────────────────────────────────────────

export const SUI_CHAIN_TYPE = 'non_evm' as const;

export const SUI_NETWORK_CONFIG = {
  chainType:         SUI_CHAIN_TYPE,
  chainName:         'Sui',
  rpcUrl:            'https://fullnode.mainnet.sui.io',
  blockExplorer:     'https://suiscan.xyz',
  blockExplorerName: 'Suiscan',
  nativeCurrency: {
    name:     'Sui',
    symbol:   'SUI',
    decimals: 9,
  },
} as const;

// ─── Axiom-deployed packages (Phase 4: all null) ──────────────────────────────
//
// These object IDs will be populated when Axiom Move packages are deployed on
// Sui in a future phase. Until then, all values are null.
// Code that reads these must handle null gracefully.
//
// Object ID format: '0x' followed by 64 hex characters (32 bytes).
// Type tag format:  '<packageId>::<module>::<TypeName>'

export const SUI_AXIOM_OBJECTS = {
  /**
   * Axiom distribution Move package ID on Sui Mainnet.
   * Status: NOT DEPLOYED — Phase 4 foundation only.
   * Future use: community token distribution, diaspora wallet airdrop flows.
   * Note: Deploy with `sui client publish` — not compatible with EVM tooling.
   */
  DISTRIBUTION_PACKAGE: null as null,

  /**
   * AXM token coin type on Sui (for community distribution mirror).
   * Status: NOT DEPLOYED.
   * Format when deployed: '<packageId>::axm::AXM'
   * Note: AXM issuance is Arbitrum-canonical. Any Sui AXM representation
   * is a community distribution instrument, not the canonical governance token.
   */
  AXM_COIN_TYPE: null as null,

  /**
   * AXUSD stablecoin coin type on Sui (if future settlement layer is added).
   * Status: NOT DEPLOYED — outside Phase 4 scope.
   * Note: AXUSD issuance is Arbitrum-canonical (ERC-3643). Any Sui AXUSD
   * representation requires separate architecture review and accepted-risk
   * record before deployment.
   */
  AXUSD_COIN_TYPE: null as null,

  /**
   * Axiom community treasury shared object ID on Sui.
   * Status: NOT DEPLOYED.
   * Future use: community fund holding, distribution pool management.
   */
  COMMUNITY_TREASURY: null as null,

  /**
   * Kiosk policy or allowlist object for NFT/badge distribution on Sui.
   * Status: NOT DEPLOYED.
   * Future use: community badge gating, founder NFT equivalents on Sui.
   */
  KIOSK_POLICY: null as null,
} as const;

// ─── Distribution token map ───────────────────────────────────────────────────

/**
 * Returns the Sui coin type for the given Axiom token symbol, or null if
 * the package has not been deployed yet.
 *
 * All values are null in Phase 4. This function exists to establish the
 * pattern for future deployment phases.
 */
export function getSuiCoinType(symbol: 'AXM' | 'AXUSD'): string | null {
  switch (symbol) {
    case 'AXM':
      return SUI_AXIOM_OBJECTS.AXM_COIN_TYPE;
    case 'AXUSD':
      return SUI_AXIOM_OBJECTS.AXUSD_COIN_TYPE;
    default: {
      const _exhaustive: never = symbol;
      throw new Error(`Unsupported Sui token symbol: ${_exhaustive}`);
    }
  }
}

// ─── Type exports ─────────────────────────────────────────────────────────────

export type SuiAxiomObjectKey = keyof typeof SUI_AXIOM_OBJECTS;
