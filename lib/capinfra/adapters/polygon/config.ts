/**
 * Capital Infrastructure — Polygon PoS adapter config.
 *
 * Environment-variable-driven configuration, following the Avalanche
 * adapter pattern exactly. No cap_adapters DB row required — mirrors
 * the EVM and Avalanche adapter approach.
 *
 * Env vars:
 *   POLYGON_ADAPTER_MODE             DRY_RUN | LIVE | DISABLED (default: DRY_RUN)
 *   POLYGON_RPC_URL                  Polygon PoS mainnet RPC endpoint
 *   POLYGON_AMOY_RPC_URL             Polygon Amoy testnet RPC (preferred for chainId 80002)
 *   POLYGON_ADAPTER_LIVE_ALLOWLIST   Comma-separated asset symbols enabled for LIVE
 *   MULTICHAIN_ENABLED               Must be "true" for any non-DRY_RUN behavior
 *   CHAIN_POLYGON_ENABLED            Must be "true" for any non-DRY_RUN behavior
 *
 * Phase 4 status:
 *   DRY_RUN is the only permitted mode. LIVE dispatch is not yet implemented
 *   and will fail closed with AdapterModeNotPermittedError regardless of mode
 *   setting. LIVE will be implemented in a future phase after: BitGo Polygon
 *   custody wallet, accepted-risk record, full reconciliation model, and
 *   Amoy smoke test are all complete.
 */

import type { AdapterMode } from '../types';

export const POLYGON_ADAPTER_KIND = 'POLYGON';

/** Chain IDs this adapter is aware of. LIVE not yet supported on any. */
export const SUPPORTED_CHAIN_IDS = new Set<number>([
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
 * Chain-enable safety gate: non-DRY_RUN dispatch requires both multichain flags.
 * Throws if either flag is absent or not 'true'.
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
