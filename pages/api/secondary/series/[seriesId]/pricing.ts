import type { NextApiRequest, NextApiResponse } from 'next';
import { getSecSession } from '../../../../../server/services/secondary/auth';
import { getSeriesPricing, getSeriesMetrics, recordNavMark } from '../../../../../server/services/secondary/pricing';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { seriesId } = req.query as { seriesId: string };

  if (req.method === 'GET') {
    try {
      const [pricing, metrics] = await Promise.all([
        getSeriesPricing(seriesId),
        getSeriesMetrics(seriesId),
      ]);
      return res.status(200).json({ success: true, pricing, metrics });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    const session = await getSecSession(req);
    if (!session) return res.status(401).json({ success: false, error: 'Authentication required' });
    if (!session.roles.includes('issuer') && !session.roles.includes('admin')) {
      return res.status(403).json({ success: false, error: 'Issuer role required' });
    }

    const { navPerUnit, methodUsed, notes } = req.body;
    if (!navPerUnit || !methodUsed) return res.status(400).json({ success: false, error: 'navPerUnit and methodUsed required' });

    try {
      const markId = await recordNavMark({ seriesId, navPerUnit, methodUsed, issuedBy: session.investorId, notes });
      return res.status(201).json({ success: true, markId });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
