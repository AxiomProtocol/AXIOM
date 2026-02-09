import { NextApiRequest, NextApiResponse } from 'next';
import { getHistoricalMetrics } from '../../../lib/analytics';
import { securityMiddleware, logAuditEvent, getClientIdentifier } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const clientId = getClientIdentifier(req);
  const { metric, days } = req.query;

  if (!metric || typeof metric !== 'string') {
    return res.status(400).json({ success: false, error: 'Metric parameter required' });
  }

  try {
    const daysNum = days ? parseInt(days as string) : 30;
    const data = getHistoricalMetrics(metric, Math.min(daysNum, 365));

    logAuditEvent({
      action: 'analytics_historical_viewed',
      ipAddress: clientId,
      details: { metric, days: daysNum },
      severity: 'info',
      success: true
    });

    return res.status(200).json({
      success: true,
      ...data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching historical metrics:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch historical data' });
  }
}

export default securityMiddleware({ enableRateLimit: true, enableAuditLog: true })(handler);
