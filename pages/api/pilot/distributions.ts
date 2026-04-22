import type { NextApiRequest, NextApiResponse } from 'next';
import { pilotService } from '../../../server/services/pilot/PilotService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { spvId } = req.query;
      const data = await pilotService.listDistributions(spvId as string | undefined);
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      const { spvId, periodStart, periodEnd, grossRevenue, operatingExpenses, distributionType, notes } = req.body;
      if (!periodStart || !periodEnd || !grossRevenue || !operatingExpenses) {
        return res.status(400).json({
          success: false,
          error: 'periodStart, periodEnd, grossRevenue, and operatingExpenses are required',
        });
      }
      const data = await pilotService.calculateDistribution({
        spvId: spvId || null,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        grossRevenue,
        operatingExpenses,
        distributionType,
        notes,
      });
      return res.status(201).json({ success: true, data });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Pilot distributions error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
