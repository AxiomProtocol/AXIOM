import { NextApiRequest, NextApiResponse } from 'next';
import { logAuditEvent, getClientIdentifier } from '../../../lib/security';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = getClientIdentifier(req);

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const metrics = {
      totalValueLocked: 1245000,
      utilizationRate: 68,
      diversificationScore: 75,
      liquidityRatio: 85,
      collateralRatio: 156,
      reserveRatio: 22,
      lastUpdated: new Date().toISOString()
    };

    const riskIndicators = [
      {
        id: 'collateral',
        name: 'Collateral Ratio',
        status: metrics.collateralRatio >= 150 ? 'healthy' : metrics.collateralRatio >= 130 ? 'warning' : 'critical',
        value: metrics.collateralRatio,
        threshold: { warning: 130, critical: 110 }
      },
      {
        id: 'liquidity',
        name: 'Liquidity Score',
        status: metrics.liquidityRatio >= 70 ? 'healthy' : metrics.liquidityRatio >= 50 ? 'warning' : 'critical',
        value: metrics.liquidityRatio,
        threshold: { warning: 60, critical: 40 }
      },
      {
        id: 'utilization',
        name: 'Utilization Rate',
        status: metrics.utilizationRate <= 75 ? 'healthy' : metrics.utilizationRate <= 85 ? 'warning' : 'critical',
        value: metrics.utilizationRate,
        threshold: { warning: 75, critical: 85 }
      }
    ];

    logAuditEvent({
      action: 'treasury_metrics_viewed',
      ipAddress: clientId,
      details: { tvl: metrics.totalValueLocked },
      severity: 'info',
      success: true
    });

    return res.status(200).json({
      success: true,
      metrics,
      riskIndicators
    });
  } catch (error) {
    console.error('Error fetching treasury metrics:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch treasury metrics' });
  }
}
