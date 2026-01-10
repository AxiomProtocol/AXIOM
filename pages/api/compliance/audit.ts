import { NextApiRequest, NextApiResponse } from 'next';
import { addAuditEntry, getAuditEntries, generateComplianceReport, getComplianceReports } from '../../../lib/compliance';
import { securityMiddleware, logAuditEvent, getClientIdentifier, getAuditLogs } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = getClientIdentifier(req);

  if (req.method === 'GET') {
    const { resource, actor, limit, reports } = req.query;

    try {
      if (reports === 'true') {
        const complianceReports = getComplianceReports();
        return res.status(200).json({ success: true, reports: complianceReports });
      }

      const complianceEntries = getAuditEntries({
        resource: resource as string,
        actor: actor as string,
        limit: limit ? parseInt(limit as string) : 100
      });

      const securityLogs = getAuditLogs({
        action: resource as string,
        userId: actor as string,
        limit: limit ? parseInt(limit as string) : 100
      });

      const combinedEntries = [
        ...complianceEntries.map(e => ({
          id: e.id,
          timestamp: e.timestamp,
          action: e.action,
          actor: e.actor,
          resource: e.resource,
          details: e.details
        })),
        ...securityLogs.map(log => ({
          id: `sec-${log.timestamp}`,
          timestamp: log.timestamp,
          action: log.action,
          actor: log.userId || log.ipAddress,
          resource: 'security',
          details: log.details
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const limitNum = limit ? parseInt(limit as string) : 100;
      const entries = combinedEntries.slice(0, limitNum);

      return res.status(200).json({
        success: true,
        entries,
        count: entries.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching audit entries:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch audit data' });
    }
  }

  if (req.method === 'POST') {
    const { action, type, period, entry } = req.body;

    if (action === 'log' && entry) {
      const auditEntry = addAuditEntry({
        action: entry.action,
        actor: entry.actor,
        actorType: entry.actorType || 'user',
        resource: entry.resource,
        resourceId: entry.resourceId,
        details: entry.details || {},
        ipAddress: clientId,
        txHash: entry.txHash
      });

      return res.status(201).json({ success: true, entry: auditEntry });
    }

    if (action === 'generateReport' && type && period) {
      const report = generateComplianceReport(type, period);

      logAuditEvent({
        action: 'compliance_report_generated',
        ipAddress: clientId,
        details: { reportId: report.id, type, period },
        severity: 'info',
        success: true
      });

      return res.status(201).json({ success: true, report });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default securityMiddleware({ enableRateLimit: true, enableAuditLog: true })(handler);
