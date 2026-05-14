/**
 * Capital Infrastructure — Polygon PoS adapter config.
 *
 * Environment-variable-driven configuration, following the Avalanche
 * adapter pattern exactly. No cap_adapters DB row required.
 *
 * Env vars:
 *   POLYGON_ADAPTER_MODE             DRY_RUN | LIVE | DISABLED (default: DRY_RUN)
 *   POLYGON_RPC_URL                  Polygon PoS mainnet RPC endpoint
 *   POLYGON_AMOY_RPC_URL             Polygon Amoy testnet RPC (preferred for chainId 80002)
 *   POLYGON_ADAPTER_LIVE_ALLOWLIST   Comma-separated asset symbols enabled for LIVE
 *   POLYGON_DEPLOYER_PRIVATE_KEY     Polygon-specific deployer/relayer key (preferred)
 *   DEPLOYER_PRIVATE_KEY             Fallback deployer key (shared across chains)
 *   MULTICHAIN_ENABLED               Must be "true" for LIVE dispatch
 *   CHAIN_POLYGON_ENABLED            Must be "true" for LIVE dispatch
 *
 * Phase 5 status:
 *   LIVE dispatch is implemented. Gate pre-conditions before enabling:
 *     1. BitGo Polygon custody wallet registered in custodyWalletRegistry
 *     2. Accepted-risk record signed (Technical Lead, Ops Lead, Compliance)
 *     3. Polygon Amoy smoke test passing with live RPC
 *     4. USDC-POLYGON asset registered in cap_assets
 *     5. CHAIN_POLYGON_ENABLED=true and POLYGON_RPC_URL set in target environment
 *     6. Legal review of Polygon USDC payment flows complete
 *   Until all gates are met, POLYGON_ADAPTER_MODE should remain DRY_RUN.
 */

import type { AdapterMode } from '../types';

export const POLYGON_ADAPTER_KIND = 'POLYGON';

/** Chain IDs permitted for LIVE broadcast. */
export const SUPPORTED_LIVE_CHAIN_IDS = new Set<number>([
  137,   // Polygon PoS mainnet
  80002, // Polygon Amoy testnet
]);

const VALID_MODES: AdapterMode[] = ['DRY_RUN', 'LIVE', 'DISABLED'];

export function resolveMode(): AdapterMode {
  const raw = (process.env.POLYGON_ADAPTER_MODE || 'DRY_RUN').toUpperCase();
  if ((VALID_MODES as string[]).includes(raw)) return raw as AdapterMode;
  return 'DRY_RUN';
}

export function resolveAllowlist(): Set<string> {
  const raw = process.env.POLYGON_ADAPTER_LIVE_ALLOWLIST || '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
  );
}

export function effectiveModeForAsset(symbol: string, baseMode: AdapterMode): AdapterMode {
  if (baseMode !== 'LIVE') return baseMode;
  if (!resolveAllowlist().has(symbol.toUpperCase())) return 'DRY_RUN';
  return 'LIVE';
}

/**
 * Chain-enable safety gate: LIVE dispatch requires both multichain flags.
 * Called at the top of liveDispatch() so a missing flag fails fast with a
 * clear operator message rather than a cryptic RPC or contract error.
 */
export function assertChainEnabled(): void {
  if (process.env.MULTICHAIN_ENABLED !== 'true') {
    throw new Error(
      'polygon-adapter: MULTICHAIN_ENABLED must be "true" to use LIVE mode',
    );
  }
  if (process.env.CHAIN_POLYGON_ENABLED !== 'true') {
    throw new Error(
      'polygon-adapter: CHAIN_POLYGON_ENABLED must be "true" to use LIVE mode',
    );
  }
}

/**
 * Resolve the RPC URL for the given chain ID.
 * For Amoy testnet (80002): prefers POLYGON_AMOY_RPC_URL, falls back to POLYGON_RPC_URL.
 * For all others (mainnet 137): uses POLYGON_RPC_URL.
 *
 * Only called for LIVE mode — DRY_RUN never needs an RPC URL.
 */
export function polygonRpcUrl(chainId?: number): string {
  if (chainId === 80002) {
    const amoyUrl = process.env.POLYGON_AMOY_RPC_URL;
    if (amoyUrl) return amoyUrl;
  }
  const url = process.env.POLYGON_RPC_URL;
  if (!url) {
    throw new Error(
      'polygon-adapter: POLYGON_RPC_URL (or POLYGON_AMOY_RPC_URL for Amoy chainId=80002) is required for LIVE mode',
    );
  }
  return url;
}

/**
 * Resolve the deployer private key for Polygon LIVE dispatch.
 * Prefers POLYGON_DEPLOYER_PRIVATE_KEY (dedicated Polygon/Amoy key).
 * Falls back to DEPLOYER_PRIVATE_KEY (shared deployer key).
 *
 * Using a dedicated POLYGON_DEPLOYER_PRIVATE_KEY is strongly recommended
 * so Polygon keys can be rotated independently of Arbitrum/Avalanche keys.
 */
export function deployerPrivateKey(): string {
  const pk =
    process.env.POLYGON_DEPLOYER_PRIVATE_KEY ?? process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    throw new Error(
      'polygon-adapter: POLYGON_DEPLOYER_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY) is required for LIVE mode',
    );
  }
  return pk;
}
