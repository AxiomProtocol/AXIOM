import { NextApiRequest, NextApiResponse } from 'next';
import { getProgramMetrics } from '../../../lib/analytics';
import { securityMiddleware, logAuditEvent, getClientIdentifier } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const clientId = getClientIdentifier(req);

  try {
    const programs = await getProgramMetrics();

    logAuditEvent({
      action: 'analytics_programs_viewed',
      ipAddress: clientId,
      details: { programCount: programs.length },
      severity: 'info',
      success: true
    });

    return res.status(200).json({
      success: true,
      programs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching program metrics:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch program metrics' });
  }
}

export default securityMiddleware({ enableRateLimit: true, enableAuditLog: true })(handler);
