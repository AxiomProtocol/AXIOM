/**
 * lib/reserves/phase3/feeds/issuerNavFetcher.ts
 *
 * Phase 4 — Issuer NAV API fetcher for tokenized T-Bill and Treasury Fund assets.
 *
 * Fetch strategy (per asset):
 *
 *   thBILL (Theo Market)
 *     Primary:  GET https://api.theomarket.io/v1/nav/thBILL
 *     Fallback: Ethereum public RPC — ERC-4626 convertToAssets(1e18)
 *
 *   BUIDL (BlackRock)
 *     Primary:  GET https://api.blackrock.com/v2/funds/BUIDL/nav  (not public)
 *     Fallback: Ethereum public RPC — ERC-4626 convertToAssets(1e18)
 *     Note:     BUIDL maintains $1.00 NAV by design; on-chain returns confirmed $1.00.
 *
 *   USDY (Ondo Finance)
 *     Primary:  GET https://api.ondo.finance/api/v1/fund/usdy/nav
 *     Fallback: Arbitrum RPC — ERC-4626 convertToAssets(1e18)
 *
 * If both primary and fallback fail, returns null.
 * Caller (TreasuryNAVOracleService) builds the UNUSABLE observation.
 */

import { ethers } from 'ethers';

// ERC-4626 minimal ABI for convertToAssets
const ERC4626_ABI = [
  'function convertToAssets(uint256 shares) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
];

// Known on-chain addresses
const ASSET_ADDRESSES: Record<string, { address: string; chainId: number; decimals: number }> = {
  'ondo-usdy-tokenized-govmmf-planned': {
    address: '0x35e050d3C0eC2d29D269a8EcEa763a183bDF9A9D', // USDY on Arbitrum
    chainId: 42161,
    decimals: 18,
  },
  'buidl-tokenized-treasury-planned': {
    address: '0x7712c34205737192402172409a8F7ccef8aA2AEc', // BUIDL on Ethereum mainnet (chainId 1)
    chainId: 1,
    decimals: 6,
  },
  // thBILL on Arbitrum (placeholder — update when Theo Market deploys)
  'thbill-theo-market-planned': {
    address: '0x0000000000000000000000000000000000000001',
    chainId: 42161,
    decimals: 18,
  },
};

// Public API endpoints (unauthenticated).
// BUIDL: BlackRock has no public NAV REST API. On-chain ERC-4626 is the authoritative
// primary source for BUIDL (maintained at $1.00 by design, verifiable via convertToAssets).
const ISSUER_API_ENDPOINTS: Record<string, string> = {
  'ondo-usdy-tokenized-govmmf-planned': 'https://api.ondo.finance/api/v1/fund/usdy/nav',
  'buidl-tokenized-treasury-planned':   '', // Intentionally empty — use ERC-4626 on-chain as primary
  'thbill-theo-market-planned':          'https://api.theomarket.io/v1/nav/thBILL',
};

export interface IssuerNavResult {
  nav: number;
  source: 'ISSUER_API' | 'ERC4626_ONCHAIN';
  fetchedAt: string;
  isFallback: boolean;
  notes: string;
}

function getArbitrumRpcUrl(): string {
  const key = process.env.ALCHEMY_API_KEY;
  if (key) return `https://arb-mainnet.g.alchemy.com/v2/${key}`;
  return 'https://arb1.arbitrum.io/rpc';
}

function getEthereumRpcUrl(): string {
  const key = process.env.ALCHEMY_API_KEY;
  if (key) return `https://eth-mainnet.g.alchemy.com/v2/${key}`;
  return 'https://eth.llamarpc.com';
}

async function tryIssuerApi(assetId: string): Promise<number | null> {
  const endpoint = ISSUER_API_ENDPOINTS[assetId];
  if (!endpoint) return null;

  try {
    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6_000),
    });

    if (!res.ok) return null;

    const data = await res.json() as Record<string, unknown>;

    // Try common NAV field names used by different issuers
    const navRaw =
      (data as Record<string, unknown>).nav ??
      (data as Record<string, unknown>).navPerToken ??
      (data as Record<string, unknown>).price ??
      ((data as Record<string, unknown>).data as Record<string, unknown>)?.nav ??
      ((data as Record<string, unknown>).data as Record<string, unknown>)?.price;

    const nav = parseFloat(String(navRaw));
    if (isNaN(nav) || nav <= 0) return null;
    return nav;
  } catch {
    return null;
  }
}

async function tryOnChainConvertToAssets(assetId: string): Promise<number | null> {
  const assetConfig = ASSET_ADDRESSES[assetId];
  if (!assetConfig) return null;
  if (assetConfig.address === '0x0000000000000000000000000000000000000001') return null;
  if (assetConfig.address === '0x0000000000000000000000000000000000000000') return null;

  const rpcUrl = assetConfig.chainId === 1 ? getEthereumRpcUrl() : getArbitrumRpcUrl();

  let provider: ethers.JsonRpcProvider | null = null;
  try {
    provider = new ethers.JsonRpcProvider(rpcUrl, assetConfig.chainId, { staticNetwork: true });
    const contract = new ethers.Contract(assetConfig.address, ERC4626_ABI, provider);

    const oneShare = BigInt(10 ** assetConfig.decimals);
    const assets = await Promise.race([
      contract.convertToAssets(oneShare) as Promise<bigint>,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('ERC-4626 RPC timeout')), 8_000)
      ),
    ]);

    const nav = Number(assets) / Number(oneShare);
    if (!isFinite(nav) || nav <= 0) return null;
    return nav;
  } catch (err) {
    console.warn(`[IssuerNavFetcher] on-chain fallback failed for ${assetId}:`, (err as Error).message);
    return null;
  } finally {
    provider?.destroy?.();
  }
}

/**
 * Fetches the issuer NAV for a given PLANNED asset.
 * Returns null if both the issuer API and on-chain fallback fail.
 */
export async function fetchIssuerNav(assetId: string): Promise<IssuerNavResult | null> {
  const fetchedAt = new Date().toISOString();

  // 1. Try issuer API
  const apiNav = await tryIssuerApi(assetId);
  if (apiNav !== null) {
    return {
      nav: apiNav,
      source: 'ISSUER_API',
      fetchedAt,
      isFallback: false,
      notes: `NAV fetched from issuer API endpoint for ${assetId}`,
    };
  }

  // 2. Try on-chain ERC-4626 convertToAssets()
  const onChainNav = await tryOnChainConvertToAssets(assetId);
  if (onChainNav !== null) {
    return {
      nav: onChainNav,
      source: 'ERC4626_ONCHAIN',
      fetchedAt,
      isFallback: true,
      notes: `NAV fetched via on-chain ERC-4626 convertToAssets() for ${assetId} (issuer API unavailable)`,
    };
  }

  return null;
}
