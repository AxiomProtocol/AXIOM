import { NextApiRequest, NextApiResponse } from 'next';
import { getSubscription, createSubscription, cancelSubscription } from '../../../lib/monetization';
import { securityMiddleware, logAuditEvent, getClientIdentifier } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = getClientIdentifier(req);

  if (req.method === 'GET') {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    try {
      const subscription = getSubscription(userId);
      return res.status(200).json({
        success: true,
        subscription: subscription || null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch subscription' });
    }
  }

  if (req.method === 'POST') {
    const { action, userId, planId, subscriptionId } = req.body;

    if (action === 'subscribe' && userId && planId) {
      const subscription = createSubscription(userId, planId);

      if (!subscription) {
        return res.status(400).json({ success: false, error: 'Invalid plan ID' });
      }

      logAuditEvent({
        action: 'subscription_created',
        ipAddress: clientId,
        userId,
        details: { planId, subscriptionId: subscription.id },
        severity: 'info',
        success: true
      });

      return res.status(201).json({ success: true, subscription });
    }

    if (action === 'cancel' && subscriptionId) {
      const success = cancelSubscription(subscriptionId);

      logAuditEvent({
        action: 'subscription_canceled',
        ipAddress: clientId,
        details: { subscriptionId, success },
        severity: 'warning',
        success
      });

      return res.status(200).json({ success, subscriptionId });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default securityMiddleware({ enableRateLimit: true, enableAuditLog: true })(handler);
