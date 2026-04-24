import type { NextApiRequest, NextApiResponse } from 'next';
import { pilotService } from '../../../server/services/pilot/PilotService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { spvId, limit } = req.query;
      if (!spvId) {
        return res.status(400).json({ success: false, error: 'spvId query parameter is required' });
      }
      const data = await pilotService.getAssetMetricHistory(
        spvId as string,
        limit ? parseInt(limit as string, 10) : undefined
      );
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      const {
        spvId, recordDate, occupancyRate, grossRent, operatingExpenses,
        netOperatingIncome, capRate, currentValuation, reserveBalance,
        debtServicePayment, maintenanceCosts, vacancyLoss, metadata,
      } = req.body;
      if (!spvId || !recordDate) {
        return res.status(400).json({ success: false, error: 'spvId and recordDate are required' });
      }
      const data = await pilotService.recordAssetMetric({
        spvId,
        recordDate: new Date(recordDate),
        occupancyRate,
        grossRent,
        operatingExpenses,
        netOperatingIncome,
        capRate,
        currentValuation,
        reserveBalance,
        debtServicePayment,
        maintenanceCosts,
        vacancyLoss,
        metadata,
      });
      return res.status(201).json({ success: true, data });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Pilot metrics error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
