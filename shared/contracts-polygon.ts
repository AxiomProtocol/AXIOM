/**
 * Axiom Protocol — Polygon PoS Contract Registry
 *
 * Placeholder registry for the Polygon payments / treasury routing /
 * enterprise settlement layer.
 *
 * ─── Current status ──────────────────────────────────────────────────────────
 * Phase 3 (foundation): NO Axiom contracts are deployed on Polygon.
 * All Axiom contract addresses below are null until Phase 4+ deployment.
 * Only well-known third-party contract addresses (USDC) are populated.
 *
 * ─── What this file is ───────────────────────────────────────────────────────
 * Source of truth for Polygon contract addresses, analogous to:
 *   shared/contracts.ts        (Arbitrum — canonical source)
 *   shared/contracts-avalanche.ts (Avalanche — phase-deployed)
 *
 * ─── Design rules ────────────────────────────────────────────────────────────
 * 1. Arbitrum canonical contracts (shared/contracts.ts) are NOT duplicated here.
 * 2. All Axiom-deployed address fields start as null — add when deployed.
 * 3. Third-party well-known addresses (USDC native) are populated as constants.
 * 4. This file must not be imported by any live production route until
 *    CHAIN_POLYGON_ENABLED=true is approved for that environment.
 * 5. isChainEnabled('polygon') must be checked before any address is used.
 *
 * ─── Polygon PoS network info ────────────────────────────────────────────────
 * Chain ID:          137
 * Chain ID hex:      0x89
 * Native currency:   MATIC (POL after rebrand)
 * Block explorer:    https://polygonscan.com
 * Public RPC:        https://polygon-rpc.com
 * Alchemy network:   matic
 * Strategic role:    Payments / Treasury Routing / Enterprise Settlement
 */

// ─── Network configuration ────────────────────────────────────────────────────

export const POLYGON_CHAIN_ID = 137 as const;
export const POLYGON_CHAIN_ID_HEX = '0x89' as const;

export const POLYGON_NETWORK_CONFIG = {
  chainId:           POLYGON_CHAIN_ID,
  chainIdHex:        POLYGON_CHAIN_ID_HEX,
  chainName:         'Polygon PoS',
  rpcUrl:            'https://polygon-rpc.com',
  blockExplorer:     'https://polygonscan.com',
  blockExplorerName: 'Polygonscan',
  alchemyNetwork:    'matic',
  nativeCurrency: {
    name:     'POL',
    symbol:   'POL',
    decimals: 18,
  },
} as const;

// ─── Third-party well-known contracts ────────────────────────────────────────
//
// These are canonical Circle/third-party contracts. They are not deployed by
// Axiom. Addresses are stable and verified on-chain.

/**
 * USD Coin — Native (Circle-issued directly on Polygon PoS)
 *
 * This is the ONLY USDC variant acceptable for Axiom Polygon flows.
 * Do NOT use USDC.e (bridged from Ethereum) — bridge risk, liquidity
 * fragmentation, and accounting ambiguity.
 *
 * Verified: https://polygonscan.com/token/0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
 */
export const POLYGON_USDC_NATIVE = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as const;

/**
 * USD Coin.e — Bridged from Ethereum (LEGACY — do not use for new flows)
 *
 * Included for reference and detection only. This is the older USDC variant
 * that came via the Polygon PoS bridge from Ethereum. New flows must use
 * POLYGON_USDC_NATIVE instead.
 *
 * Verified: https://polygonscan.com/token/0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
 */
export const POLYGON_USDC_BRIDGED_LEGACY = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as const;

/**
 * WMATIC — Wrapped MATIC / POL
 *
 * Included for gas estimation and DEX routing reference only.
 * Not used for Axiom payment flows.
 */
export const POLYGON_WMATIC = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' as const;

// ─── Axiom-deployed contracts (Phase 3: all null) ────────────────────────────
//
// These addresses will be populated when Axiom contracts are deployed on
// Polygon in a future phase. Until then, all values are null.
// Code that reads these must handle null gracefully.

export const POLYGON_AXIOM_CONTRACTS = {
  /**
   * AXUSD settlement contract on Polygon.
   * Status: NOT DEPLOYED — Phase 3 foundation only.
   * Note: AXUSD issuance is Arbitrum-canonical. Any Polygon AXUSD contract
   * requires a separate architecture review and accepted-risk record before
   * deployment.
   */
  AXUSD_TOKEN: null as null,

  /**
   * Polygon ID issuer node / credential registry address.
   * Status: NOT DEPLOYED — requires Polygon ID SDK integration and issuer
   * node setup (see PolygonIdentityAdapterInterface.ts).
   */
  POLYGON_ID_ISSUER: null as null,

  /**
   * Treasury router / payment splitter contract (if needed in future phases).
   * Status: NOT DEPLOYED — Phase 3 uses direct wallet-to-wallet USDC transfer;
   * no contract required.
   */
  TREASURY_ROUTER: null as null,

  /**
   * Emergency pause / circuit breaker contract (if deployed in future).
   * Status: NOT DEPLOYED.
   */
  PAUSE_GUARDIAN: null as null,
} as const;

// ─── Settlement token map ─────────────────────────────────────────────────────

/**
 * The canonical settlement token for Axiom Polygon flows.
 * Always native USDC. Never bridged USDC.e.
 */
export const POLYGON_SETTLEMENT_TOKEN = POLYGON_USDC_NATIVE;

/**
 * Returns the address of the primary settlement token on Polygon.
 * Throws if somehow called with an unsupported token symbol.
 */
export function getPolygonTokenAddress(symbol: 'USDC'): string {
  switch (symbol) {
    case 'USDC':
      return POLYGON_USDC_NATIVE;
    default: {
      const _exhaustive: never = symbol;
      throw new Error(`Unsupported Polygon token symbol: ${_exhaustive}`);
    }
  }
}

// ─── Type exports ─────────────────────────────────────────────────────────────

export type PolygonAxiomContractKey = keyof typeof POLYGON_AXIOM_CONTRACTS;
