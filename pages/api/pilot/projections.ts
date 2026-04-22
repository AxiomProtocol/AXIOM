import type { NextApiRequest, NextApiResponse } from 'next';
import { pilotService } from '../../../server/services/pilot/PilotService';

const PROJECTION_CONFIG = {
  scenarios: [
    { label: 'Conservative', occupancy: 0.85, rentGrowth: 0.00, appreciation: 0.05 },
    { label: 'Base Case', occupancy: 0.93, rentGrowth: 0.02, appreciation: 0.12 },
    { label: 'Optimistic', occupancy: 0.97, rentGrowth: 0.04, appreciation: 0.20 },
  ],
  baseNOIRate: 0.08,
  source: 'pilot_configuration',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { holdingPeriodYears, conservativeMultiplier, baseMultiplier, optimisticMultiplier } = req.query;
    const data = await pilotService.projectWaterfallReturns({
      holdingPeriodYears: holdingPeriodYears ? parseInt(holdingPeriodYears as string, 10) : undefined,
      conservativeMultiplier: conservativeMultiplier ? parseFloat(conservativeMultiplier as string) : undefined,
      baseMultiplier: baseMultiplier ? parseFloat(baseMultiplier as string) : undefined,
      optimisticMultiplier: optimisticMultiplier ? parseFloat(optimisticMultiplier as string) : undefined,
    });
    return res.status(200).json({ success: true, data, config: PROJECTION_CONFIG });
  } catch (error: any) {
    console.error('Pilot projections error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
