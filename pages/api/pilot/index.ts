import type { NextApiRequest, NextApiResponse } from 'next';
import { pilotService } from '../../../server/services/pilot/PilotService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const data = await pilotService.getDashboardSummary();
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Pilot dashboard error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to load dashboard' });
  }
}
