import type { NextApiRequest, NextApiResponse } from 'next';
import { getSecSession } from '../../../../server/services/secondary/auth';
import { getIssuerDashboard, getSeriesAnalytics } from '../../../../server/services/secondary/analytics';
import { getPendingApprovals } from '../../../../server/services/secondary/approvals';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const session = await getSecSession(req);
  if (!session || !session.investorId) return res.status(401).json({ success: false, error: 'Authentication required' });
  if (!session.roles.includes('issuer') && !session.roles.includes('admin')) {
    return res.status(403).json({ success: false, error: 'Issuer role required' });
  }

  try {
    const [seriesDashboard, pendingApprovals] = await Promise.all([
      getIssuerDashboard(session.investorId),
      getPendingApprovals('issuer'),
    ]);

    return res.status(200).json({
      success: true,
      series: seriesDashboard,
      pendingApprovals,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
