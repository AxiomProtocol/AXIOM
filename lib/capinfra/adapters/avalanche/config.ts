/**
 * Capital Infrastructure — Avalanche C-Chain adapter config.
 *
 * Environment-variable-driven configuration (no cap_adapters DB row
 * required for the Avalanche adapter — mirrors the EVM adapter pattern).
 *
 * Env vars:
 *   AVALANCHE_ADAPTER_MODE              DRY_RUN | LIVE | DISABLED (default: DRY_RUN)
 *   AVALANCHE_FUJI_RPC_URL              Fuji testnet RPC (preferred for chainId 43113)
 *   AVALANCHE_RPC_URL                   C-Chain RPC endpoint (mainnet or fallback)
 *   AVALANCHE_ADAPTER_LIVE_ALLOWLIST    Comma-separated asset symbols enabled for LIVE
 *   AVALANCHE_DEPLOYER_PRIVATE_KEY      Fuji/Avalanche-specific key (preferred)
 *   DEPLOYER_PRIVATE_KEY                Fallback deployer/relayer key
 *   MULTICHAIN_ENABLED                  Must be "true" for LIVE mode
 *   CHAIN_AVALANCHE_ENABLED             Must be "true" for LIVE mode
 */

import type { AdapterMode } from '../types';

export const AVALANCHE_ADAPTER_KIND = 'AVALANCHE';

/** Chain IDs permitted for LIVE broadcast. */
export const SUPPORTED_LIVE_CHAIN_IDS = new Set<number>([
  43114, // Avalanche C-Chain mainnet
  43113, // Avalanche Fuji testnet
]);

const VALID_MODES: AdapterMode[] = ['DRY_RUN', 'LIVE', 'DISABLED'];

export function resolveMode(): AdapterMode {
  const raw = (process.env.AVALANCHE_ADAPTER_MODE || 'DRY_RUN').toUpperCase();
  if ((VALID_MODES as string[]).includes(raw)) return raw as AdapterMode;
  return 'DRY_RUN';
}

export function resolveAllowlist(): Set<string> {
  const raw = process.env.AVALANCHE_ADAPTER_LIVE_ALLOWLIST || '';
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
 * Called at the top of liveDispatch() so a missing flag fails fast.
 */
export function assertChainEnabled(): void {
  if (process.env.MULTICHAIN_ENABLED !== 'true') {
    throw new Error(
      'avalanche-adapter: MULTICHAIN_ENABLED must be "true" to use LIVE mode',
    );
  }
  if (process.env.CHAIN_AVALANCHE_ENABLED !== 'true') {
    throw new Error(
      'avalanche-adapter: CHAIN_AVALANCHE_ENABLED must be "true" to use LIVE mode',
    );
  }
}

/**
 * Resolve the RPC URL for the given chain ID.
 * For Fuji (43113): prefers AVALANCHE_FUJI_RPC_URL, falls back to AVALANCHE_RPC_URL.
 * For all others: uses AVALANCHE_RPC_URL.
 */
export function avalancheRpcUrl(chainId?: number): string {
  if (chainId === 43113) {
    const fujiUrl = process.env.AVALANCHE_FUJI_RPC_URL;
    if (fujiUrl) return fujiUrl;
  }
  const url = process.env.AVALANCHE_RPC_URL;
  if (!url) {
    throw new Error(
      'avalanche-adapter: AVALANCHE_RPC_URL (or AVALANCHE_FUJI_RPC_URL for Fuji chainId=43113) is required for LIVE mode',
    );
  }
  return url;
}

/**
 * Resolve the deployer private key.
 * Prefers AVALANCHE_DEPLOYER_PRIVATE_KEY (dedicated Fuji/Avalanche key).
 * Falls back to DEPLOYER_PRIVATE_KEY (shared deployer key).
 */
export function deployerPrivateKey(): string {
  const pk =
    process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY ?? process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    throw new Error(
      'avalanche-adapter: AVALANCHE_DEPLOYER_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY) is required for LIVE mode',
    );
  }
  return pk;
}
