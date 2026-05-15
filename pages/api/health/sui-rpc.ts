import 'server-only';
import type { NextApiRequest, NextApiResponse } from 'next';
import { checkAllRpcHealth } from '../../../lib/sui/monitoring/rpcHealthCheck';

// =============================================================================
// GET /api/health/sui-rpc
//
// Detailed RPC health check for mainnet and testnet Sui nodes.
// Returns per-network latency, status, and endpoint details.
// Health: HEALTHY | DEGRADED | CRITICAL
// =============================================================================

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { mainnet, testnet } = await checkAllRpcHealth();

    const overallStatus =
      mainnet.status === 'DOWN' ? 'CRITICAL'
      : mainnet.status === 'DEGRADED' ? 'DEGRADED'
      : 'HEALTHY';

    const httpStatus = overallStatus === 'CRITICAL' ? 503 : 200;

    return res.status(httpStatus).json({
      overallStatus,
      mainnet: {
        status: mainnet.status,
        latencyMs: mainnet.latencyMs,
        rpcUrl: mainnet.rpcUrl,
        checkedAt: mainnet.checkedAt,
        error: mainnet.error,
      },
      testnet: {
        status: testnet.status,
        latencyMs: testnet.latencyMs,
        rpcUrl: testnet.rpcUrl,
        checkedAt: testnet.checkedAt,
        error: testnet.error,
      },
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      overallStatus: 'CRITICAL',
      error: err instanceof Error ? err.message : 'RPC health check failed',
      checkedAt: new Date().toISOString(),
    });
  }
}
