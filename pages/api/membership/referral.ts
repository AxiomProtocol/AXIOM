import { NextApiRequest, NextApiResponse } from 'next';
import { createReferralCode, getReferralCodes, useReferralCode, getReferralEarnings } from '../../../lib/monetization';
import { securityMiddleware, logAuditEvent, getClientIdentifier, sanitizeInput } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = getClientIdentifier(req);

  if (req.method === 'GET') {
    const { creatorId } = req.query;

    try {
      const codes = getReferralCodes(creatorId as string | undefined);
      const earnings = creatorId ? getReferralEarnings(creatorId as string) : [];

      return res.status(200).json({
        success: true,
        codes,
        earnings,
        totalEarnings: earnings.reduce((sum, e) => sum + e.amount, 0),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching referral data:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch referral data' });
    }
  }

  if (req.method === 'POST') {
    const { action, creatorId, creatorName, code, referredId } = req.body;

    if (action === 'create' && creatorId && creatorName) {
      const referralCode = createReferralCode(creatorId, sanitizeInput(creatorName));

      logAuditEvent({
        action: 'referral_code_created',
        ipAddress: clientId,
        userId: creatorId,
        details: { code: referralCode.code },
        severity: 'info',
        success: true
      });

      return res.status(201).json({ success: true, referralCode });
    }

    if (action === 'use' && code && referredId) {
      const result = useReferralCode(code, referredId);

      logAuditEvent({
        action: 'referral_code_used',
        ipAddress: clientId,
        userId: referredId,
        details: { code, success: result.success, discount: result.discount },
        severity: 'info',
        success: result.success
      });

      return res.status(200).json(result);
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default securityMiddleware({ enableRateLimit: true, enableAuditLog: true })(handler);
