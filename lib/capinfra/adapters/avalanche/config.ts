/**
 * Capital Infrastructure — Avalanche C-Chain adapter config.
 *
 * Environment-variable-driven configuration (no cap_adapters DB row
 * required for the Avalanche adapter — mirrors the EVM adapter pattern).
 *
 * Env vars:
 *   AVALANCHE_ADAPTER_MODE           DRY_RUN | LIVE | DISABLED (default: DRY_RUN)
 *   AVALANCHE_RPC_URL                C-Chain RPC endpoint (required for LIVE mode)
 *   AVALANCHE_ADAPTER_LIVE_ALLOWLIST Comma-separated asset symbols enabled for LIVE
 *   DEPLOYER_PRIVATE_KEY             Deployer/relayer private key (required for LIVE)
 */

import type { AdapterMode } from '../types';
import { isChainEnabled, isMultichainEnabled } from '../../../chains/capabilities';

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

export function assertLiveModeEnabled(): void {
  if (!isMultichainEnabled()) {
    throw new Error('avalanche-adapter: MULTICHAIN_ENABLED=true is required for LIVE mode');
  }
  if (!isChainEnabled('avalanche')) {
    throw new Error('avalanche-adapter: CHAIN_AVALANCHE_ENABLED=true is required for LIVE mode');
  }
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

export function avalancheRpcUrl(): string {
  const url = process.env.AVALANCHE_FUJI_RPC_URL || process.env.AVALANCHE_RPC_URL;
  if (!url) {
    throw new Error(
      'avalanche-adapter: AVALANCHE_FUJI_RPC_URL (or AVALANCHE_RPC_URL fallback) is required for LIVE mode',
    );
  }
  return url;
}

export function deployerPrivateKey(): string {
  const pk = process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    throw new Error(
      'avalanche-adapter: AVALANCHE_DEPLOYER_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY fallback) is required for LIVE mode',
    );
  }
  return pk;
}
