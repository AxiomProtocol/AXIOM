import { NextApiRequest, NextApiResponse } from 'next';
import { getStewardApplications, submitStewardApplication, reviewStewardApplication } from '../../../lib/land-lifecycle';
import { securityMiddleware, logAuditEvent, getClientIdentifier, sanitizeInput } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = getClientIdentifier(req);

  if (req.method === 'GET') {
    const { landId } = req.query;

    try {
      const applications = getStewardApplications(landId as string | undefined);

      return res.status(200).json({
        success: true,
        applications,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching steward applications:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch applications' });
    }
  }

  if (req.method === 'POST') {
    const { action, landId, applicantName, applicantWallet, experience, proposal, appId, approved } = req.body;

    if (action === 'apply') {
      if (!landId || !applicantName || !applicantWallet) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      const application = submitStewardApplication({
        landId,
        applicantName: sanitizeInput(applicantName),
        applicantWallet,
        experience: sanitizeInput(experience || ''),
        proposal: sanitizeInput(proposal || '')
      });

      logAuditEvent({
        action: 'steward_application_submitted',
        ipAddress: clientId,
        walletAddress: applicantWallet,
        details: { landId, applicationId: application.id },
        severity: 'info',
        success: true
      });

      return res.status(201).json({ success: true, application });
    }

    if (action === 'review' && appId !== undefined) {
      const success = reviewStewardApplication(appId, approved);

      logAuditEvent({
        action: 'steward_application_reviewed',
        ipAddress: clientId,
        details: { appId, approved, success },
        severity: 'warning',
        success
      });

      return res.status(200).json({ success, appId, approved });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default securityMiddleware({ enableRateLimit: true, enableAuditLog: true })(handler);
