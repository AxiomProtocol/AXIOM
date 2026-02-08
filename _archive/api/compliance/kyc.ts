import { NextApiRequest, NextApiResponse } from 'next';
import { getKYCVerification, getKYCVerificationByWallet, createKYCVerification, updateKYCStatus, getRegulatoryLimits, checkTransactionLimit } from '../../../lib/compliance';
import { securityMiddleware, logAuditEvent, getClientIdentifier } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = getClientIdentifier(req);

  if (req.method === 'GET') {
    const { userId, walletAddress } = req.query;

    try {
      let verification;
      if (walletAddress && typeof walletAddress === 'string') {
        verification = getKYCVerificationByWallet(walletAddress);
      } else if (userId && typeof userId === 'string') {
        verification = getKYCVerification(userId);
      }

      const limits = getRegulatoryLimits();

      return res.status(200).json({
        success: true,
        verification: verification || null,
        limits,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching KYC data:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch KYC data' });
    }
  }

  if (req.method === 'POST') {
    const { action, userId, walletAddress, kycId, status, notes, amount } = req.body;

    if (action === 'create' && userId && walletAddress) {
      const verification = createKYCVerification(userId, walletAddress);

      logAuditEvent({
        action: 'kyc_verification_created',
        ipAddress: clientId,
        userId,
        walletAddress,
        details: { kycId: verification.id },
        severity: 'info',
        success: true
      });

      return res.status(201).json({ success: true, verification });
    }

    if (action === 'update' && kycId && status) {
      const success = updateKYCStatus(kycId, status, notes);

      logAuditEvent({
        action: 'kyc_status_updated',
        ipAddress: clientId,
        details: { kycId, status, notes, success },
        severity: 'warning',
        success
      });

      return res.status(200).json({ success, kycId, status });
    }

    if (action === 'checkLimit' && userId && amount) {
      const result = checkTransactionLimit(userId, amount);

      return res.status(200).json({ success: true, ...result });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default securityMiddleware({ enableRateLimit: true, enableAuditLog: true })(handler);
