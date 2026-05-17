/**
 * Axiom Protocol — Polygon Identity Adapter
 *
 * Reads on-chain ERC-3643 IdentityRegistry state from Polygon PoS.
 * Mirrors the pattern used by ERC3643Service.ts on Arbitrum.
 *
 * Bridge design: onchainid_mirror
 *   - Arbitrum One is the canonical identity source of truth.
 *   - This adapter reads the Polygon IdentityRegistry directly when contracts
 *     are deployed, so callers can verify whether a wallet's credential has
 *     been mirrored to Polygon.
 *   - Returns graceful "not deployed" state when contract addresses are empty.
 *
 * ERC-3643 IdentityRegistry ABI subset used:
 *   contains(address) → bool       — wallet is registered in the registry
 *   isVerified(address) → bool     — wallet has all required claims
 *   identity(address) → address    — returns the wallet's ONCHAINID contract
 *   investorCountry(address) → uint16 — ISO country code
 */

import { JsonRpcProvider, Contract } from 'ethers';
import { getPolygonRpcUrl } from '../../chains/providers';
import { isChainEnabled } from '../../chains/capabilities';
import { POLYGON_CONTRACTS, AMOY_CONTRACTS, isPolygonContractsPopulated } from '../../../shared/contracts-polygon';

// ─── Amoy RPC resolution ───────────────────────────────────────────────────────
// Amoy (chainId 80002) has a distinct RPC endpoint from Polygon mainnet (137).
// Resolution order:
//   1. POLYGON_AMOY_RPC_URL env override
//   2. Alchemy polygon-amoy network (if ALCHEMY_API_KEY is set)
//   3. Public Amoy RPC fallback

function getAmoyRpcUrl(): string | null {
  if (!isChainEnabled('polygon')) return null;

  if (process.env.POLYGON_AMOY_RPC_URL) return process.env.POLYGON_AMOY_RPC_URL;

  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (alchemyKey) {
    return `https://polygon-amoy.g.alchemy.com/v2/${alchemyKey}`;
  }

  return 'https://rpc-amoy.polygon.technology';
}

// ─── Minimal ERC-3643 IdentityRegistry ABI ────────────────────────────────────

const IDENTITY_REGISTRY_ABI = [
  'function contains(address _userAddress) view returns (bool)',
  'function isVerified(address _userAddress) view returns (bool)',
  'function identity(address _userAddress) view returns (address)',
  'function investorCountry(address _userAddress) view returns (uint16)',
] as const;

// ─── Return types ──────────────────────────────────────────────────────────────

export type PolygonIdentityNetwork = 'mainnet' | 'amoy';

export interface PolygonIdentityState {
  walletAddress:       string;
  network:             PolygonIdentityNetwork;
  chainId:             137 | 80002;
  contractsDeployed:   boolean;
  registered:          boolean;       // contains() result
  verified:            boolean;       // isVerified() result
  onchainId:           string | null; // identity() result — ONCHAINID contract address
  investorCountry:     number | null; // ISO 3166-1 numeric country code
  rpcReachable:        boolean;
  error:               string | null;
  checkedAt:           string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function notDeployedState(
  walletAddress: string,
  network: PolygonIdentityNetwork,
  chainId: 137 | 80002,
): PolygonIdentityState {
  return {
    walletAddress,
    network,
    chainId,
    contractsDeployed: false,
    registered:        false,
    verified:          false,
    onchainId:         null,
    investorCountry:   null,
    rpcReachable:      false,
    error:             'IdentityRegistry not yet deployed on this network.',
    checkedAt:         new Date().toISOString(),
  };
}

function chainDisabledState(walletAddress: string): PolygonIdentityState {
  return {
    walletAddress,
    network:           'mainnet',
    chainId:           137,
    contractsDeployed: false,
    registered:        false,
    verified:          false,
    onchainId:         null,
    investorCountry:   null,
    rpcReachable:      false,
    error:             'Polygon chain not enabled. Set CHAIN_POLYGON_ENABLED=true.',
    checkedAt:         new Date().toISOString(),
  };
}

// ─── Core implementation ───────────────────────────────────────────────────────

/**
 * Reads ERC-3643 IdentityRegistry state for a wallet on Polygon PoS mainnet.
 *
 * Returns graceful error state (never throws) when:
 *   - CHAIN_POLYGON_ENABLED is not set
 *   - No RPC URL is configured
 *   - IdentityRegistry address is empty (contracts not yet deployed)
 *   - RPC call fails
 */
export async function getPolygonIdentityState(
  walletAddress: string,
  network: PolygonIdentityNetwork = 'mainnet',
): Promise<PolygonIdentityState> {
  const chainId: 137 | 80002 = network === 'mainnet' ? 137 : 80002;
  const contracts = network === 'mainnet' ? POLYGON_CONTRACTS : AMOY_CONTRACTS;

  if (!isChainEnabled('polygon')) {
    return chainDisabledState(walletAddress);
  }

  // Select the correct RPC endpoint for the requested network
  const rpcUrl = network === 'amoy' ? getAmoyRpcUrl() : getPolygonRpcUrl();
  if (!rpcUrl) {
    return {
      ...notDeployedState(walletAddress, network, chainId),
      error: `No RPC URL configured for Polygon ${network}. Set ${network === 'amoy' ? 'POLYGON_AMOY_RPC_URL' : 'POLYGON_RPC_URL'} or ALCHEMY_API_KEY.`,
    };
  }

  if (!contracts.IdentityRegistry) {
    return notDeployedState(walletAddress, network, chainId);
  }

  try {
    const provider = new JsonRpcProvider(rpcUrl);
    const registry = new Contract(contracts.IdentityRegistry, IDENTITY_REGISTRY_ABI, provider);

    const [registered, verified] = await Promise.all([
      (registry.contains(walletAddress) as Promise<boolean>).catch(() => false),
      (registry.isVerified(walletAddress) as Promise<boolean>).catch(() => false),
    ]);

    let onchainId: string | null = null;
    let investorCountry: number | null = null;

    if (registered) {
      [onchainId, investorCountry] = await Promise.all([
        (registry.identity(walletAddress) as Promise<string>).catch(() => null),
        (registry.investorCountry(walletAddress) as Promise<bigint>)
          .then(v => Number(v))
          .catch(() => null),
      ]);
    }

    return {
      walletAddress,
      network,
      chainId,
      contractsDeployed: isPolygonContractsPopulated(contracts),
      registered,
      verified,
      onchainId,
      investorCountry,
      rpcReachable: true,
      error: null,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    // Log full error server-side only — never expose raw RPC messages or
    // API-key-bearing URLs to API clients.
    console.error('[polygon/identity] IdentityRegistry read failed:', err);
    return {
      walletAddress,
      network,
      chainId,
      contractsDeployed: isPolygonContractsPopulated(contracts),
      registered:      false,
      verified:        false,
      onchainId:       null,
      investorCountry: null,
      rpcReachable:    false,
      error: `Identity registry read failed on Polygon ${network}. Check server logs for details.`,
      checkedAt: new Date().toISOString(),
    };
  }
}

/**
 * Checks both Polygon mainnet and Amoy testnet identity state for a wallet.
 * Returns whichever network has a deployed contract and registered identity,
 * falling back to mainnet state if neither is available.
 */
export async function getPolygonIdentityStateBothNetworks(walletAddress: string): Promise<{
  mainnet: PolygonIdentityState;
  amoy:    PolygonIdentityState;
}> {
  const [mainnet, amoy] = await Promise.all([
    getPolygonIdentityState(walletAddress, 'mainnet'),
    getPolygonIdentityState(walletAddress, 'amoy'),
  ]);
  return { mainnet, amoy };
}
