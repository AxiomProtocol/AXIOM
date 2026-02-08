import { NextApiRequest, NextApiResponse } from 'next';
import { getAuditLogs, logAuditEvent, getClientIdentifier } from '../../../lib/security';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = getClientIdentifier(req);

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    logAuditEvent({
      action: 'audit_logs_unauthorized',
      ipAddress: clientId,
      details: {},
      severity: 'warning',
      success: false
    });
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { severity, action, userId, startDate, endDate, limit } = req.query;

    const logs = getAuditLogs({
      severity: severity as string,
      action: action as string,
      userId: userId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? parseInt(limit as string) : 100
    });

    logAuditEvent({
      action: 'audit_logs_viewed',
      ipAddress: clientId,
      details: { filters: { severity, action, userId }, resultCount: logs.length },
      severity: 'info',
      success: true
    });

    return res.status(200).json({
      success: true,
      logs,
      total: logs.length
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
}
