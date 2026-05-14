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
  IdentityRegistryStorage: '0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215',
  TrustedIssuersRegistry:  '0x0dF7D62f7Eda24798f6840D5B10E453de097D324',
  ClaimTopicsRegistry:     '0x207BE0EE444c82AC4252284a04e6D9101Dfa570c',
  IdentityRegistry:        '0x75ed20d260292D869f9Ec4F035Db4B93072D7963',
  ModularCompliance:       '0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66',
  CountryAllowModule:      '0xe15Cf94D324cc8882015ed71C39F002e3709ec54',
  TransferLimitModule:     '0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc',
  AxiomStable3643:         '0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8',
};

/**
 * Avalanche Fuji testnet (43113) — populated post-Phase 2 Fuji deploy.
 *
 * To populate: run `AVALANCHE_PHASE2_REAL_DEPLOY=true npm run deploy:avalanche:fuji`
 * and copy the addresses from deployments/avalanche/fuji-phase1.json.
 */
export const FUJI_CONTRACTS: AvalancheContractAddresses = {
  IdentityRegistryStorage: '0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215',
  TrustedIssuersRegistry:  '0x0dF7D62f7Eda24798f6840D5B10E453de097D324',
  ClaimTopicsRegistry:     '0x207BE0EE444c82AC4252284a04e6D9101Dfa570c',
  IdentityRegistry:        '0x75ed20d260292D869f9Ec4F035Db4B93072D7963',
  ModularCompliance:       '0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66',
  CountryAllowModule:      '0xe15Cf94D324cc8882015ed71C39F002e3709ec54',
  TransferLimitModule:     '0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc',
  AxiomStable3643:         '0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8',
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
