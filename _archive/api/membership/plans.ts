import { NextApiRequest, NextApiResponse } from 'next';
import { getMembershipPlans, getMembershipPlan } from '../../../lib/monetization';
import { securityMiddleware, logAuditEvent, getClientIdentifier } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const clientId = getClientIdentifier(req);
  const { id } = req.query;

  try {
    if (id && typeof id === 'string') {
      const plan = getMembershipPlan(id);
      if (!plan) {
        return res.status(404).json({ success: false, error: 'Plan not found' });
      }
      return res.status(200).json({ success: true, plan });
    }

    const plans = getMembershipPlans();

    logAuditEvent({
      action: 'membership_plans_viewed',
      ipAddress: clientId,
      details: { planCount: plans.length },
      severity: 'info',
      success: true
    });

    return res.status(200).json({
      success: true,
      plans,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching membership plans:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch plans' });
  }
}

export default securityMiddleware({ enableRateLimit: true, enableAuditLog: true })(handler);
