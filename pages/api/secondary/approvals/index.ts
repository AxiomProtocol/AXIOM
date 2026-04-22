import type { NextApiRequest, NextApiResponse } from 'next';
import { getSecSession } from '../../../../server/services/secondary/auth';
import { getPendingApprovals, resolveApproval } from '../../../../server/services/secondary/approvals';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const session = await getSecSession(req);
    if (!session) return res.status(401).json({ success: false, error: 'Authentication required' });

    const role = session.roles.includes('admin') ? 'admin' : session.roles.includes('compliance_officer') ? 'compliance_officer' : 'issuer';
    if (!['issuer', 'admin', 'compliance_officer'].some(r => session.roles.includes(r))) {
      return res.status(403).json({ success: false, error: 'Elevated role required' });
    }

    try {
      const approvals = await getPendingApprovals(role);
      return res.status(200).json({ success: true, approvals });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    const session = await getSecSession(req);
    if (!session || !session.investorId) return res.status(401).json({ success: false, error: 'Authentication required' });
    if (!['issuer', 'admin', 'compliance_officer'].some(r => session.roles.includes(r))) {
      return res.status(403).json({ success: false, error: 'Elevated role required' });
    }

    const { approvalRequestId, decision, reason, isOverride } = req.body;
    if (!approvalRequestId || !decision) {
      return res.status(400).json({ success: false, error: 'approvalRequestId and decision required' });
    }
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, error: 'decision must be approved or rejected' });
    }
    if (isOverride && !reason) {
      return res.status(400).json({ success: false, error: 'Override requires a reason' });
    }

    const actorType = session.roles.includes('admin') ? 'admin' : session.roles.includes('compliance_officer') ? 'compliance_officer' : 'issuer';

    try {
      await resolveApproval(approvalRequestId, session.investorId, actorType, decision, reason, isOverride);
      return res.status(200).json({ success: true, decision });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
