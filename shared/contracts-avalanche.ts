/**
 * Avalanche contract registry placeholders (Phase 1 Fuji scaffold only).
 *
 * This file is additive and intentionally separate from shared/contracts.ts,
 * which remains Arbitrum-canonical.
 */

export type AvalanchePhase1ContractKey =
  | "IdentityRegistryStorage"
  | "TrustedIssuersRegistry"
  | "ClaimTopicsRegistry"
  | "IdentityRegistry"
  | "ModularCompliance"
  | "CountryAllowModule"
  | "TransferLimitModule"
  | "AxiomStable3643Fuji";

export const AVALANCHE_NETWORKS = {
  FUJI: {
    chainId: 43113,
    rpcFallback: "https://api.avax-test.network/ext/bc/C/rpc",
    explorer: "https://testnet.snowtrace.io",
  },
  MAINNET: {
    chainId: 43114,
    rpcFallback: "https://api.avax.network/ext/bc/C/rpc",
    explorer: "https://snowtrace.io",
  },
} as const;

export const AVALANCHE_PHASE1_FUJI_CONTRACTS: Record<AvalanchePhase1ContractKey, string | null> = {
  IdentityRegistryStorage: null,
  TrustedIssuersRegistry: null,
  ClaimTopicsRegistry: null,
  IdentityRegistry: null,
  ModularCompliance: null,
  CountryAllowModule: null,
  TransferLimitModule: null,
  AxiomStable3643Fuji: null,
} as const;
