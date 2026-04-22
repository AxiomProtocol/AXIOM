import { NextApiRequest, NextApiResponse } from 'next';
import { getAutomationRules, toggleAutomationRule, getOperations, createOperation } from '../../../lib/treasury-automation';
import { securityMiddleware, logAuditEvent, getClientIdentifier } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = getClientIdentifier(req);

  if (req.method === 'GET') {
    try {
      const rules = getAutomationRules();
      const operations = getOperations();

      logAuditEvent({
        action: 'treasury_automation_viewed',
        ipAddress: clientId,
        details: { ruleCount: rules.length, operationCount: operations.length },
        severity: 'info',
        success: true
      });

      return res.status(200).json({
        success: true,
        rules,
        operations: operations.slice(-20),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching automation data:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch automation data' });
    }
  }

  if (req.method === 'POST') {
    const { action, ruleId, enabled, operation } = req.body;

    if (action === 'toggle' && ruleId !== undefined) {
      const success = toggleAutomationRule(ruleId, enabled);
      
      logAuditEvent({
        action: 'automation_rule_toggled',
        ipAddress: clientId,
        details: { ruleId, enabled, success },
        severity: 'info',
        success
      });

      return res.status(200).json({ success, ruleId, enabled });
    }

    if (action === 'execute' && operation) {
      const newOp = createOperation(operation);
      
      logAuditEvent({
        action: 'treasury_operation_created',
        ipAddress: clientId,
        details: { operationType: operation.type, amount: operation.amount },
        severity: 'warning',
        success: true
      });

      return res.status(201).json({ success: true, operation: newOp });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default securityMiddleware({ enableRateLimit: true, enableAuditLog: true })(handler);
