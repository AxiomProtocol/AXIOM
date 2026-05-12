/**
 * Avalanche C-Chain Contract Registry.
 *
 * Centralised address book for all Axiom Protocol contracts deployed
 * on Avalanche C-Chain (mainnet 43114) and Fuji testnet (43113).
 *
 * Addresses are populated after each phase deployment. Empty strings ("")
 * indicate contracts not yet deployed to that network.
 *
 * Usage:
 *   import { AVALANCHE_CONTRACTS, FUJI_CONTRACTS } from 'shared/contracts-avalanche';
 */

export interface AvalancheContractAddresses {
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
  /** ERC-3643-compliant AXUSD stablecoin. */
  AxiomStable3643:         string;
}

/** Avalanche C-Chain mainnet (43114) — populated post-Phase 2 mainnet deploy. */
export const AVALANCHE_CONTRACTS: AvalancheContractAddresses = {
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
 * Avalanche Fuji testnet (43113) — populated post-Phase 2 Fuji deploy.
 *
 * To populate: run `AVALANCHE_PHASE2_REAL_DEPLOY=true npm run deploy:avalanche:fuji`
 * and copy the addresses from deployments/avalanche/fuji-phase1.json.
 */
export const FUJI_CONTRACTS: AvalancheContractAddresses = {
  IdentityRegistryStorage: '',
  TrustedIssuersRegistry:  '',
  ClaimTopicsRegistry:     '',
  IdentityRegistry:        '',
  ModularCompliance:       '',
  CountryAllowModule:      '',
  TransferLimitModule:     '',
  AxiomStable3643:         '',
};

export const AVALANCHE_CHAIN_ID = 43114;
export const FUJI_CHAIN_ID      = 43113;

export type AvalancheNetwork = 'avalanche' | 'avalancheFuji';

export function getAvalancheContracts(network: AvalancheNetwork): AvalancheContractAddresses {
  return network === 'avalanche' ? AVALANCHE_CONTRACTS : FUJI_CONTRACTS;
}

export function isAvalancheContractsPopulated(contracts: AvalancheContractAddresses): boolean {
  return Object.values(contracts).every((addr) => addr !== '');
}
