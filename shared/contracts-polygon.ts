/**
 * Polygon PoS Contract Registry.
 *
 * Centralised address book for all Axiom Protocol contracts deployed
 * on Polygon PoS mainnet (chainId 137) and Amoy testnet (chainId 80002).
 *
 * Addresses are populated after each phase deployment. Empty strings ("")
 * indicate contracts not yet deployed to that network.
 *
 * Usage:
 *   import { POLYGON_CONTRACTS, AMOY_CONTRACTS } from 'shared/contracts-polygon';
 */

export interface PolygonContractAddresses {
  /** ERC-3643 KYC storage layer. */
  IdentityRegistryStorage: string;
  /** Registry of trusted claim issuers. */
  TrustedIssuersRegistry:  string;
  /** Registry of required claim topics. */
  ClaimTopicsRegistry:     string;
  /** Main ERC-3643 identity registry (wires storage + issuers + topics). */
  IdentityRegistry:        string;
  /** Modular compliance engine (holds CountryAllow + TransferLimit modules). */
  ModularCompliance:       string;
  /** Compliance module — country allowlist. */
  CountryAllowModule:      string;
  /** Compliance module — per-wallet daily transfer limit. */
  TransferLimitModule:     string;
  /** ERC-3643-compliant AXUSD stablecoin on Polygon PoS. */
  AxiomStable3643:         string;
}

/**
 * Polygon PoS mainnet (137) — populated post-Phase 2 mainnet deploy.
 * Run: POLYGON_MAINNET_REAL_DEPLOY=true npm run deploy:polygon:mainnet
 */
export const POLYGON_CONTRACTS: PolygonContractAddresses = {
  IdentityRegistryStorage: '',
  TrustedIssuersRegistry:  '',
  ClaimTopicsRegistry:     '',
  IdentityRegistry:        '',
  ModularCompliance:       '',
  CountryAllowModule:      '',
  TransferLimitModule:     '',
  AxiomStable3643:         '',
};

/**
 * Polygon Amoy testnet (80002) — populated post-Phase 2 Amoy deploy.
 * Run: POLYGON_AMOY_REAL_DEPLOY=true npm run deploy:polygon:amoy
 */
export const AMOY_CONTRACTS: PolygonContractAddresses = {
  IdentityRegistryStorage: '',
  TrustedIssuersRegistry:  '',
  ClaimTopicsRegistry:     '',
  IdentityRegistry:        '',
  ModularCompliance:       '',
  CountryAllowModule:      '',
  TransferLimitModule:     '',
  AxiomStable3643:         '',
};

export const POLYGON_CHAIN_ID = 137;
export const AMOY_CHAIN_ID    = 80002;

export type PolygonNetwork = 'polygon' | 'polygonAmoy';

export function getPolygonContracts(network: PolygonNetwork): PolygonContractAddresses {
  return network === 'polygon' ? POLYGON_CONTRACTS : AMOY_CONTRACTS;
}

export function isPolygonContractsPopulated(contracts: PolygonContractAddresses): boolean {
  return Object.values(contracts).every((addr) => addr !== '');
}
