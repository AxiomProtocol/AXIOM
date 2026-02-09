import { NextApiRequest, NextApiResponse } from 'next';
import { getAlertRules, getActiveAlerts, acknowledgeAlert, evaluateAlerts } from '../../../lib/analytics';
import { securityMiddleware, logAuditEvent, getClientIdentifier } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = getClientIdentifier(req);

  if (req.method === 'GET') {
    try {
      const rules = getAlertRules();
      const alerts = getActiveAlerts();

      logAuditEvent({
        action: 'analytics_alerts_viewed',
        ipAddress: clientId,
        details: { alertCount: alerts.length },
        severity: 'info',
        success: true
      });

      return res.status(200).json({
        success: true,
        rules,
        alerts,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
    }
  }

  if (req.method === 'POST') {
    const { action, alertId, metrics } = req.body;

    if (action === 'acknowledge' && alertId) {
      const success = acknowledgeAlert(alertId);
      
      logAuditEvent({
        action: 'alert_acknowledged',
        ipAddress: clientId,
        details: { alertId, success },
        severity: 'info',
        success
      });

      return res.status(200).json({ success, alertId });
    }

    if (action === 'evaluate' && metrics) {
      const newAlerts = evaluateAlerts(metrics);
      
      logAuditEvent({
        action: 'alerts_evaluated',
        ipAddress: clientId,
        details: { newAlertCount: newAlerts.length },
        severity: newAlerts.some(a => a.severity === 'critical') ? 'warning' : 'info',
        success: true
      });

      return res.status(200).json({ success: true, alerts: newAlerts });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default securityMiddleware({ enableRateLimit: true, enableAuditLog: true })(handler);
