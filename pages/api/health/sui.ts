import 'server-only';
import type { NextApiRequest, NextApiResponse } from 'next';
import { checkAllRpcHealth } from '../../../lib/sui/monitoring/rpcHealthCheck';

// =============================================================================
// GET /api/health/sui
//
// Returns RPC health for both mainnet and testnet Sui nodes.
// Used by operator dashboard and external uptime monitoring.
//
// Response:
//   { mainnet: RpcHealthResult; testnet: RpcHealthResult; overallStatus: string }
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { mainnet, testnet } = await checkAllRpcHealth();

    const overallStatus =
      mainnet.status === 'HEALTHY' && testnet.status === 'HEALTHY'
        ? 'HEALTHY'
        : mainnet.status === 'DOWN' && testnet.status === 'DOWN'
        ? 'DOWN'
        : 'DEGRADED';

    const httpStatus = overallStatus === 'DOWN' ? 503 : 200;

    return res.status(httpStatus).json({
      overallStatus,
      mainnet,
      testnet,
    });
  } catch (err) {
    return res.status(500).json({
      overallStatus: 'DOWN',
      error: err instanceof Error ? err.message : 'Health check failed',
    });
  }
}
