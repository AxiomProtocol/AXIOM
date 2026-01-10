import { NextApiRequest, NextApiResponse } from 'next';
import { getLiquidityPools, getLPIncentives, getBridgeRoutes } from '../../../lib/treasury-automation';
import { securityMiddleware, logAuditEvent, getClientIdentifier } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const clientId = getClientIdentifier(req);

  try {
    const pools = getLiquidityPools();
    const incentives = getLPIncentives();
    const bridges = getBridgeRoutes();

    logAuditEvent({
      action: 'liquidity_data_viewed',
      ipAddress: clientId,
      details: { poolCount: pools.length },
      severity: 'info',
      success: true
    });

    return res.status(200).json({
      success: true,
      pools,
      incentives,
      bridges,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching liquidity data:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch liquidity data' });
  }
}

export default securityMiddleware({ enableRateLimit: true, enableAuditLog: true })(handler);
