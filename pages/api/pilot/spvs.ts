import type { NextApiRequest, NextApiResponse } from 'next';
import { pilotService } from '../../../server/services/pilot/PilotService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const data = await pilotService.getAllSpvs();
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      if (!id) {
        return res.status(400).json({ success: false, error: 'SPV id is required' });
      }
      const data = await pilotService.updateSpv(id, updates);
      if (!data) {
        return res.status(404).json({ success: false, error: 'SPV not found' });
      }
      return res.status(200).json({ success: true, data });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Pilot SPVs error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
