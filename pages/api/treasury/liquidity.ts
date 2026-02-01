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
    const [pools, incentives] = await Promise.all([
      getLiquidityPoolsAsync(userAddress),
      getLPIncentivesAsync()
    ]);
    
    const bridges = getBridgeRoutes();

    const isBlockchainDataAvailable = pools.length > 0;

    logAuditEvent({
      action: 'liquidity_data_viewed',
      ipAddress: clientId,
      details: { 
        poolCount: pools.length, 
        source: isBlockchainDataAvailable ? 'blockchain' : 'fallback' 
      },
      severity: 'info',
      success: true
    });

    return res.status(200).json({
      success: true,
      pools,
      incentives,
      bridges,
      source: isBlockchainDataAvailable ? 'arbitrum_one' : 'fallback',
      dataAvailable: isBlockchainDataAvailable,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching liquidity data:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isConnectionError = errorMessage === 'BLOCKCHAIN_CONNECTION_FAILED';
    
    logAuditEvent({
      action: 'liquidity_data_error',
      ipAddress: clientId,
      details: { error: errorMessage },
      severity: 'error',
      success: false
    });

    return res.status(isConnectionError ? 503 : 502).json({ 
      success: false, 
      error: isConnectionError 
        ? 'Blockchain network temporarily unavailable' 
        : 'Failed to fetch liquidity data',
      pools: [],
      incentives: [],
      bridges: getBridgeRoutes(),
      source: 'unavailable',
      dataAvailable: false
    });
  }
}

export default securityMiddleware({ enableRateLimit: true, enableAuditLog: true })(handler);
