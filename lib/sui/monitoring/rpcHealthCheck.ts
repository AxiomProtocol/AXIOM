import 'server-only';
import { getSuiClient, getSuiNetworkUrl } from '../client';

// =============================================================================
// RPC Health Check — Phase 9 Monitoring
//
// Verifies Sui RPC connectivity and response latency.
// Used by /api/health/sui and the operator dashboard.
// =============================================================================

export type RpcHealth = 'HEALTHY' | 'DEGRADED' | 'DOWN';

export interface RpcHealthResult {
  status: RpcHealth;
  latencyMs: number;
  network: string;
  rpcUrl: string;
  checkedAt: string;
  error?: string;
}

/**
 * Run a lightweight RPC health check by querying chain identifier.
 * Latency threshold: <500ms = HEALTHY, <2000ms = DEGRADED, else DOWN.
 */
export async function checkRpcHealth(network: 'testnet' | 'mainnet' = 'mainnet'): Promise<RpcHealthResult> {
  const rpcUrl = getSuiNetworkUrl(network);
  const checkedAt = new Date().toISOString();
  const start = Date.now();

  try {
    // Lightweight call: fetch chain ID via raw JSON-RPC
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sui_getChainIdentifier',
        params: [],
      }),
      signal: AbortSignal.timeout(5000),
    });

    const latencyMs = Date.now() - start;

    if (!response.ok) {
      return {
        status: 'DOWN',
        latencyMs,
        network,
        rpcUrl,
        checkedAt,
        error: `HTTP ${response.status}`,
      };
    }

    const status: RpcHealth =
      latencyMs < 500 ? 'HEALTHY' : latencyMs < 2000 ? 'DEGRADED' : 'DOWN';

    return { status, latencyMs, network, rpcUrl, checkedAt };
  } catch (err) {
    const latencyMs = Date.now() - start;
    return {
      status: 'DOWN',
      latencyMs,
      network,
      rpcUrl,
      checkedAt,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Run health checks on both testnet and mainnet RPCs.
 */
export async function checkAllRpcHealth(): Promise<{
  mainnet: RpcHealthResult;
  testnet: RpcHealthResult;
}> {
  const [mainnet, testnet] = await Promise.all([
    checkRpcHealth('mainnet'),
    checkRpcHealth('testnet'),
  ]);
  return { mainnet, testnet };
}
