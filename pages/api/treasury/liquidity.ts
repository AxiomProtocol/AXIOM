import { NextApiRequest, NextApiResponse } from 'next';
import { getLiquidityPoolsAsync, getLPIncentivesAsync, getBridgeRoutes } from '../../../lib/treasury-automation';
import { securityMiddleware, logAuditEvent, getClientIdentifier } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const clientId = getClientIdentifier(req);
  const userAddress = req.query.userAddress as string | undefined;

  try {
    const [pools, incentives, bridges] = await Promise.all([
      getLiquidityPoolsAsync(userAddress),
      getLPIncentivesAsync(),
      Promise.resolve(getBridgeRoutes())
    ]);

    logAuditEvent({
      action: 'liquidity_data_viewed',
      ipAddress: clientId,
      details: { poolCount: pools.length, source: 'blockchain' },
      severity: 'info',
      success: true
    });

    return res.status(200).json({
      success: true,
      pools,
      incentives,
      bridges,
      source: 'arbitrum_one',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching liquidity data:', error);
    
    logAuditEvent({
      action: 'liquidity_data_error',
      ipAddress: clientId,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      severity: 'error',
      success: false
    });

    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch liquidity data from blockchain',
      pools: [],
      incentives: [],
      bridges: getBridgeRoutes()
    });
  }
}

export default securityMiddleware({ enableRateLimit: true, enableAuditLog: true })(handler);
