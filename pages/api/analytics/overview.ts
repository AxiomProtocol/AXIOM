import { NextApiRequest, NextApiResponse } from 'next';
import { getOverviewMetrics } from '../../../lib/analytics';
import { securityMiddleware, logAuditEvent, getClientIdentifier } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const clientId = getClientIdentifier(req);

  try {
    const metrics = await getOverviewMetrics();

    logAuditEvent({
      action: 'analytics_overview_viewed',
      ipAddress: clientId,
      details: { metricsCount: metrics.length },
      severity: 'info',
      success: true
    });

    return res.status(200).json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
}

export default securityMiddleware({ enableRateLimit: true, enableAuditLog: true })(handler);
