import type { NextApiRequest, NextApiResponse } from 'next';
import { pilotService } from '../../../server/services/pilot/PilotService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const data = await pilotService.getLatestExpansionGateCheck();
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      const {
        checkDate, occupancyAbove90, reservesFullyFunded,
        consecutivePositiveMonths, investorSatisfactionScore,
        totalAssetsUnderManagement, notes,
      } = req.body;
      if (!checkDate) {
        return res.status(400).json({ success: false, error: 'checkDate is required' });
      }
      const data = await pilotService.evaluateExpansionGate({
        checkDate: new Date(checkDate),
        occupancyAbove90: occupancyAbove90 ?? false,
        reservesFullyFunded: reservesFullyFunded ?? false,
        consecutivePositiveMonths: consecutivePositiveMonths ?? 0,
        investorSatisfactionScore,
        totalAssetsUnderManagement,
        notes,
      });
      return res.status(201).json({ success: true, data });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Pilot expansion gate error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
