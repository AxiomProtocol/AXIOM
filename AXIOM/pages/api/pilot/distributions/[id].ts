import type { NextApiRequest, NextApiResponse } from 'next';
import { pilotService } from '../../../../server/services/pilot/PilotService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Distribution id is required' });
  }

  try {
    const data = await pilotService.getDistributionById(id);
    if (!data) {
      return res.status(404).json({ success: false, error: 'Distribution not found' });
    }
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Pilot distribution detail error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
