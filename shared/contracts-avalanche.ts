/**
 * Avalanche C-Chain Contract Registry.
 *
 * Centralised address book for all Axiom Protocol contracts deployed
 * on Avalanche C-Chain (mainnet 43114) and Fuji testnet (43113).
 *
 * Addresses are populated after each phase deployment. Placeholder
 * strings ("") indicate contracts not yet deployed to that network.
 *
 * Usage:
 *   import { AVALANCHE_CONTRACTS, FUJI_CONTRACTS } from 'shared/contracts-avalanche';
 */

export interface AvalancheContractAddresses {
  /** AXUSD stablecoin on Avalanche C-Chain. */
  AXUSD: string;
  /** AXAU reserve instrument on Avalanche C-Chain. */
  AXAU: string;
  /** AXM governance token bridge receiver. */
  AXMBridge: string;
  /** Treasury multi-party vault. */
  Treasury: string;
  /** Land NAV oracle (Chainlink-compatible). */
  LandNAVOracle: string;
  /** Identity registry (ERC-3643). */
  IdentityRegistry: string;
  /** Compliance module. */
  Compliance: string;
  /** PSM (Peg Stability Module) — USDC ↔ AXUSD. */
  PSM: string;
}

/** Avalanche C-Chain mainnet (43114) — populated post-Phase 1 deploy. */
export const AVALANCHE_CONTRACTS: AvalancheContractAddresses = {
  AXUSD: '',
  AXAU: '',
  AXMBridge: '',
  Treasury: '',
  LandNAVOracle: '',
  IdentityRegistry: '',
  Compliance: '',
  PSM: '',
};

/** Avalanche Fuji testnet (43113) — populated post-Phase 1 Fuji deploy. */
export const FUJI_CONTRACTS: AvalancheContractAddresses = {
  AXUSD: '',
  AXAU: '',
  AXMBridge: '',
  Treasury: '',
  LandNAVOracle: '',
  IdentityRegistry: '',
  Compliance: '',
  PSM: '',
};

export const AVALANCHE_CHAIN_ID = 43114;
export const FUJI_CHAIN_ID = 43113;

export type AvalancheNetwork = 'avalanche' | 'avalancheFuji';

export function getAvalancheContracts(network: AvalancheNetwork): AvalancheContractAddresses {
  if (network === 'avalanche') return AVALANCHE_CONTRACTS;
  return FUJI_CONTRACTS;
}
